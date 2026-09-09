import { describe, expect, it } from "vitest";
import { signJwt, verifyJwt } from "@/middleware/auth.js";

const SECRET = "unit-test-secret";

describe("signJwt / verifyJwt", () => {
	it("round-trips: verify returns the original payload", async () => {
		const token = await signJwt({ id: 42 }, SECRET);
		const payload = await verifyJwt(token, SECRET);
		expect(payload?.id).toBe(42);
	});

	it("returns null for a token signed with a different secret", async () => {
		const token = await signJwt({ id: 1 }, SECRET);
		expect(await verifyJwt(token, "wrong-secret")).toBeNull();
	});

	it("returns null for an expired token", async () => {
		// expiresIn = -1 → exp = now - 1 (already expired)
		const token = await signJwt({ id: 1 }, SECRET, -1);
		expect(await verifyJwt(token, SECRET)).toBeNull();
	});

	it("returns null for a token with a tampered payload", async () => {
		const token = await signJwt({ id: 1 }, SECRET);
		const [header, , sig] = token.split(".");
		// Replace payload with a different id
		const fakePayload = btoa(JSON.stringify({ id: 999, exp: 9999999999 }))
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=+$/, "");
		const tampered = `${header}.${fakePayload}.${sig}`;
		expect(await verifyJwt(tampered, SECRET)).toBeNull();
	});

	it("returns null for a malformed token (not 3 parts)", async () => {
		expect(await verifyJwt("not.a.valid.jwt.token", SECRET)).toBeNull();
		expect(await verifyJwt("onlyone", SECRET)).toBeNull();
	});
});
