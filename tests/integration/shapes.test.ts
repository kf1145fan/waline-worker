import { env } from "cloudflare:test";
import { loginAs } from "@tests/helpers/auth.js";
import { createUser } from "@tests/helpers/factories.js";
import { api, json } from "@tests/helpers/request.js";
import { resetDB } from "@tests/helpers/setup.js";
import { beforeAll, describe, expect, it } from "vitest";

type TestEnv = { DB: D1Database };

let adminToken: string;

beforeAll(async () => {
	const db = (env as unknown as TestEnv).DB;
	await resetDB(db);
	await createUser(db, {
		email: "shape@test.com",
		password: "pass",
		type: "administrator",
	});
	adminToken = await loginAs("shape@test.com", "pass");
});

describe("Response shape — POST /api/token", () => {
	it("login response has exact Waline envelope shape", async () => {
		const body = await json(
			await api.post("/api/token", {
				body: { email: "shape@test.com", password: "pass" },
			}),
		);
		expect(body).toMatchObject({
			errno: 0,
			errmsg: "",
			data: {
				token: expect.any(String),
				display_name: expect.any(String),
				email: expect.any(String),
				type: expect.any(String),
				avatar: expect.any(String),
			},
		});
	});
});

describe("Response shape — GET /api/token", () => {
	it("current user response has all fields the Waline client reads", async () => {
		const body = await json(await api.get("/api/token", { token: adminToken }));
		expect(body).toMatchObject({
			errno: 0,
			errmsg: "",
			data: {
				objectId: expect.any(Number),
				display_name: expect.any(String),
				email: expect.any(String),
				type: expect.any(String),
				avatar: expect.any(String),
				label: expect.any(String),
			},
		});
	});
});

describe("Response shape — POST /api/user", () => {
	it("registration response has exact Waline shape", async () => {
		const body = await json(
			await api.post("/api/user", {
				body: {
					email: "newshape@test.com",
					password: "pass",
					display_name: "New User",
				},
			}),
		);
		expect(body).toMatchObject({
			errno: 0,
			errmsg: "",
			data: {
				objectId: expect.any(Number),
				display_name: expect.any(String),
				email: expect.any(String),
				type: expect.any(String),
				avatar: expect.any(String),
				label: expect.any(String),
				url: expect.any(String),
			},
		});
	});
});

describe("Response shape — GET /api/comment?path=", () => {
	it("comment list envelope matches Waline client expectations", async () => {
		const body = await json(
			await api.get("/api/comment", { params: { path: "/shape-test" } }),
		);
		expect(body).toMatchObject({
			errno: 0,
			errmsg: "",
			data: {
				page: expect.any(Number),
				pageSize: expect.any(Number),
				count: expect.any(Number),
				totalPages: expect.any(Number),
				data: expect.any(Array),
			},
		});
	});
});

describe("Response shape — POST /api/comment", () => {
	it("created comment has all fields the Waline client consumes", async () => {
		const body = await json(
			await api.post("/api/comment", {
				body: {
					nick: "Tester",
					mail: "tester@test.com",
					comment: "Shape test",
					url: "/shape-test",
				},
			}),
		);
		expect(body).toMatchObject({
			errno: 0,
			errmsg: "",
			data: {
				objectId: expect.any(Number),
				nick: expect.any(String),
				comment: expect.any(String),
				orig: expect.any(String),
				time: expect.any(Number),
				insertedAt: expect.any(String),
				createdAt: expect.any(String),
				avatar: expect.any(String),
				browser: expect.any(String),
				os: expect.any(String),
				like: expect.any(Number),
				status: expect.any(String),
				sticky: expect.any(Boolean),
				url: expect.any(String),
				label: expect.any(String),
			},
		});
	});
});

describe("Response shape — GET /api/article", () => {
	it("article time response has the expected data array shape", async () => {
		const body = await json(
			await api.get("/api/article", {
				params: { path: "/shape-test", type: "time" },
			}),
		);
		expect(body).toMatchObject({
			errno: 0,
			errmsg: "",
			data: [{ time: expect.any(Number) }],
		});
	});

	it("article reaction response has all reaction fields", async () => {
		const types = Array.from({ length: 7 }, (_, i) => `reaction${i}`);
		const body = await json(
			await api.get("/api/article", {
				params: { path: "/shape-test", type: types },
			}),
		);
		expect(body.errno).toBe(0);
		const item = body.data[0];
		for (let i = 0; i <= 6; i++) {
			expect(typeof item[`reaction${i}`]).toBe("number");
		}
	});
});

describe("Response shape — POST /api/article", () => {
	it("article update returns the new counter value", async () => {
		const body = await json(
			await api.post("/api/article", {
				body: { path: "/shape-test", type: "time", action: "inc" },
			}),
		);
		expect(body).toMatchObject({
			errno: 0,
			errmsg: "",
			data: [{ time: expect.any(Number) }],
		});
	});
});
