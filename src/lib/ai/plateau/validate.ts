import {
  MAX_SUGGESTION_CHARS,
  SUGGESTION_KINDS,
  type PlateauSuggestion,
  type SuggestionKind,
} from "@/lib/ai/plateau/schema";

export function validateSuggestion(raw: unknown): PlateauSuggestion | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.kind !== "string") return null;
  if (!(SUGGESTION_KINDS as readonly string[]).includes(o.kind)) return null;
  if (typeof o.text !== "string") return null;
  const text = o.text.trim();
  if (text.length < 1 || text.length > MAX_SUGGESTION_CHARS) return null;
  return { kind: o.kind as SuggestionKind, text };
}
