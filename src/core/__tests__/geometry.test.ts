import { describe, expect, it } from "vitest";
import { boundsFromPoints, clampPointsToBounds, pointInPolygon, rectPoints } from "../geometry";

describe("geometry", () => {
  it("builds normalized rectangle points", () => {
    expect(rectPoints(100, 300, -100, 100)).toEqual([
      [-100, 100],
      [100, 100],
      [100, 300],
      [-100, 300]
    ]);
  });

  it("calculates bounds from points", () => {
    expect(boundsFromPoints([
      [-50, 100],
      [200, 150],
      [25, 450]
    ])).toEqual({
      minX: -50,
      maxX: 200,
      minY: 100,
      maxY: 450,
      width: 250,
      height: 350
    });
  });

  it("keeps a zone inside LD2450 writable bounds", () => {
    expect(clampPointsToBounds(rectPoints(4300, -200, 5600, 700))).toEqual([
      [3560, 0],
      [4860, 0],
      [4860, 900],
      [3560, 900]
    ]);
  });

  it("detects points inside polygons", () => {
    const polygon = rectPoints(-100, 900, 100, 1100);

    expect(pointInPolygon({ x: 0, y: 1000 }, polygon)).toBe(true);
    expect(pointInPolygon({ x: 500, y: 1000 }, polygon)).toBe(false);
  });
});
