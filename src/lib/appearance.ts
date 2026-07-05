export const MODES = ["system", "light", "dark"] as const;
export type Mode = (typeof MODES)[number];
export const DEFAULT_MODE: Mode = "system";

export function resolveMode(value: string | null | undefined): Mode {
  return (MODES as readonly string[]).includes(value ?? "")
    ? (value as Mode)
    : DEFAULT_MODE;
}

export type Appearance = "light" | "dark";

export function resolveAppearance(mode: Mode, prefersDark: boolean): Appearance {
  if (mode === "system") return prefersDark ? "dark" : "light";
  return mode;
}
