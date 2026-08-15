import { describe, it, expect } from "vitest";
import { median, summarizeRoute } from "../summarize.mts";
import type { MinimalLhr } from "../summarize.mts";

function lhr(perf: number, a11y: number, tbt = 500, srt = 240): MinimalLhr {
  return {
    lighthouseVersion: "13.4.1",
    configSettings: { formFactor: "mobile" },
    categories: {
      performance: {
        score: perf,
        auditRefs: [
          { id: "largest-contentful-paint", weight: 25 },
          { id: "total-blocking-time", weight: 30 },
          { id: "unused-javascript", weight: 0 },
        ],
      },
      accessibility: {
        score: a11y,
        auditRefs: [{ id: "color-contrast", weight: 7 }],
      },
    },
    audits: {
      "largest-contentful-paint": {
        title: "Largest Contentful Paint",
        score: 0.4,
        numericValue: 1080,
      },
      "total-blocking-time": {
        title: "Total Blocking Time",
        score: 0.38,
        numericValue: tbt,
      },
      "server-response-time": {
        title: "Initial server response time was short",
        score: 1,
        numericValue: srt,
      },
      "unused-javascript": { title: "Reduce unused JavaScript", score: 0.2 },
      "color-contrast": { title: "Contrast is satisfactory", score: 1 },
    },
  };
}

describe("median", () => {
  it("returns the middle value of an odd length list", () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it("averages the two middle values of an even length list", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("does not mutate the caller's array", () => {
    const input = [3, 1, 2];
    median(input);
    expect(input).toEqual([3, 1, 2]);
  });
});

describe("summarizeRoute", () => {
  it("reports each category score as a median scaled to 0 to 100", () => {
    const s = summarizeRoute("dashboard", "/", [
      lhr(0.9, 1),
      lhr(0.94, 1),
      lhr(0.92, 1),
    ]);
    expect(s.scores.performance).toBe(92);
    expect(s.scores.accessibility).toBe(100);
  });

  it("records the spread between the best and worst run", () => {
    const s = summarizeRoute("dashboard", "/", [
      lhr(0.9, 1),
      lhr(0.94, 1),
      lhr(0.92, 1),
    ]);
    expect(s.spread.performance).toBe(4);
  });

  it("reports a zero spread when every run agrees", () => {
    const s = summarizeRoute("dashboard", "/", [lhr(0.9, 1), lhr(0.9, 1)]);
    expect(s.spread.performance).toBe(0);
  });

  it("carries the run count, label and path through", () => {
    const s = summarizeRoute("progress", "/progress", [
      lhr(0.9, 1),
      lhr(0.9, 1),
    ]);
    expect(s.runs).toBe(2);
    expect(s.label).toBe("progress");
    expect(s.path).toBe("/progress");
  });

  it("reads the version and form factor from the result rather than being told", () => {
    const s = summarizeRoute("dashboard", "/", [lhr(0.9, 1)]);
    expect(s.lighthouseVersion).toBe("13.4.1");
    expect(s.formFactor).toBe("mobile");
  });

  it("lists failing audits ordered by the points they cost", () => {
    const s = summarizeRoute("dashboard", "/", [lhr(0.9, 1)]);
    // Ordered by cost, not by the order they are declared in. Blocking time
    // scores 0.38 at weight 30, costing 18.6, so it outranks the paint audit
    // at 0.4 and weight 25, costing 15, even though the paint audit is listed
    // first in auditRefs.
    expect(s.failingAudits.map((a) => a.id)).toEqual([
      "total-blocking-time",
      "largest-contentful-paint",
    ]);
  });

  it("omits passing audits and zero weight audits from the failing list", () => {
    const s = summarizeRoute("dashboard", "/", [lhr(0.9, 1)]);
    const ids = s.failingAudits.map((a) => a.id);
    expect(ids).not.toContain("color-contrast");
    expect(ids).not.toContain("unused-javascript");
  });

  it("throws on an empty result list rather than reporting a score of zero", () => {
    expect(() => summarizeRoute("dashboard", "/", [])).toThrow(
      /no lighthouse results/i,
    );
  });
});

// The performance score swings by roughly ten points run to run, because total
// blocking time is CPU bound. Tracking the metric in milliseconds gives an
// optimization pass a signal that survives that noise, where the score does not.
describe("summarizeRoute metrics", () => {
  it("records the median, lowest and highest total blocking time in milliseconds", () => {
    const s = summarizeRoute("progress", "/progress", [
      lhr(0.7, 1, 1449),
      lhr(0.7, 1, 582),
      lhr(0.7, 1, 1176),
    ]);
    expect(s.metrics["total-blocking-time"]).toEqual({
      median: 1176,
      min: 582,
      max: 1449,
    });
  });

  it("tracks largest contentful paint alongside it", () => {
    const s = summarizeRoute("progress", "/progress", [lhr(0.7, 1, 900)]);
    expect(s.metrics["largest-contentful-paint"].median).toBe(1080);
  });

  // Time to first byte of the main document, read from the observed trace
  // rather than from the simulation, so it measures the server rather than the
  // CPU throttling the mobile preset applies. It is the only number that can
  // show what an identity check costs before anything renders.
  it("tracks server response time, which is what a per request auth check moves", () => {
    const s = summarizeRoute("dashboard", "/", [
      lhr(0.9, 1, 500, 310),
      lhr(0.9, 1, 500, 188),
      lhr(0.9, 1, 500, 244),
    ]);
    expect(s.metrics["server-response-time"]).toEqual({
      median: 244,
      min: 188,
      max: 310,
    });
  });

  it("omits a metric no run reported rather than recording it as zero", () => {
    const bare = lhr(0.7, 1, 900);
    delete bare.audits["total-blocking-time"].numericValue;
    const s = summarizeRoute("progress", "/progress", [bare]);
    expect(s.metrics["total-blocking-time"]).toBeUndefined();
    // The other tracked metric is unaffected.
    expect(s.metrics["largest-contentful-paint"].median).toBe(1080);
  });
});
