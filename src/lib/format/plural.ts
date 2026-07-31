// Reads a count with its noun, so a routine with one set does not say "1 sets".
// The plural argument exists for an irregular noun; the default covers "set".
export function pluralize(
  count: number,
  singular: string,
  plural: string = `${singular}s`,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
