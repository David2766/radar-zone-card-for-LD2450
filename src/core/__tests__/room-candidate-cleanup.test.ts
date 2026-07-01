import { describe, expect, it } from "vitest";
import { cleanupOrthogonalRoomCandidate } from "../floorplan/room-candidate-cleanup";
import type { RoomCandidate } from "../floorplan/floorplan-types";

function candidate(points: Array<[number, number]>): RoomCandidate {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    id: "room_1",
    name: "Room",
    kind: "unknown",
    confidence: 90,
    status: "candidate",
    shape: "polygon",
    points,
    rect: {
      x,
      y,
      width: Math.max(...xs) - x,
      height: Math.max(...ys) - y
    }
  };
}

describe("room candidate cleanup", () => {
  it("cleans small orthogonal drift without expanding the room", () => {
    const result = cleanupOrthogonalRoomCandidate(candidate([
      [10, 10],
      [110, 14],
      [108, 110],
      [12, 106]
    ]));

    expect(result.changed).toBe(true);
    expect(result.reason).toBe("cleaned");
    expect(result.candidate.points).toEqual([
      [12, 14],
      [108, 14],
      [108, 106],
      [12, 106]
    ]);
    expect(result.candidate.rect.width).toBeLessThanOrEqual(100);
    expect(result.candidate.rect.height).toBeLessThanOrEqual(100);
  });

  it("does not force clearly diagonal shapes into rectangles", () => {
    const result = cleanupOrthogonalRoomCandidate(candidate([
      [10, 10],
      [100, 40],
      [80, 120],
      [0, 90]
    ]));

    expect(result.changed).toBe(false);
  });
});
