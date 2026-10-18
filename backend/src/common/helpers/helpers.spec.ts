import { PASSWORD_PATTERN } from '../../modules/auth/dto/password-validation.constants';
import { parseDurationToSeconds } from './duration.helper';
import { getPagination, toPaginated } from './pagination.helper';
import { generateTempPassword } from './temp-password.helper';
import {
  generateNumericCode,
  generateOpaqueToken,
  hashToken,
} from './token.helper';

describe('parseDurationToSeconds', () => {
  it.each([
    ['30s', 30],
    ['15m', 900],
    ['2h', 7200],
    ['7d', 604800],
  ])('parses %s', (input, expected) => {
    expect(parseDurationToSeconds(input)).toBe(expected);
  });

  it('accepts positive integer seconds', () => {
    expect(parseDurationToSeconds(60)).toBe(60);
  });

  it.each(['abc', '15', '-5m', '0m', ''])('rejects %p', (input) => {
    expect(() => parseDurationToSeconds(input)).toThrow();
  });
});

describe('getPagination', () => {
  it('defaults to page 1 and 20 per page', () => {
    expect(getPagination()).toMatchObject({
      page: 1,
      limit: 20,
      skip: 0,
      take: 20,
    });
  });

  it('clamps untrusted values', () => {
    expect(getPagination(-4, 100000)).toMatchObject({ page: 1, limit: 100 });
    expect(getPagination(Number.NaN, 0)).toMatchObject({ page: 1, limit: 20 });
  });

  it('computes skip from page and limit', () => {
    expect(getPagination(3, 10)).toMatchObject({ skip: 20, take: 10 });
  });

  it('builds paginated meta', () => {
    const result = toPaginated(['a'], 41, { page: 2, limit: 20 });
    expect(result.meta).toEqual({
      total: 41,
      page: 2,
      limit: 20,
      totalPages: 3,
    });
  });
});

describe('token helpers', () => {
  it('generates six digit codes', () => {
    for (let i = 0; i < 50; i++)
      expect(generateNumericCode()).toMatch(/^\d{6}$/);
  });

  it('generates long unique opaque tokens', () => {
    const a = generateOpaqueToken();
    expect(a.length).toBeGreaterThanOrEqual(64);
    expect(a).not.toBe(generateOpaqueToken());
  });

  it('hashes deterministically without revealing the token', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
    expect(hashToken('abc')).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('generateTempPassword', () => {
  it('always satisfies the password policy', () => {
    for (let i = 0; i < 100; i++) {
      const password = generateTempPassword();
      expect(password).toHaveLength(14);
      expect(password).toMatch(PASSWORD_PATTERN);
    }
  });
});
