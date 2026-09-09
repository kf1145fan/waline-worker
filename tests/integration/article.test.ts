import { env } from "cloudflare:test";
import { createArticle, createUser } from "@tests/helpers/factories.js";
import { api, json } from "@tests/helpers/request.js";
import { resetDB } from "@tests/helpers/setup.js";
import { beforeEach, describe, expect, it } from "vitest";

type TestEnv = { DB: D1Database };

let db: D1Database;

beforeEach(async () => {
	db = (env as unknown as TestEnv).DB;
	await resetDB(db);
	await createUser(db, {
		email: "admin@test.com",
		password: "pass",
		type: "administrator",
	});
});

// ─── GET /api/article ─────────────────────────────────────────────────────────

describe("GET /api/article?path=&type=time", () => {
	it("returns time for a path that exists", async () => {
		await createArticle(db, { url: "/page", time: 42 });
		const body = await json(
			await api.get("/api/article", {
				params: { path: "/page", type: "time" },
			}),
		);
		expect(body.errno).toBe(0);
		expect(body.data).toEqual([{ time: 42 }]);
	});

	it("returns time=0 for unknown path", async () => {
		const body = await json(
			await api.get("/api/article", {
				params: { path: "/unknown", type: "time" },
			}),
		);
		expect(body.data).toEqual([{ time: 0 }]);
	});

	it("accepts multiple paths as repeated ?path= params", async () => {
		await createArticle(db, { url: "/a", time: 10 });
		await createArticle(db, { url: "/b", time: 20 });
		const body = await json(
			await api.get("/api/article", {
				params: { path: ["/a", "/b"], type: "time" },
			}),
		);
		expect(body.data).toHaveLength(2);
		expect(body.data[0].time).toBe(10);
		expect(body.data[1].time).toBe(20);
	});

	it("returns 200 with data:0 when path is omitted (graceful default)", async () => {
		const body = await json(
			await api.get("/api/article", { params: { type: "time" } }),
		);
		expect(body.errno).toBe(0);
		expect(body.data).toBe(0);
	});

	it("defaults to type=time when type is omitted", async () => {
		await createArticle(db, { url: "/page", time: 7 });
		const body = await json(
			await api.get("/api/article", { params: { path: "/page" } }),
		);
		expect(body.data).toEqual([{ time: 7 }]);
	});
});

describe("GET /api/article?path=&type=reaction0", () => {
	it("returns reaction0 counter (defaults to 0 for unknown path)", async () => {
		const body = await json(
			await api.get("/api/article", {
				params: { path: "/page", type: "reaction0" },
			}),
		);
		expect(body.errno).toBe(0);
		expect(typeof body.data[0].reaction0).toBe("number");
		expect(body.data[0].reaction0).toBe(0);
	});

	it("can query multiple reaction fields simultaneously", async () => {
		const body = await json(
			await api.get("/api/article", {
				params: {
					path: "/page",
					type: ["reaction0", "reaction1", "reaction2"],
				},
			}),
		);
		expect(body.data[0]).toMatchObject({
			reaction0: expect.any(Number),
			reaction1: expect.any(Number),
			reaction2: expect.any(Number),
		});
	});
});

// ─── POST /api/article ────────────────────────────────────────────────────────

describe("POST /api/article — increment/decrement time", () => {
	it("inc creates a new record with time=1 for unknown path", async () => {
		const body = await json(
			await api.post("/api/article", {
				body: { path: "/new-page", type: "time", action: "inc" },
			}),
		);
		expect(body.errno).toBe(0);
		expect(body.data[0].time).toBe(1);
	});

	it("inc increments an existing record", async () => {
		await createArticle(db, { url: "/page", time: 5 });
		const body = await json(
			await api.post("/api/article", {
				body: { path: "/page", type: "time", action: "inc" },
			}),
		);
		expect(body.data[0].time).toBe(6);
	});

	it("desc decrements an existing record", async () => {
		await createArticle(db, { url: "/page", time: 3 });
		const body = await json(
			await api.post("/api/article", {
				body: { path: "/page", type: "time", action: "desc" },
			}),
		);
		expect(body.data[0].time).toBe(2);
	});

	it("desc on a new path returns 0 (no negative values)", async () => {
		const body = await json(
			await api.post("/api/article", {
				body: { path: "/brand-new", type: "time", action: "desc" },
			}),
		);
		expect(body.data[0].time).toBe(0);
	});

	it("defaults action to inc when omitted", async () => {
		const body = await json(
			await api.post("/api/article", {
				body: { path: "/page", type: "time" },
			}),
		);
		expect(body.data[0].time).toBe(1);
	});

	it("returns 400 when path is missing", async () => {
		expect(
			(
				await api.post("/api/article", {
					body: { type: "time", action: "inc" },
				})
			).status,
		).toBe(400);
	});

	it("returns 400 when type is invalid", async () => {
		expect(
			(
				await api.post("/api/article", {
					body: { path: "/page", type: "bad_field", action: "inc" },
				})
			).status,
		).toBe(400);
	});
});

describe("POST /api/article — increment/decrement reaction", () => {
	it("inc reaction0 creates/increments counter", async () => {
		const body = await json(
			await api.post("/api/article", {
				body: { path: "/page", type: "reaction0", action: "inc" },
			}),
		);
		expect(body.data[0].reaction0).toBe(1);
	});

	it("inc reaction4 operates independently from reaction0", async () => {
		await api.post("/api/article", {
			body: { path: "/page", type: "reaction0", action: "inc" },
		});
		const body = await json(
			await api.post("/api/article", {
				body: { path: "/page", type: "reaction4", action: "inc" },
			}),
		);
		expect(body.data[0].reaction4).toBe(1);
		const check = await json(
			await api.get("/api/article", {
				params: { path: "/page", type: ["reaction0", "reaction4"] },
			}),
		);
		expect(check.data[0].reaction0).toBe(1);
		expect(check.data[0].reaction4).toBe(1);
	});
});
