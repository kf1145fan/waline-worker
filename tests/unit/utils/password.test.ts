import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/utils/password.js";

describe("hashPassword", () => {
	it("produces a $pbkdf2$ prefixed string", async () => {
		const hash = await hashPassword("mypassword");
		expect(hash).toMatch(/^\$pbkdf2\$/);
	});

	it("produces different hashes for the same input (random salt)", async () => {
		const h1 = await hashPassword("mypassword");
		const h2 = await hashPassword("mypassword");
		expect(h1).not.toBe(h2);
	});
});

describe("verifyPassword", () => {
	it("returns true for the correct password", async () => {
		const hash = await hashPassword("correct-horse");
		expect(await verifyPassword("correct-horse", hash)).toBe(true);
	});

	it("returns false for the wrong password", async () => {
		const hash = await hashPassword("correct-horse");
		expect(await verifyPassword("wrong-horse", hash)).toBe(false);
	});

	it("returns false for phpass format (migration legacy)", async () => {
		expect(
			await verifyPassword("anything", "$P$BVHazph/WGVPKyrlxFhTR6RlsNXFNX."),
		).toBe(false);
	});

	it("returns false for an unrecognised hash format", async () => {
		expect(await verifyPassword("anything", "not-a-valid-hash")).toBe(false);
	});

	it("verifies bcrypt hashes (LeanCloud migration compat)", async () => {
		const bcryptHash = bcrypt.hashSync("migrated-password", 10);
		expect(await verifyPassword("migrated-password", bcryptHash)).toBe(true);
		expect(await verifyPassword("wrong", bcryptHash)).toBe(false);
	});
});
