// Reduces raw Lighthouse results for one route to the numbers worth recording.
// Pure on purpose: no browser, no filesystem, no network, so it can be tested
// without measuring anything.

// Only the fields actually read. Lighthouse's own result type is far wider, and
// depending on all of it would make this module fragile across versions.
export type MinimalLhr = {
  lighthouseVersion: string;
  configSettings: { formFactor: string };
  categories: Record<
    string,
    { score: number | null; auditRefs: { id: string; weight: number }[] }
  >;
  audits: Record<string, { title: string; score: number | null }>;
};

export type CategoryScores = Record<string, number>;

export type FailingAudit = {
  id: string;
  title: string;
  score: number;
  weight: number;
};

export type RouteSummary = {
  label: string;
  path: string;
  runs: number;
  scores: CategoryScores;
  spread: Record<string, number>;
  failingAudits: FailingAudit[];
  lighthouseVersion: string;
  formFactor: string;
};

export function median(values: number[]): number {
  // Copy before sorting: sort mutates, and the caller's array is not ours.
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function summarizeRoute(
  label: string,
  path: string,
  lhrs: MinimalLhr[],
): RouteSummary {
  if (lhrs.length === 0) {
    throw new Error(
      `No Lighthouse results for ${path}. Refusing to summarize nothing.`,
    );
  }

  const categoryIds = Object.keys(lhrs[0].categories);
  const scores: CategoryScores = {};
  const spread: Record<string, number> = {};

  for (const id of categoryIds) {
    // A category Lighthouse could not score comes back null. Treat it as
    // absent rather than as a zero, which would be a lie.
    const raw = lhrs
      .map((l) => l.categories[id]?.score)
      .filter((s): s is number => typeof s === "number")
      .map((s) => Math.round(s * 100));
    if (raw.length === 0) continue;
    scores[id] = median(raw);
    spread[id] = Math.max(...raw) - Math.min(...raw);
  }

  // Failing audits are read from the run whose performance score is closest to
  // the median, so the list describes the run whose number is being reported
  // rather than an arbitrary one.
  const perfScores = lhrs.map((l) =>
    Math.round((l.categories.performance?.score ?? 0) * 100),
  );
  const target = scores.performance ?? perfScores[0];
  let representative = lhrs[0];
  let closest = Infinity;
  for (let i = 0; i < lhrs.length; i++) {
    const distance = Math.abs(perfScores[i] - target);
    if (distance < closest) {
      closest = distance;
      representative = lhrs[i];
    }
  }

  const failingAudits: FailingAudit[] = [];
  for (const id of categoryIds) {
    for (const ref of representative.categories[id]?.auditRefs ?? []) {
      const audit = representative.audits[ref.id];
      if (!audit || typeof audit.score !== "number") continue;
      // A weightless audit costs no points, so it cannot be why a score is low.
      if (audit.score >= 1 || ref.weight === 0) continue;
      if (failingAudits.some((a) => a.id === ref.id)) continue;
      failingAudits.push({
        id: ref.id,
        title: audit.title,
        score: audit.score,
        weight: ref.weight,
      });
    }
  }
  // Costliest first: the order an optimization pass would work down.
  failingAudits.sort(
    (a, b) => (1 - b.score) * b.weight - (1 - a.score) * a.weight,
  );

  return {
    label,
    path,
    runs: lhrs.length,
    scores,
    spread,
    failingAudits,
    // Read from the result rather than hardcoded, so the record always states
    // what actually ran.
    lighthouseVersion: representative.lighthouseVersion,
    formFactor: representative.configSettings.formFactor,
  };
}
