import {
  MAX_INSIGHTS,
  MAX_INSIGHT_CHARS,
  type DashboardInsights,
} from "@/lib/ai/insights/schema";

export function validateInsights(raw: unknown): DashboardInsights | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.insights)) return null;
  if (o.insights.length < 1 || o.insights.length > MAX_INSIGHTS) return null;
  const insights: string[] = [];
  for (const item of o.insights) {
    if (typeof item !== "string") return null;
    const text = item.trim();
    if (text.length < 1 || text.length > MAX_INSIGHT_CHARS) return null;
    insights.push(text);
  }
  return { insights };
}
