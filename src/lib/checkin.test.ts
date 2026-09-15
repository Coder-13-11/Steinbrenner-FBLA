import { describe, it, expect } from 'vitest';
import { checkinWindowOpen, makeCheckinCode, checkinUrl } from './checkin';
import { normalizePhrase, phraseMatches } from './phrase';
import { toCsv } from './csv';

describe('checkinWindowOpen', () => {
  const start = Date.UTC(2026, 8, 18, 19, 30);
  const ev = { checkinEnabled: true, checkinCode: 'ABC234', startAt: start };
  it('opens 30 minutes before start', () => {
    expect(checkinWindowOpen(ev, start - 31 * 60_000)).toBe(false);
    expect(checkinWindowOpen(ev, start - 29 * 60_000)).toBe(true);
  });
  it('closes 2 hours after start', () => {
    expect(checkinWindowOpen(ev, start + 119 * 60_000)).toBe(true);
    expect(checkinWindowOpen(ev, start + 121 * 60_000)).toBe(false);
  });
  it('requires an enabled code', () => {
    expect(checkinWindowOpen({ ...ev, checkinEnabled: false }, start)).toBe(false);
    expect(checkinWindowOpen({ ...ev, checkinCode: '' }, start)).toBe(false);
  });
});

describe('makeCheckinCode', () => {
  it('is 6 unambiguous chars', () => {
    for (let i = 0; i < 50; i++) expect(makeCheckinCode()).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  });
});

describe('checkinUrl', () => {
  it('falls back to the production origin', () => {
    expect(checkinUrl('AB12CD', '')).toBe('https://steinbrennerfbla.com/memberhub/checkin?code=AB12CD');
  });
});

describe('phrase', () => {
  it('ignores case, spacing and curly quotes', () => {
    expect(normalizePhrase('  Make  PRANAV an’adviser ')).toBe("make pranav an'adviser");
    expect(phraseMatches('make pranav an adviser', 'Make Pranav an adviser')).toBe(true);
    expect(phraseMatches('make pranav an officer', 'Make Pranav an adviser')).toBe(false);
  });
});

describe('toCsv', () => {
  it('quotes commas and quotes', () => {
    expect(toCsv([['a', 'b,c', 'd"e']])).toBe('a,"b,c","d""e"');
  });
});
