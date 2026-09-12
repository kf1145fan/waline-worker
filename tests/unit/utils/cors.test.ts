import { describe, expect, it } from "vitest";
import { normalizeDomain, originAllowed } from "../../../src/utils/cors.js";

describe("normalizeDomain", () => {
	it("strips scheme and trailing slashes", () => {
		expect(normalizeDomain("https://blog.example.com")).toBe("blog.example.com");
		expect(normalizeDomain("http://EXAMPLE.com/")).toBe("example.com");
		expect(normalizeDomain(" example.com ")).toBe("example.com");
		expect(normalizeDomain("localhost:3000")).toBe("localhost:3000");
	});
});

describe("originAllowed", () => {
	it("allows exact origin stored with scheme", () => {
		expect(
			originAllowed("https://blog.example.com", "https://blog.example.com"),
		).toBe(true);
	});

	it("allows origin against bare domain (no scheme in allowlist)", () => {
		expect(originAllowed("https://blog.example.com", "blog.example.com")).toBe(
			true,
		);
	});

	it("allows stored value with trailing slash", () => {
		expect(
			originAllowed("https://blog.example.com", "https://blog.example.com/"),
		).toBe(true);
	});

	it("allows subdomains of a stored domain", () => {
		expect(
			originAllowed("https://sub.blog.example.com", "blog.example.com"),
		).toBe(true);
	});

	it("allows bare origin when allowlist is the same bare domain", () => {
		expect(originAllowed("blog.example.com", "blog.example.com")).toBe(true);
	});

	it("does not allow unrelated origins", () => {
		expect(originAllowed("https://evil.com", "blog.example.com")).toBe(false);
	});

	it("does not allow origins on a suffix-matching trap domain", () => {
		expect(originAllowed("https://evilexample.com", "example.com")).toBe(false);
	});

	it("allows when allowlist is the merged env + UI value", () => {
		expect(originAllowed("https://a.com", "https://b.com, https://a.com/")).toBe(
			true,
		);
	});

	it("denies everything for an empty allowlist", () => {
		expect(originAllowed("https://a.com", "")).toBe(false);
	});

	it("denies empty origin", () => {
		expect(originAllowed("", "a.com")).toBe(false);
	});
});
