export type SlopeFit = {
  slope: number;
  standardError: number;
  df: number;
};

export type Interval = { low: number; high: number };

/**
 * Least squares slope of `values` against their own indices, with the residual
 * standard error of that slope.
 *
 * Returns null when there is nothing to fit: fewer than two points, or a
 * degenerate index axis. Two points fit a line exactly, so the standard error
 * is zero and there are no degrees of freedom left to estimate it with.
 */
export function fitSlope(values: number[]): SlopeFit | null {
  const n = values.length;
  if (n < 2) return null;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (values[i] - meanY);
    den += (i - meanX) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;
  const intercept = meanY - slope * meanX;
  let sse = 0;
  for (let i = 0; i < n; i++) {
    sse += (values[i] - (intercept + slope * i)) ** 2;
  }
  const df = n - 2;
  if (df <= 0 || sse === 0) return { slope, standardError: 0, df };
  return { slope, standardError: Math.sqrt(sse / df / den), df };
}

/**
 * Two sided critical value of Student's t.
 *
 * Deliberately partial: df of 1 or 2 only, which is all a four session window
 * can ever produce. Three points give 1, four give 2, and two fit exactly so
 * they need no critical value at all. Both cases have elementary closed forms,
 * so this needs neither a table nor a numerical inversion.
 *
 *   df 1 is Cauchy. Its CDF is 0.5 + atan(t) / PI, so the two sided tail is
 *   1 - 2 * atan(t) / PI. Setting that equal to alpha gives
 *   t = tan(PI * (1 - alpha) / 2).
 *
 *   df 2 has the closed form tail 1 - t / sqrt(2 + t * t). Setting that equal
 *   to alpha and solving gives t = sqrt(2c^2 / (1 - c^2)) with c = 1 - alpha.
 *
 * Any other df throws, so widening the window later fails loudly here instead
 * of silently returning a number for the wrong distribution.
 */
export function criticalT(df: number, alpha: number): number {
  if (df === 1) return Math.tan((Math.PI * (1 - alpha)) / 2);
  if (df === 2) {
    const c = 1 - alpha;
    return Math.sqrt((2 * c * c) / (1 - c * c));
  }
  throw new Error(`criticalT supports df 1 and 2, received ${df}`);
}

/**
 * The confidence interval on the slope at the given level. A fit with no
 * residual error collapses to a point, which is the correct answer rather than
 * a special case: two points, or a perfectly linear series, leave nothing to
 * be uncertain about in the fit itself.
 */
export function slopeInterval(fit: SlopeFit, alpha: number): Interval {
  if (fit.standardError === 0) return { low: fit.slope, high: fit.slope };
  const margin = criticalT(fit.df, alpha) * fit.standardError;
  return { low: fit.slope - margin, high: fit.slope + margin };
}
