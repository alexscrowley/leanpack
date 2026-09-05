import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { processUtterance } from "./conversation";
import { emptyDraft } from "./types";

describe("conversation", () => {
  it("asks for laundry even when the rest is complete", () => {
    const turn = processUtterance(emptyDraft(), "Lisbon for five days, hiking and swimming");
    assert.equal(turn.readyToPack, false);
    assert.equal(turn.draft.destination, "Lisbon");
    assert.equal(turn.draft.nights, 5);
    assert.deepEqual(turn.draft.activities, ["hiking", "swimming"]);
    assert.equal(turn.draft.laundry, "unknown");
    assert.match(turn.reply, /washing machine|laundry/i);
  });

  it("packs when laundry is answered", () => {
    const first = processUtterance(emptyDraft(), "Kyoto for a week, I'll be hiking");
    const second = processUtterance(first.draft, "yes, hotel laundry");
    assert.equal(second.readyToPack, true);
    assert.equal(second.draft.laundry, "yes");
    assert.equal(second.draft.nights, 7);
  });

  it("accepts a one-shot trip with no laundry access", () => {
    const turn = processUtterance(
      emptyDraft(),
      "I'm going to Tokyo next week for meetings and I'll run in the mornings, no laundry",
    );
    assert.equal(turn.draft.destination, "Tokyo");
    assert.equal(turn.draft.laundry, "no");
    assert.ok(turn.draft.activities.includes("work"));
    assert.ok(turn.draft.activities.includes("running"));
    assert.equal(turn.readyToPack, true);
  });
});
