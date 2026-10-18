const MINOR_SCALE = 100n;

/** Converts a human-entered decimal amount to an exact minor-unit string. */
export function toMinorUnits(value: string): string {
  const normalized = value.trim().replaceAll(',', '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized))
    throw new Error('Enter a valid amount with no more than two decimal places');
  const [whole, fraction = ''] = normalized.split('.');
  const minor = BigInt(whole) * MINOR_SCALE + BigInt(fraction.padEnd(2, '0'));
  if (minor <= 0n) throw new Error('Amount must be greater than zero');
  return minor.toString();
}

export function formatMinorUnits(
  value: bigint | string,
  currency = 'BDT',
): string {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value) / Number(MINOR_SCALE));
}
