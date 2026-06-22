export const THEMES = ["cobalt", "magenta", "emerald", "crimson", "rose"] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = "cobalt";

export function resolveTheme(value: string | null | undefined): Theme {
  return (THEMES as readonly string[]).includes(value ?? "")
    ? (value as Theme)
    : DEFAULT_THEME;
}
