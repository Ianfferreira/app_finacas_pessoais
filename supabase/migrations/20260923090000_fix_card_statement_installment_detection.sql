-- A JSONB null is a JSON value, not a SQL null. Card statement rows always
-- include the `installment` key, so only a JSON object represents a real
-- installment. This preserves ordinary purchases in the same statement.
create or replace function public.import_card_statement(
  p_sha256 text,
  p_filename text,
  p_mime_type text,
  p_size_bytes bigint,
  p_storage_path text,
  p_institution_code text,
  p_parser_name text,
  p_parser_version text,
  p_cycle_start date default null,
  p_cycle_end date default null,
  p_due_on date default null,
  p_card_last_fours jsonb default '[]'::jsonb,
  p_rows jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  u uuid := auth.uid();
  institution uuid;
  import_id uuid;
  item jsonb;
  statement_last_four text;
  card uuid;
  raw_id uuid;
  tx_id uuid;
  installment_group uuid;
  amount_value numeric(18, 2);
  item_kind text;
  item_card_last_four text;
  card_label text;
begin
  if u is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid sha256' using errcode = '22023';
  end if;
  if p_institution_code not in ('NUBANK', 'CAIXA', 'INTER', 'RICO_XP') then
    raise exception 'unsupported card institution' using errcode = '22023';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_typeof(p_card_last_fours) <> 'array' then
    raise exception 'card statement rows and cards must be arrays' using errcode = '22023';
  end if;
  if exists (select 1 from public.imports where user_id = u and sha256 = p_sha256) then
    raise exception 'duplicate import' using errcode = '23505';
  end if;

  select id into institution from public.institutions where code = p_institution_code;
  if institution is null then
    raise exception 'institution is not configured' using errcode = '23514';
  end if;

  insert into public.imports (
    user_id, original_filename, storage_path, mime_type, size_bytes, sha256,
    detected_institution_id, source_kind, format, period_start, period_end,
    parser_name, parser_version, status, row_count, success_count
  ) values (
    u, p_filename, p_storage_path, p_mime_type, p_size_bytes, p_sha256,
    institution, 'card_statement',
    (case when p_mime_type = 'text/csv' then 'csv' else 'pdf' end)::public.file_format,
    p_cycle_start, p_cycle_end, p_parser_name, p_parser_version,
    'processed', jsonb_array_length(p_rows), jsonb_array_length(p_rows)
  ) returning id into import_id;

  for statement_last_four in
    select distinct nullif(trim(value #>> '{}'), '')
    from jsonb_array_elements(p_card_last_fours)
  loop
    select c.id into card
    from public.cards as c
    where c.user_id = u
      and c.institution_id = institution
      and c.last_four is not distinct from statement_last_four
      and c.is_active
    order by created_at
    limit 1;

    if card is null then
      card_label := case
        when statement_last_four is null then 'Cartão ' || p_institution_code
        else 'Cartão ' || p_institution_code || ' •••• ' || statement_last_four
      end;
      insert into public.cards (user_id, institution_id, name, last_four, due_day)
      values (u, institution, card_label, statement_last_four, extract(day from p_due_on)::smallint)
      returning id into card;
    end if;

    insert into public.card_statements (
      user_id, import_id, card_id, cycle_start, cycle_end, due_on, status
    ) values (
      u, import_id, card, p_cycle_start, p_cycle_end, p_due_on, 'processed'
    );
  end loop;

  for item in select * from jsonb_array_elements(p_rows)
  loop
    amount_value := (item->>'amount')::numeric;
    item_kind := item->>'kind';
    item_card_last_four := nullif(item->>'cardLastFour', '');
    if amount_value < 0 or item_kind not in ('purchase', 'payment', 'reversal') then
      raise exception 'invalid card statement row' using errcode = '22023';
    end if;

    select c.id into card
    from public.cards as c
    where c.user_id = u
      and c.institution_id = institution
      and c.last_four is not distinct from item_card_last_four
      and c.is_active
    order by created_at
    limit 1;
    if card is null then
      raise exception 'card row has no matching statement card' using errcode = '23514';
    end if;

    insert into public.raw_records (
      user_id, import_id, source_row_number, raw_payload, raw_text,
      record_hash, parse_status
    ) values (
      u, import_id, (item->>'sourceRowNumber')::integer, item,
      item->>'descriptionRaw',
      encode(extensions.digest(p_sha256 || ':' || (item->>'sourceRowNumber'), 'sha256'), 'hex'),
      'parsed'
    ) returning id into raw_id;

    insert into public.transactions (
      user_id, raw_record_id, import_id, card_id, occurred_on,
      competence_month, description_raw, description_normalized, amount,
      direction, nature, nature_source, nature_confidence, review_status,
      dedupe_key
    ) values (
      u, raw_id, import_id, card, (item->>'occurredOn')::date,
      (item->>'competenceMonth')::date, item->>'descriptionRaw',
      lower(regexp_replace(trim(item->>'descriptionRaw'), '\\s+', ' ', 'g')),
      amount_value,
      case item_kind when 'purchase' then 'outflow'::public.transaction_direction
        when 'reversal' then 'inflow'::public.transaction_direction
        else 'neutral'::public.transaction_direction end,
      case item_kind when 'purchase' then 'expense'::public.economic_nature
        when 'reversal' then 'reversal'::public.economic_nature
        else 'card_payment'::public.economic_nature end,
      'parser'::public.decision_source, 1,
      case when item_kind = 'purchase' then 'pending'::public.review_status
        else 'not_required'::public.review_status end,
      'card-statement:' || p_sha256 || ':' || (item->>'sourceRowNumber')
    ) returning id into tx_id;

    insert into public.allocations (user_id, transaction_id, owner_type, amount, source)
    values (u, tx_id, 'self'::public.owner_type, amount_value, 'parser'::public.decision_source);

    if item_kind = 'purchase' and jsonb_typeof(item->'installment') = 'object' then
      if nullif(item->>'sourceGroupKey', '') is null then
        raise exception 'installment row requires source group key' using errcode = '22023';
      end if;
      insert into public.installment_groups (
        user_id, card_id, source_group_key, description, purchase_date,
        original_amount, total_installments, source_confidence
      ) values (
        u, card, item->>'sourceGroupKey', item->>'descriptionRaw',
        nullif(item->>'purchaseDate', '')::date,
        amount_value * ((item->'installment'->>'total')::smallint),
        (item->'installment'->>'total')::smallint, 1
      ) on conflict (user_id, source_group_key) do update
        set updated_at = now()
      returning id into installment_group;

      insert into public.installments (
        user_id, installment_group_id, transaction_id, installment_number,
        competence_month, amount, status
      ) values (
        u, installment_group, tx_id,
        (item->'installment'->>'number')::smallint,
        (item->>'competenceMonth')::date, amount_value, 'realized'
      ) on conflict (user_id, installment_group_id, installment_number)
        do update set transaction_id = excluded.transaction_id,
                      competence_month = excluded.competence_month,
                      amount = excluded.amount,
                      status = 'realized',
                      updated_at = now();

      insert into public.installments (
        user_id, installment_group_id, installment_number, competence_month, amount, status
      )
      select
        u, installment_group, sequence_number,
        ((item->>'competenceMonth')::date + (sequence_number - (item->'installment'->>'number')::smallint) * interval '1 month')::date,
        amount_value, 'scheduled'::public.installment_status
      from generate_series(
        ((item->'installment'->>'number')::smallint) + 1,
        (item->'installment'->>'total')::smallint
      ) as sequence_number
      on conflict (user_id, installment_group_id, installment_number) do nothing;
    end if;
  end loop;

  return import_id;
end;
$$;

revoke all on function public.import_card_statement(
  text, text, text, bigint, text, text, text, text, date, date, date, jsonb, jsonb
) from public;
grant execute on function public.import_card_statement(
  text, text, text, bigint, text, text, text, text, date, date, date, jsonb, jsonb
) to authenticated;
