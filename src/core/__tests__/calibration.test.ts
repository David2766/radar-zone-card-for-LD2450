import { describe, expect, it } from "vitest";
import { calibrationMetrics, calibrationZoneFromSamples } from "../calibration";
import type { CalibrationSample } from "../calibration";

function clusteredSamples(count = 24): CalibrationSample[] {
  return Array.from({ length: count }, (_, index) => ({
    x: 1000 + (index % 4) * 20,
    y: 2000 + Math.floor(index / 4) * 18,
    speed: index === 0 ? 0 : 25
  }));
}

describe("calibration", () => {
  it("accepts stable repeated samples", () => {
    const metrics = calibrationMetrics(clusteredSamples());

    expect(metrics.samples).toBe(24);
    expect(metrics.acceptedBy).not.toBe("none");
    expect(metrics.score).toBeGreaterThan(80);
  });

  it("rejects broad unstable samples", () => {
    const samples = Array.from({ length: 24 }, (_, index) => ({
      x: -4000 + index * 350,
      y: 500 + index * 280,
      speed: 450
    }));

    expect(calibrationMetrics(samples).acceptedBy).toBe("none");
  });

  it("creates a filter calibration rectangle from accepted samples", () => {
    const zone = calibrationZoneFromSamples(clusteredSamples(), []);

    expect(zone).toMatchObject({
      id: "calibration_1",
      type: "filter",
      shape: "rect"
    });
    expect(zone?.points).toHaveLength(4);
  });
});
