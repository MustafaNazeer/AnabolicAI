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
  audits: Record<
    string,
    { title: string; score: number | null; numericValue?: number }
  >;
};

// Metrics recorded in their own units alongside the scores.
//
// The performance score swings by roughly ten points run to run, because total
// blocking time is CPU bound, so it cannot tell a real improvement from noise.
// The underlying milliseconds can. Largest contentful paint rides along as the
// control: it stayed near 1.07 seconds on every route, which is what shows the
// gap is script execution rather than load time.
export const TRACKED_METRICS = [
  "total-blocking-time",
  "largest-contentful-paint",
] as const;

export type MetricStat = { median: number; min: number; max: number };

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
  metrics: Record<string, MetricStat>;
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

  const metrics: Record<string, MetricStat> = {};
  for (const id of TRACKED_METRICS) {
    const values = lhrs
      .map((l) => l.audits[id]?.numericValue)
      .filter((v): v is number => typeof v === "number")
      .map((v) => Math.round(v));
    // A metric no run reported is omitted rather than recorded as zero, which
    // would read as a perfect result.
    if (values.length === 0) continue;
    metrics[id] = {
      median: median(values),
      min: Math.min(...values),
      max: Math.max(...values),
    };
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
    metrics,
    failingAudits,
    // Read from the result rather than hardcoded, so the record always states
    // what actually ran.
    lighthouseVersion: representative.lighthouseVersion,
    formFactor: representative.configSettings.formFactor,
  };
}
