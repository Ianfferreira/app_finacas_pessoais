"use client";

import { useMemo, useState } from "react";

type Person = { id: string; full_name: string };
type Mode = "amount" | "percentage";

type AllocationDraft = {
  id: string;
  ownerType: "self" | "third_party";
  personId?: string;
  value: string;
};

type OwnershipFormProps = {
  people: Person[];
  transactionAmount: number;
  transactionId: string;
  initialAllocations?: Array<{
    ownerType: "self" | "third_party";
    personId?: string;
    amount: number;
    percentage: number | null;
  }>;
  returnTo?: "/movements" | "/review";
  action: (formData: FormData) => void | Promise<void>;
};

const decimalPattern = /^\d+(?:\.\d{1,6})?$/;

function decimal(value: string) {
  return decimalPattern.test(value) ? Number(value) : Number.NaN;
}

function decimalLabel(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function OwnershipForm({
  action,
  people,
  transactionAmount,
  transactionId,
  initialAllocations,
  returnTo = "/review",
}: OwnershipFormProps) {
  const existingMode: Mode =
    initialAllocations?.length &&
    initialAllocations.every((allocation) => allocation.percentage !== null)
      ? "percentage"
      : "amount";
  const [mode, setMode] = useState<Mode>(existingMode);
  const [allocations, setAllocations] = useState<AllocationDraft[]>(
    initialAllocations?.length
      ? initialAllocations.map((allocation, index) => ({
          id: `${allocation.ownerType}-${allocation.personId ?? "self"}-${index}`,
          ownerType: allocation.ownerType,
          ...(allocation.personId ? { personId: allocation.personId } : {}),
          value:
            existingMode === "amount"
              ? allocation.amount.toFixed(2)
              : String(allocation.percentage),
        }))
      : [
          {
            id: "self",
            ownerType: "self",
            value: transactionAmount.toFixed(2),
          },
        ],
  );

  const total = useMemo(
    () =>
      allocations.reduce(
        (sum, allocation) => sum + decimal(allocation.value),
        0,
      ),
    [allocations],
  );
  const expected = mode === "amount" ? transactionAmount : 100;
  const validTotal =
    Number.isFinite(total) && Math.abs(total - expected) < 0.000001;
  const personIds = allocations
    .filter((allocation) => allocation.ownerType === "third_party")
    .map((allocation) => allocation.personId)
    .filter((personId): personId is string => Boolean(personId));
  const validPeople = personIds.length === new Set(personIds).size;
  const validRows = allocations.every(
    (allocation) =>
      Number.isFinite(decimal(allocation.value)) &&
      decimal(allocation.value) > 0 &&
      (allocation.ownerType === "self" || Boolean(allocation.personId)),
  );
  const isValid = validRows && validPeople && validTotal;

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setAllocations((current) =>
      current.map((allocation) => ({
        ...allocation,
        value:
          nextMode === "amount"
            ? allocation.ownerType === "self"
              ? transactionAmount.toFixed(2)
              : "0.00"
            : allocation.ownerType === "self"
              ? "100"
              : "0",
      })),
    );
  }

  function addPerson() {
    const available = people.find((person) => !personIds.includes(person.id));
    if (!available) return;
    setAllocations((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        ownerType: "third_party",
        personId: available.id,
        value: mode === "amount" ? "0.00" : "0",
      },
    ]);
  }

  function removeAllocation(id: string) {
    setAllocations((current) =>
      current.filter((allocation) => allocation.id !== id),
    );
  }

  function updateAllocation(id: string, update: Partial<AllocationDraft>) {
    setAllocations((current) =>
      current.map((allocation) =>
        allocation.id === id ? { ...allocation, ...update } : allocation,
      ),
    );
  }

  const totalLabel =
    mode === "amount" ? decimalLabel(total || 0) : `${total || 0}%`;
  const expectedLabel =
    mode === "amount" ? decimalLabel(transactionAmount) : "100%";

  return (
    <form action={action} className="terra-ownership-form">
      <input name="transactionId" type="hidden" value={transactionId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <input name="mode" type="hidden" value={mode} />
      <input
        name="allocations"
        type="hidden"
        value={JSON.stringify(
          allocations.map((allocation) =>
            mode === "amount"
              ? {
                  ownerType: allocation.ownerType,
                  ...(allocation.personId
                    ? { personId: allocation.personId }
                    : {}),
                  amount: allocation.value,
                }
              : {
                  ownerType: allocation.ownerType,
                  ...(allocation.personId
                    ? { personId: allocation.personId }
                    : {}),
                  percentage: allocation.value,
                },
          ),
        )}
      />

      <fieldset>
        <legend>Como dividir esta movimentação?</legend>
        <div className="terra-choice-row">
          <button
            aria-pressed={
              allocations.length === 1 && allocations[0]?.ownerType === "self"
            }
            className="button secondary"
            onClick={() => {
              setMode("amount");
              setAllocations([
                {
                  id: "self",
                  ownerType: "self",
                  value: transactionAmount.toFixed(2),
                },
              ]);
            }}
            type="button"
          >
            100% minha
          </button>
          <button
            className="button secondary"
            onClick={() => {
              if (!people[0]) return;
              setMode("amount");
              setAllocations([
                {
                  id: "person",
                  ownerType: "third_party",
                  personId: people[0].id,
                  value: transactionAmount.toFixed(2),
                },
              ]);
            }}
            type="button"
          >
            Outra pessoa
          </button>
          <button
            className="button secondary"
            onClick={() => {
              if (!people[0]) return;
              setMode("amount");
              setAllocations([
                {
                  id: "self",
                  ownerType: "self",
                  value: (transactionAmount / 2).toFixed(2),
                },
                {
                  id: "person",
                  ownerType: "third_party",
                  personId: people[0].id,
                  value: (transactionAmount - transactionAmount / 2).toFixed(2),
                },
              ]);
            }}
            type="button"
          >
            Dividir
          </button>
        </div>
        <div
          className="terra-segmented-control"
          role="group"
          aria-label="Modo de rateio"
        >
          <button
            aria-pressed={mode === "amount"}
            onClick={() => changeMode("amount")}
            type="button"
          >
            Valores em R$
          </button>
          <button
            aria-pressed={mode === "percentage"}
            onClick={() => changeMode("percentage")}
            type="button"
          >
            Percentuais
          </button>
        </div>
      </fieldset>

      <div className="terra-allocation-list">
        {allocations.map((allocation) => (
          <div className="terra-allocation-row" key={allocation.id}>
            {allocation.ownerType === "self" ? (
              <span>Minha parte</span>
            ) : (
              <label>
                Pessoa
                <select
                  onChange={(event) =>
                    updateAllocation(allocation.id, {
                      personId: event.target.value,
                    })
                  }
                  value={allocation.personId}
                >
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.full_name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              {mode === "amount" ? "Valor" : "Percentual"}
              <input
                inputMode="decimal"
                min="0"
                onChange={(event) =>
                  updateAllocation(allocation.id, { value: event.target.value })
                }
                step={mode === "amount" ? "0.01" : "0.000001"}
                type="number"
                value={allocation.value}
              />
            </label>
            {allocation.ownerType === "third_party" ? (
              <button
                aria-label="Remover pessoa do rateio"
                className="terra-icon-button"
                onClick={() => removeAllocation(allocation.id)}
                type="button"
              >
                ×
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <div className={`terra-allocation-total${isValid ? " is-valid" : ""}`}>
        <span>Total informado</span>
        <strong>{totalLabel}</strong>
        <span>de {expectedLabel}</span>
      </div>
      {!validPeople ? (
        <p className="notice error">
          Cada pessoa pode aparecer apenas uma vez.
        </p>
      ) : null}
      {!isValid ? (
        <p className="notice review-notice">
          A soma precisa fechar exatamente em {expectedLabel} antes de salvar.
        </p>
      ) : null}
      <div className="terra-choice-row">
        <button
          className="button secondary"
          disabled={!people.length || people.length === personIds.length}
          onClick={addPerson}
          type="button"
        >
          Adicionar pessoa
        </button>
        <button className="button primary" disabled={!isValid} type="submit">
          Salvar titularidade
        </button>
      </div>
    </form>
  );
}
