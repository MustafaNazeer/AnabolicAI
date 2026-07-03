const MAX_NAME = 200;
const SUFFIX = " copy";

export function copyRoutineName(name: string): string {
  const maxBase = MAX_NAME - SUFFIX.length;
  const base = name.length > maxBase ? name.slice(0, maxBase) : name;
  return `${base}${SUFFIX}`;
}
