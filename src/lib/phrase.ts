/** Normalize a typed confirmation phrase: case, curly quotes, and whitespace-insensitive. */
export function normalizePhrase(s: string | null | undefined): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function phraseMatches(typed: string, expected: string): boolean {
  return normalizePhrase(typed) === normalizePhrase(expected);
}
