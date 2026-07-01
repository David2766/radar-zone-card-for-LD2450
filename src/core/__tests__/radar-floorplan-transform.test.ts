import { describe, expect, it } from "vitest";
import {
  floorplanPolygonToRadarZonePoints,
  radarPointToFloorplanPx,
  radarZoneToFloorplanPolygon
} from "../floorplan/radar-floorplan-transform";
import type { WebZone } from "../types";

const transform = {
  placement: {
    originX: 240,
    originY: 360,
    rotation: 37
  },
  scale: {
    mmPerPxX: 12.5,
    mmPerPxY: 15
  },
  scaleFactor: 1
};

describe("radar-floorplan-transform", () => {
  it("preserves polygon point order and point count when projecting zones", () => {
    const zone: WebZone = {
      id: "zone_1",
      name: "Polygon",
      type: "detection",
      shape: "polygon",
      points: [
        [-800, 700],
        [120, 620],
        [450, 1300],
        [0, 1800],
        [-650, 1550]
      ]
    };

    const projected = radarZoneToFloorplanPolygon(zone, transform);

    expect(projected).toHaveLength(zone.points.length);
    projected.forEach((point, index) => {
      expect(point).toEqual(radarPointToFloorplanPx(zone.points[index], transform));
    });
  });

  it("round-trips floorplan polygons back to radar points without collapsing to a bbox", () => {
    const zone: WebZone = {
      id: "zone_2",
      name: "L shape",
      type: "filter",
      shape: "polygon",
      points: [
        [-1000, 500],
        [-200, 500],
        [-200, 1000],
        [500, 1000],
        [500, 1700],
        [-1000, 1700]
      ]
    };

    const projected = radarZoneToFloorplanPolygon(zone, transform);
    const restored = floorplanPolygonToRadarZonePoints(projected, transform);

    expect(restored).toHaveLength(zone.points.length);
    restored.forEach(([x, y], index) => {
      expect(x).toBeCloseTo(zone.points[index][0], 6);
      expect(y).toBeCloseTo(zone.points[index][1], 6);
    });
  });
});

