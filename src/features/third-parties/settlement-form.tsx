"use client";

import { useMemo, useState } from "react";

type OpenEntry = {
  id: string;
  label: string;
  openAmount: number;
};

type SettlementFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  entries: OpenEntry[];
  personId: string;
  personName: string;
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function SettlementForm({
  action,
  entries,
  personId,
  personName,
}: SettlementFormProps) {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState("");
  const [occurredOn, setOccurredOn] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [note, setNote] = useState("");

  const allocations = useMemo(
    () =>
      entries
        .filter((entry) => selected[entry.id] !== undefined)
        .map((entry) => ({
          entryId: entry.id,
          amount: selected[entry.id] ?? "",
        })),
    [entries, selected],
  );
  const allocatedTotal = allocations.reduce(
    (sum, allocation) => sum + Number(allocation.amount),
    0,
  );
  const received = Number(amount);
  const hasExcess =
    Number.isFinite(received) && received > allocatedTotal + 0.000001;
  const totalsMatch =
    allocations.length > 0 &&
    Number.isFinite(received) &&
    received > 0 &&
    Math.abs(received - allocatedTotal) < 0.000001;

  function toggleEntry(entry: OpenEntry) {
    setSelected((current) => {
      const next = { ...current };
      if (next[entry.id] !== undefined) delete next[entry.id];
      else next[entry.id] = entry.openAmount.toFixed(2);
      return next;
    });
  }

  function setEntryAmount(entry: OpenEntry, value: string) {
    const numericValue = Number(value);
    const limitedValue =
      Number.isFinite(numericValue) && numericValue > entry.openAmount
        ? entry.openAmount.toFixed(2)
        : value;
    setSelected((current) => ({ ...current, [entry.id]: limitedValue }));
  }

  return (
    <form action={action} className="terra-settlement-form">
      <input name="personId" type="hidden" value={personId} />
      <input name="amount" type="hidden" value={amount} />
      <input name="occurredOn" type="hidden" value={occurredOn} />
      <input name="note" type="hidden" value={note} />
      <input
        name="allocations"
        type="hidden"
        value={JSON.stringify(allocations)}
      />
      <fieldset>
        <legend>Liquidar cobranças de {personName}</legend>
        <p className="muted">
          Selecione uma ou mais cobranças abertas e informe como o reembolso
          será distribuído.
        </p>
        <label>
          Valor recebido
          <input
            inputMode="decimal"
            min="0.01"
            onChange={(event) => setAmount(event.target.value)}
            step="0.01"
            type="number"
            value={amount}
          />
        </label>
        <label>
          Data do recebimento
          <input
            onChange={(event) => setOccurredOn(event.target.value)}
            type="date"
            value={occurredOn}
          />
        </label>
        <label>
          Observação
          <input
            onChange={(event) => setNote(event.target.value)}
            value={note}
          />
        </label>
      </fieldset>
      <ul className="terra-open-entry-list">
        {entries.map((entry) => {
          const checked = selected[entry.id] !== undefined;
          return (
            <li key={entry.id}>
              <label>
                <input
                  checked={checked}
                  onChange={() => toggleEntry(entry)}
                  type="checkbox"
                />
                <span>{entry.label}</span>
                <strong>Em aberto: {money.format(entry.openAmount)}</strong>
              </label>
              {checked ? (
                <label>
                  Valor para esta cobrança
                  <input
                    inputMode="decimal"
                    max={entry.openAmount.toFixed(2)}
                    min="0.01"
                    onChange={(event) =>
                      setEntryAmount(entry, event.target.value)
                    }
                    step="0.01"
                    type="number"
                    value={selected[entry.id]}
                  />
                </label>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div
        className={`terra-allocation-total${totalsMatch ? " is-valid" : ""}`}
      >
        <span>Alocado nas cobranças</span>
        <strong>{money.format(allocatedTotal || 0)}</strong>
        <span>de {money.format(received || 0)}</span>
      </div>
      {hasExcess ? (
        <p className="notice review-notice">
          Há excedente de {money.format(received - allocatedTotal)}. Ele não
          será baixado automaticamente: classifique-o explicitamente como
          crédito, receita, outro reembolso ou pendência antes de registrar esta
          liquidação.
        </p>
      ) : null}
      {!hasExcess && !totalsMatch ? (
        <p className="notice review-notice">
          A soma distribuída deve ser exatamente igual ao valor recebido.
        </p>
      ) : null}
      <button
        className="button primary"
        disabled={!totalsMatch || hasExcess}
        type="submit"
      >
        Registrar liquidação confirmada
      </button>
    </form>
  );
}
