import { describe, expect, it } from "vitest";
import { sortArrayByDefaultArray } from "../src/utils/sort.js";

describe("sortArrayByDefaultArray", () => {
  it("orders items based on a default array and keeps unknowns at the end", () => {
    const input = ["c", "a", "b", "x"];
    const defaults = ["b", "a"];

    const result = sortArrayByDefaultArray(input, defaults);

    expect(result).toEqual(["b", "a", "c", "x"]);
  });

  it("returns original order when no defaults are provided", () => {
    const input = ["a", "b", "c"];

    const result = sortArrayByDefaultArray(input, []);

    expect(result).toEqual(["a", "b", "c"]);
  });
});
