create or replace function public.import_nubank_statement_csv(p_sha256 text, p_filename text, p_size_bytes bigint, p_storage_path text, p_rows jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare u uuid := auth.uid(); institution uuid; account uuid; import_id uuid; item jsonb; signed numeric; raw_id uuid; tx_id uuid;
begin
  if u is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if exists (select 1 from public.imports where user_id = u and sha256 = p_sha256) then raise exception 'duplicate import' using errcode = '23505'; end if;
  select id into institution from public.institutions where code = 'NUBANK';
  select id into account from public.accounts where user_id = u and institution_id = institution and is_active order by created_at limit 1;
  if account is null then insert into public.accounts (user_id,institution_id,name,type,is_own) values (u,institution,'Conta Nubank','checking',true) returning id into account; end if;
  insert into public.imports (user_id,account_id,original_filename,storage_path,mime_type,size_bytes,sha256,detected_institution_id,source_kind,format,parser_name,parser_version,status,row_count,success_count) values (u,account,p_filename,p_storage_path,'text/csv',p_size_bytes,p_sha256,institution,'bank_statement','csv','nubank-statement-csv','1','processed',jsonb_array_length(p_rows),jsonb_array_length(p_rows)) returning id into import_id;
  for item in select * from jsonb_array_elements(p_rows) loop
    signed := (item->>'signedAmount')::numeric;
    insert into public.raw_records (user_id,import_id,source_row_number,external_id,raw_payload,record_hash,parse_status) values (u,import_id,(item->>'rowNumber')::integer,item->>'externalId',item,encode(extensions.digest(item::text,'sha256'),'hex'),'parsed') returning id into raw_id;
    insert into public.transactions (user_id,raw_record_id,import_id,account_id,external_id,occurred_on,competence_month,description_raw,description_normalized,amount,direction,nature,dedupe_key) values (u,raw_id,import_id,account,item->>'externalId',(item->>'occurredOn')::date,date_trunc('month',(item->>'occurredOn')::date)::date,item->>'descriptionRaw',lower(item->>'descriptionRaw'),abs(signed),(case when signed < 0 then 'outflow' else 'inflow' end)::public.transaction_direction,'unclassified'::public.economic_nature,'nubank-csv:'||(item->>'externalId')) returning id into tx_id;
    insert into public.allocations (user_id,transaction_id,owner_type,amount,source) values (u,tx_id,'self'::public.owner_type,abs(signed),'parser'::public.decision_source);
  end loop;
  return import_id;
end; $$;
