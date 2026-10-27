import { describe, it, expect } from "vitest";
import { rankSponsors } from "@/components/social";

describe("leaderboard", () => {
  it("ranks sponsors by total amount paid, highest first", () => {
    const r = rankSponsors([
      { name: "A", handle: "a", total: 100, bills: 9 },
      { name: "B", handle: "b", total: 500, bills: 1 },
      { name: "C", handle: "c", total: 300, bills: 5 },
    ]);
    expect(r.map((s) => s.handle)).toEqual(["b", "c", "a"]);
  });
});
