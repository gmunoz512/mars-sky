import { describe, expect, it } from "vitest";
import { canvasLayoutSize } from "./renderer";

describe("canvasLayoutSize", () => {
  it("keeps CSS at the host size so a 3× phone does not overflow the viewport", () => {
    const s = canvasLayoutSize(390, 844, 3);
    expect(s.cssW).toBe(390);
    expect(s.cssH).toBe(844);
    expect(s.bufferW).toBe(1170);
    expect(s.bufferH).toBe(2532);
    expect(s.cssW).toBeLessThan(s.bufferW);
  });
});
