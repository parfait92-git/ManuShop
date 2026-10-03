import { generateKeyPairSync } from "crypto";

import {
  canonicalJson,
  checkSignature,
  formatVerificationCode,
  generateVerificationCode,
  normalizeVerificationCode,
  resetSigningKeysForTests,
  signText,
} from "./signing";

const newKey = () =>
  generateKeyPairSync("ed25519").privateKey.export({ type: "pkcs8", format: "der" }).toString("base64");

describe("signing", () => {
  beforeEach(() => {
    process.env.INVOICE_SIGNING_KEY = newKey();
    resetSigningKeysForTests();
  });

  it("writes the same canonical JSON whatever the key order", () => {
    expect(canonicalJson({ b: 1, a: { d: [2, { y: 1, x: 2 }], c: "é" } })).toBe(
      canonicalJson({ a: { c: "é", d: [2, { x: 2, y: 1 }] }, b: 1 })
    );
    expect(canonicalJson({ a: undefined, b: null })).toBe('{"b":null}');
  });

  it("signs and verifies, and detects the slightest change", () => {
    const signed = signText("F-00012|31000");
    expect(signed).not.toBeNull();
    expect(checkSignature("F-00012|31000", signed!)).toBe("valid");
    expect(checkSignature("F-00012|31001", signed!)).toBe("invalid");
    expect(checkSignature("F-00012|31000", { ...signed!, signature: "AAAA" })).toBe("invalid");
    expect(checkSignature("F-00012|31000", undefined)).toBe("unsigned");
  });

  it("says a signature made with another key can't be checked", () => {
    const signed = signText("x")!;
    process.env.INVOICE_SIGNING_KEY = newKey();
    resetSigningKeysForTests();
    expect(checkSignature("x", signed)).toBe("other_key");
  });

  it("signs nothing, without failing, when the key is missing or unreadable", () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    delete process.env.INVOICE_SIGNING_KEY;
    resetSigningKeysForTests();
    expect(signText("x")).toBeNull();
    expect(checkSignature("x", { signature: "s", keyId: "k" })).toBe("no_key");

    process.env.INVOICE_SIGNING_KEY = "pas une clé";
    resetSigningKeysForTests();
    expect(signText("x")).toBeNull();
  });

  it("generates unguessable codes that survive being typed by hand", () => {
    const codes = new Set(Array.from({ length: 200 }, generateVerificationCode));
    expect(codes.size).toBe(200);
    const code = [...codes][0];
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{10}$/);

    const printed = formatVerificationCode("7K4PQ9X2MB");
    expect(printed).toBe("MS-7K4PQ-9X2MB");
    expect(normalizeVerificationCode(printed)).toBe("7K4PQ9X2MB");
    expect(normalizeVerificationCode(" ms 7k4pq 9x2mb ")).toBe("7K4PQ9X2MB");
    // O lu 0, I et L lus 1.
    expect(normalizeVerificationCode("MS-OI0L0-00000")).toBe("0101000000");
    expect(normalizeVerificationCode("trop court")).toBeNull();
    expect(normalizeVerificationCode("MS-7K4PQ-9X2MBU")).toBeNull();
  });
});
