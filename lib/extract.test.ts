import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractDestination } from "./extract";

describe("extractDestination", () => {
  it("accepts a bare city name", () => {
    assert.equal(extractDestination("Lisbon"), "Lisbon");
    assert.equal(extractDestination("Tokyo"), "Tokyo");
    assert.equal(extractDestination("New York"), "New York");
  });

  it("accepts aliases and patterned trip language", () => {
    assert.equal(extractDestination("nyc"), "New York");
    assert.equal(extractDestination("going to Lisbon for 5 nights"), "Lisbon");
    assert.equal(extractDestination("trip to Kyoto"), "Kyoto");
  });

  it("rejects commentary that is not a place", () => {
    assert.equal(extractDestination("You're Not Very Smart"), undefined);
    assert.equal(extractDestination("this is dumb"), undefined);
    assert.equal(extractDestination("you are not very smart"), undefined);
    assert.equal(extractDestination("How many nights?"), undefined);
  });
});
