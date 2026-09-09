import { describe, expect, it } from "vitest";
import {
	base32Decode,
	base32Encode,
	generateSecret,
	verifyTotp,
} from "@/utils/totp.js";

describe("base32Encode / base32Decode", () => {
	it("round-trips arbitrary bytes", () => {
		const original = new Uint8Array([0, 1, 63, 127, 128, 200, 255]);
		const decoded = base32Decode(base32Encode(original));
		expect(decoded).toEqual(original);
	});

	it("round-trips all-zero bytes", () => {
		const original = new Uint8Array(10);
		expect(base32Decode(base32Encode(original))).toEqual(original);
	});

	it("encoded string contains only base32 alphabet characters", () => {
		const encoded = base32Encode(new Uint8Array([72, 101, 108, 108, 111]));
		expect(encoded).toMatch(/^[A-Z2-7]+$/);
	});
});

describe("generateSecret", () => {
	it("returns a non-empty base32 string", () => {
		const secret = generateSecret();
		expect(secret.length).toBeGreaterThan(0);
		expect(secret).toMatch(/^[A-Z2-7]+$/);
	});

	it("produces a different secret each call", () => {
		expect(generateSecret()).not.toBe(generateSecret());
	});

	it("uses the specified byte length (default 20 bytes → 32 base32 chars)", () => {
		// 20 bytes → ceil(20 * 8 / 5) = 32 base32 chars
		expect(generateSecret(20).length).toBe(32);
	});
});

describe("verifyTotp", () => {
	it("returns false for a clearly invalid token", async () => {
		const secret = generateSecret();
		// Non-numeric tokens can never match a 6-digit HOTP output
		expect(await verifyTotp(secret, "AAAAAA")).toBe(false);
	});

	it("returns false for a token of wrong length", async () => {
		const secret = generateSecret();
		expect(await verifyTotp(secret, "12345")).toBe(false);
		expect(await verifyTotp(secret, "1234567")).toBe(false);
	});
});
