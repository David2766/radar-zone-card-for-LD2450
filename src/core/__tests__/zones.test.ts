import { describe, expect, it } from "vitest";
import { defaultZonePoints, isEmptyZone, limitZoneName, normalizeAdvancedZone, upsertZone } from "../zones";
import type { WebZone } from "../types";

describe("zones", () => {
  it("detects empty zones", () => {
    expect(isEmptyZone({ points: [[0, 0], [0, 0], [0, 0]] })).toBe(true);
    expect(isEmptyZone({ points: [[0, 0], [10, 0], [0, 10]] })).toBe(false);
  });

  it("limits names by user-visible characters", () => {
    expect(limitZoneName("책상앞오탐보정구역추가")).toBe("책상앞오탐보정구역추");
    expect(limitZoneName("  Zone Name  ")).toBe("Zone Name");
  });

  it("upserts zones in slot order and respects max count", () => {
    const zones: WebZone[] = [
      { id: "zone_3", name: "3", type: "detection", shape: "rect", points: defaultZonePoints(3) },
      { id: "zone_1", name: "1", type: "detection", shape: "rect", points: defaultZonePoints(1) }
    ];

    expect(upsertZone(zones, { id: "zone_2", name: "2", type: "filter", shape: "rect", points: defaultZonePoints(2) }).map((zone) => zone.id)).toEqual([
      "zone_1",
      "zone_2",
      "zone_3"
    ]);
  });

  it("normalizes advanced zone display data", () => {
    expect(
      normalizeAdvancedZone({
        id: "calibration_1",
        name: "Fan",
        type: "reduced",
        points: [[0, 100], [100, 100], [100, 200], [0, 200]]
      })
    ).toMatchObject({
      id: "calibration_1",
      name: "Fan",
      type: "reduced",
      calibration: true
    });
  });
});
