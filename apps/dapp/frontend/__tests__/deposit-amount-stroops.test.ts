import { describe, expect, it } from "vitest";
import { decimalStringToStroops, depositAmountToStroops } from "@/lib/decimal";

describe("decimalStringToStroops", () => {
  it.each([
    ["0.3", BigInt(3_000_000)],
    ["0.1", BigInt(1_000_000)],
    ["1", BigInt(10_000_000)],
    ["100.50", BigInt(1_005_000_000)],
    ["1234567.1234567", BigInt("12345671234567")],
    ["0.0000001", BigInt(1)],
    [".5", BigInt(5_000_000)],
    ["5.", BigInt(50_000_000)],
    ["900719925474.0992", BigInt("9007199254740992000")],
    ["99999999999999999999.9999999", BigInt("999999999999999999999999999")],
  ])("parses %s exactly", (input, expected) => {
    expect(decimalStringToStroops(input)).toBe(expected);
  });

  it.each([
    ["0.00000001", /7 decimal/],
    ["1.12345678", /7 decimal/],
    ["", /invalid/i],
    [".", /invalid/i],
    ["abc", /invalid/i],
    ["1e3", /invalid/i],
    ["-1", /invalid/i],
    ["1.2.3", /invalid/i],
    [" 1", /invalid/i],
    ["1,5", /invalid/i],
  ])("rejects %j", (input, message) => {
    expect(() => decimalStringToStroops(input)).toThrow(message);
  });
});

describe("depositAmountToStroops", () => {
  it("passes bigint stroops through untouched", () => {
    expect(depositAmountToStroops(BigInt(42))).toBe(BigInt(42));
  });

  it("parses decimal strings", () => {
    expect(depositAmountToStroops("0.3")).toBe(BigInt(3_000_000));
  });

  it("rejects zero and negative bigint amounts", () => {
    expect(() => depositAmountToStroops(BigInt(0))).toThrow(/greater than zero/);
    expect(() => depositAmountToStroops(BigInt(-1))).toThrow(/greater than zero/);
  });

  it("rejects a zero decimal string", () => {
    expect(() => depositAmountToStroops("0.0")).toThrow(/greater than zero/);
  });

  it("rejects number input at runtime", () => {
    expect(() => depositAmountToStroops(0.3 as unknown as string)).toThrow(/bigint or a decimal string/);
  });
});
