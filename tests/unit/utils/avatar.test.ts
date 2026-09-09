import { describe, expect, it } from "vitest";

import { getAvatar } from "@/utils/avatar.js";

const GRAVATAR_BASE = "https://gravatar.com/avatar/";

describe("getAvatar", () => {
	it("returns a Gravatar URL for a known email", async () => {
		const url = await getAvatar("test@example.com");
		expect(url).toMatch(
			/^https:\/\/gravatar\.com\/avatar\/[0-9a-f]{32}\?d=mp$/,
		);
	});

	it("produces the same hash regardless of email case", async () => {
		const lower = await getAvatar("user@example.com");
		const upper = await getAvatar("USER@EXAMPLE.COM");
		expect(lower).toBe(upper);
	});

	it("produces the same hash when email has surrounding whitespace", async () => {
		const normal = await getAvatar("user@example.com");
		const padded = await getAvatar("  user@example.com  ");
		expect(normal).toBe(padded);
	});

	it("returns empty string for empty email", async () => {
		expect(await getAvatar("")).toBe("");
	});

	it("URL starts with Gravatar base and includes default parameter", async () => {
		const url = await getAvatar("someone@example.com");
		expect(url.startsWith(GRAVATAR_BASE)).toBe(true);
		expect(url.endsWith("?d=mp")).toBe(true);
	});
});
