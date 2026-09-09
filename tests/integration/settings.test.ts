import { env } from "cloudflare:test";
import { loginAs } from "@tests/helpers/auth.js";
import { createUser } from "@tests/helpers/factories.js";
import { api, json } from "@tests/helpers/request.js";
import { resetDB } from "@tests/helpers/setup.js";
import { beforeEach, describe, expect, it } from "vitest";

type TestEnv = { DB: D1Database };

let db: D1Database;
let adminToken: string;
let guestToken: string;

beforeEach(async () => {
	db = (env as unknown as TestEnv).DB;
	await resetDB(db);
	await createUser(db, {
		email: "admin@test.com",
		password: "pass",
		type: "administrator",
	});
	await createUser(db, {
		email: "guest@test.com",
		password: "pass",
		type: "guest",
	});
	adminToken = await loginAs("admin@test.com", "pass");
	guestToken = await loginAs("guest@test.com", "pass");
});

describe("GET /api/settings", () => {
	it("returns 403 without token", async () => {
		expect((await api.get("/api/settings")).status).toBe(403);
	});

	it("returns 403 for non-admin", async () => {
		expect((await api.get("/api/settings", { token: guestToken })).status).toBe(
			403,
		);
	});

	it("admin gets current settings object", async () => {
		const body = await json(
			await api.get("/api/settings", { token: adminToken }),
		);
		expect(body.errno).toBe(0);
		expect(typeof body.data).toBe("object");
	});

	it("sensitive keys are masked and not returned as plaintext", async () => {
		await api.put("/api/settings", {
			token: adminToken,
			body: { llm_api_key: "sk-supersecretapikey12345678" },
		});
		const body = await json(
			await api.get("/api/settings", { token: adminToken }),
		);
		expect(body.data.llm_api_key).not.toBe("sk-supersecretapikey12345678");
		expect(body.data.llm_api_key).toMatch(/\*+/);
	});
});

describe("PUT /api/settings", () => {
	it("returns 403 without token", async () => {
		expect(
			(
				await api.put("/api/settings", {
					body: { comment_default_status: "waiting" },
				})
			).status,
		).toBe(403);
	});

	it("returns 403 for non-admin", async () => {
		expect(
			(
				await api.put("/api/settings", {
					token: guestToken,
					body: { comment_default_status: "waiting" },
				})
			).status,
		).toBe(403);
	});

	it("admin can update comment_default_status", async () => {
		await api.put("/api/settings", {
			token: adminToken,
			body: { comment_default_status: "waiting" },
		});
		const body = await json(
			await api.get("/api/settings", { token: adminToken }),
		);
		expect(body.data.comment_default_status).toBe("waiting");
	});

	it("admin can update llm_mode", async () => {
		await api.put("/api/settings", {
			token: adminToken,
			body: { llm_mode: "all" },
		});
		const body = await json(
			await api.get("/api/settings", { token: adminToken }),
		);
		expect(body.data.llm_mode).toBe("all");
	});

	it("unknown setting keys return 200 and are silently ignored", async () => {
		const res = await api.put("/api/settings", {
			token: adminToken,
			body: { totally_unknown_key_xyz: "value" },
		});
		expect(res.status).toBe(200);
	});

	it("GET reflects updated value immediately after PUT", async () => {
		await api.put("/api/settings", {
			token: adminToken,
			body: { llm_model: "gpt-4o" },
		});
		const body = await json(
			await api.get("/api/settings", { token: adminToken }),
		);
		expect(body.data.llm_model).toBe("gpt-4o");
	});
});
