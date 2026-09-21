export type Money = bigint;

const DECIMAL_PATTERN = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/;

/** Converts a non-negative decimal amount to integer cents without floats. */
export function moneyFromDecimal(value: string): Money {
  const match = DECIMAL_PATTERN.exec(value);

  if (!match) {
    throw new Error(
      "Valor monetário deve ter até duas casas decimais e ser não negativo.",
    );
  }

  const cents = (match[2] ?? "").padEnd(2, "0");
  return BigInt(match[1]) * 100n + BigInt(cents);
}

export function moneyToDecimal(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const magnitude = value < 0n ? -value : value;
  return `${sign}${magnitude / 100n}.${(magnitude % 100n).toString().padStart(2, "0")}`;
}

export function sumMoney(values: readonly Money[]): Money {
  return values.reduce((total, value) => total + value, 0n);
}
