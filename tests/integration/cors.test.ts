import { env, SELF } from "cloudflare:test";
import { loginAs } from "@tests/helpers/auth.js";
import { createUser } from "@tests/helpers/factories.js";
import { api } from "@tests/helpers/request.js";
import { resetDB } from "@tests/helpers/setup.js";
import { beforeEach, describe, expect, it } from "vitest";

type TestEnv = { DB: D1Database };

let db: D1Database;
let adminToken: string;

beforeEach(async () => {
	db = (env as unknown as TestEnv).DB;
	await resetDB(db);
	await createUser(db, {
		email: "admin@test.com",
		password: "pass",
		type: "administrator",
	});
	adminToken = await loginAs("admin@test.com", "pass");
});

function fetchWithOrigin(origin: string): Promise<Response> {
	return SELF.fetch("http://localhost/api/comment?path=/", {
		headers: { Origin: origin },
	});
}

describe("CORS allowlist managed via /api/settings", () => {
	it("allows any origin when no allowlist is configured", async () => {
		const res = await fetchWithOrigin("https://anywhere.example");
		expect(res.headers.get("access-control-allow-origin")).toBe(
			"https://anywhere.example",
		);
	});

	it("restricts origins after saving secure_domains setting", async () => {
		await api.put("/api/settings", {
			token: adminToken,
			body: { secure_domains: "https://blog.example.com,example.org" },
		});

		const exact = await fetchWithOrigin("https://blog.example.com");
		expect(exact.headers.get("access-control-allow-origin")).toBe(
			"https://blog.example.com",
		);

		const bare = await fetchWithOrigin("https://example.org");
		expect(bare.headers.get("access-control-allow-origin")).toBe(
			"https://example.org",
		);

		const sub = await fetchWithOrigin("https://blog.example.org");
		expect(sub.headers.get("access-control-allow-origin")).toBe(
			"https://blog.example.org",
		);

		const blocked = await fetchWithOrigin("https://evil.com");
		expect(blocked.headers.get("access-control-allow-origin")).toBeNull();
	});

	it("normalizes stored values with scheme or trailing slash", async () => {
		await api.put("/api/settings", {
			token: adminToken,
			body: { secure_domains: "https://x.example.com/, example.net" },
		});

		const a = await fetchWithOrigin("https://x.example.com");
		expect(a.headers.get("access-control-allow-origin")).toBe(
			"https://x.example.com",
		);

		const b = await fetchWithOrigin("https://example.net");
		expect(b.headers.get("access-control-allow-origin")).toBe(
			"https://example.net",
		);
	});

	it("exposes env_secure_domains and stores secure_domains in GET /api/settings", async () => {
		await api.put("/api/settings", {
			token: adminToken,
			body: { secure_domains: "https://ui.example.com" },
		});
		const body = await (
			await api.get("/api/settings", { token: adminToken })
		).json();
		expect(body.data.secure_domains).toBe("https://ui.example.com");
		expect(typeof body.env_secure_domains).toBe("string");
	});
});
