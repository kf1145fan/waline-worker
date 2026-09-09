import { env } from "cloudflare:test";
import { generateCurrentTotp } from "@tests/helpers/auth.js";
import { createUser } from "@tests/helpers/factories.js";
import { api, json } from "@tests/helpers/request.js";
import { setupDB } from "@tests/helpers/setup.js";
import { beforeAll, describe, expect, it } from "vitest";

type TestEnv = { DB: D1Database };

beforeAll(async () => {
	const db = (env as unknown as TestEnv).DB;
	await setupDB(db);
	await createUser(db, {
		email: "test@example.com",
		password: "testpass123",
		type: "administrator",
	});
});

describe("POST /api/token — login", () => {
	it("returns a token on valid credentials", async () => {
		const res = await api.post("/api/token", {
			body: { email: "test@example.com", password: "testpass123" },
		});
		expect(res.status).toBe(200);
		const data = await json(res);
		expect(data.errno).toBe(0);
		expect(data.errmsg).toBe("");
		expect(typeof data.data.token).toBe("string");
		expect(data.data.token.split(".").length).toBe(3);
		expect(data.data.display_name).toBeDefined();
		expect(data.data.email).toBe("test@example.com");
		expect(data.data.type).toBe("administrator");
	});

	it("returns 401 for wrong password", async () => {
		const res = await api.post("/api/token", {
			body: { email: "test@example.com", password: "wrongpassword" },
		});
		expect(res.status).toBe(401);
		const data = await json(res);
		expect(data.errno).toBe(1);
		expect(typeof data.errmsg).toBe("string");
	});

	it("returns 401 for unknown email", async () => {
		expect(
			(
				await api.post("/api/token", {
					body: { email: "nobody@example.com", password: "pass" },
				})
			).status,
		).toBe(401);
	});

	it("returns 400 when required fields are missing", async () => {
		expect(
			(
				await api.post("/api/token", {
					body: { email: "test@example.com" },
				})
			).status,
		).toBe(400);
	});
});

describe("GET /api/token — current user", () => {
	it("returns user info for a valid Bearer token", async () => {
		const {
			data: { token },
		} = await json(
			await api.post("/api/token", {
				body: { email: "test@example.com", password: "testpass123" },
			}),
		);
		const res = await api.get("/api/token", { token });
		expect(res.status).toBe(200);
		const data = await json(res);
		expect(data.errno).toBe(0);
		expect(data.data.email).toBe("test@example.com");
		expect(data.data.type).toBe("administrator");
		expect(data.data.avatar).toBeDefined();
		expect(data.data.display_name).toBeDefined();
	});

	it("returns 401 without a token", async () => {
		expect((await api.get("/api/token")).status).toBe(401);
	});

	it("returns 401 for an invalid token", async () => {
		expect(
			(await api.get("/api/token", { token: "not.a.valid.token" })).status,
		).toBe(401);
	});
});

describe("DELETE /api/token — logout", () => {
	it("returns 200 with valid token", async () => {
		const {
			data: { token },
		} = await json(
			await api.post("/api/token", {
				body: { email: "test@example.com", password: "testpass123" },
			}),
		);
		const res = await api.delete("/api/token", { token });
		expect(res.status).toBe(200);
		expect((await json(res)).errno).toBe(0);
	});

	it("returns 200 even without a token (idempotent)", async () => {
		expect((await api.delete("/api/token")).status).toBe(200);
	});
});

describe("POST /api/token/2fa — enable 2FA", () => {
	it("returns 401 without auth", async () => {
		expect(
			(
				await api.post("/api/token/2fa", {
					body: { secret: "JBSWY3DPEHPK3PXP", code: "123456" },
				})
			).status,
		).toBe(401);
	});

	it("returns 400 when code is not 6 digits", async () => {
		const {
			data: { token },
		} = await json(
			await api.post("/api/token", {
				body: { email: "test@example.com", password: "testpass123" },
			}),
		);
		expect(
			(
				await api.post("/api/token/2fa", {
					token,
					body: { secret: "JBSWY3DPEHPK3PXP", code: "abc" },
				})
			).status,
		).toBe(400);
	});

	it("returns 200 with a valid TOTP code for the provided secret", async () => {
		const {
			data: { token },
		} = await json(
			await api.post("/api/token", {
				body: { email: "test@example.com", password: "testpass123" },
			}),
		);
		const secret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PX";
		const code = await generateCurrentTotp(secret);
		const res = await api.post("/api/token/2fa", {
			token,
			body: { secret, code },
		});
		expect(res.status).toBe(200);
		expect((await json(res)).errno).toBe(0);
	});
});
