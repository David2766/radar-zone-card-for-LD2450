import { describe, expect, it } from "vitest";
import { safeTargetColor } from "../radar-svg";

describe("radar-svg", () => {
  it("accepts hex target colors", () => {
    expect(safeTargetColor("#abc")).toBe("#abc");
    expect(safeTargetColor("#abcd")).toBe("#abcd");
    expect(safeTargetColor("#aabbcc")).toBe("#aabbcc");
    expect(safeTargetColor("#aabbccdd")).toBe("#aabbccdd");
  });

  it("rejects values that can escape the style declaration", () => {
    expect(safeTargetColor("red; opacity:1")).toBe("#ff6b7a");
    expect(safeTargetColor("url(javascript:alert(1))")).toBe("#ff6b7a");
    expect(safeTargetColor("</style><script>alert(1)</script>")).toBe("#ff6b7a");
  });
});
