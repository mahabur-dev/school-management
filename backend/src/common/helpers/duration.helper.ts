const DURATION_PATTERN = /^(\d+)(s|m|h|d)$/i;

const UNIT_IN_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
};

/** "15m" -> 900. Accepts s, m, h, d suffixes or a positive integer of seconds. */
export function parseDurationToSeconds(value: string | number): number {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error('Duration must be a positive integer');
    }
    return value;
  }

  const match = DURATION_PATTERN.exec(value.trim());
  if (!match) {
    throw new Error(
      `Invalid duration "${value}". Use values such as 15m, 1h, or 7d.`,
    );
  }
  const seconds = Number(match[1]) * UNIT_IN_SECONDS[match[2].toLowerCase()];
  if (seconds <= 0) throw new Error('Duration must be greater than zero');
  return seconds;
}
