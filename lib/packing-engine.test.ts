import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generatePackList } from "./packing-engine";

describe("packing engine", () => {
  it("halves shirts when laundry is available", () => {
    const withWash = generatePackList({
      nights: 8,
      laundry: true,
      climate: "mild",
      needsRain: false,
      activities: [],
      mentionedMeds: false,
    });
    const noWash = generatePackList({
      nights: 8,
      laundry: false,
      climate: "mild",
      needsRain: false,
      activities: [],
      mentionedMeds: false,
    });
    const shirtsWash = withWash.find((i) => i.id === "clothes.shirts")?.quantity ?? 0;
    const shirtsDry = noWash.find((i) => i.id === "clothes.shirts")?.quantity ?? 0;
    assert.ok(shirtsWash < shirtsDry);
    assert.ok(withWash.length <= 22);
    assert.ok(noWash.length <= 22);
  });

  it("adds rain shell and swim gear only when needed", () => {
    const list = generatePackList({
      nights: 5,
      laundry: false,
      climate: "warm",
      needsRain: true,
      activities: ["hiking", "swimming"],
      mentionedMeds: true,
    });
    const ids = list.map((i) => i.id);
    assert.ok(ids.includes("clothes.rain"));
    assert.ok(ids.includes("activity.swimsuit"));
    assert.ok(ids.includes("activity.trail-shoes"));
    assert.ok(ids.includes("toiletries.meds"));
    assert.ok(list.length < 25);
  });

  it("stays lean for a short mild city break", () => {
    const list = generatePackList({
      nights: 2,
      laundry: false,
      climate: "mild",
      needsRain: false,
      activities: [],
      mentionedMeds: false,
    });
    assert.ok(list.length <= 14);
    assert.ok(!list.some((i) => i.id === "activity.swimsuit"));
    assert.equal(list.find((i) => i.id === "docs.id")?.label.includes("Passport"), true);
  });
});
