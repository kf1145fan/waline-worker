import { env } from "cloudflare:test";
import { loginAs } from "@tests/helpers/auth.js";
import { createUser } from "@tests/helpers/factories.js";
import { api, json } from "@tests/helpers/request.js";
import { resetDB } from "@tests/helpers/setup.js";
import { beforeEach, describe, expect, it } from "vitest";

type TestEnv = { DB: D1Database };

let db: D1Database;

beforeEach(async () => {
	db = (env as unknown as TestEnv).DB;
	await resetDB(db);
});

// ─── POST /api/user — registration ───────────────────────────────────────────

describe("POST /api/user — registration", () => {
	it("first registered user is assigned administrator type", async () => {
		const res = await api.post("/api/user", {
			body: {
				display_name: "Admin",
				email: "admin@example.com",
				password: "adminpass",
			},
		});
		expect(res.status).toBe(201);
		const data = await json(res);
		expect(data.errno).toBe(0);
		expect(data.data.type).toBe("administrator");
	});

	it("subsequent users are assigned guest type", async () => {
		await createUser(db, { email: "first@example.com" });
		const data = await json(
			await api.post("/api/user", {
				body: { email: "second@example.com", password: "pass" },
			}),
		);
		expect(data.data.type).toBe("guest");
	});

	it("rejects duplicate email with 409", async () => {
		await createUser(db, { email: "taken@example.com" });
		const res = await api.post("/api/user", {
			body: { email: "taken@example.com", password: "pass" },
		});
		expect(res.status).toBe(409);
		expect((await json(res)).errno).toBe(1);
	});

	it("returns 400 when email or password is missing", async () => {
		expect(
			(
				await api.post("/api/user", {
					body: { display_name: "NoEmail" },
				})
			).status,
		).toBe(400);
	});

	it("defaults display_name to email prefix when omitted", async () => {
		const data = await json(
			await api.post("/api/user", {
				body: { email: "bob@example.com", password: "pass" },
			}),
		);
		expect(data.data.display_name).toBe("bob");
	});
});

// ─── GET /api/user ────────────────────────────────────────────────────────────

describe("GET /api/user", () => {
	beforeEach(async () => {
		await createUser(db, { email: "public@example.com", type: "guest" });
	});

	it("returns public top-commenters list for anonymous requests", async () => {
		const res = await api.get("/api/user");
		expect(res.status).toBe(200);
		const data = await json(res);
		expect(data.errno).toBe(0);
		expect(Array.isArray(data.data)).toBe(true);
	});
});

// ─── PUT /api/user/:id ────────────────────────────────────────────────────────

describe("PUT /api/user/:id — profile update", () => {
	let adminToken: string;
	let guestToken: string;
	let adminId: number;
	let guestId: number;

	beforeEach(async () => {
		const admin = await createUser(db, {
			email: "admin@example.com",
			password: "pass",
			type: "administrator",
		});
		const guest = await createUser(db, {
			email: "guest@example.com",
			password: "pass",
			type: "guest",
		});
		adminId = admin.id;
		guestId = guest.id;
		adminToken = await loginAs("admin@example.com", "pass");
		guestToken = await loginAs("guest@example.com", "pass");
	});

	it("user can update their own display_name", async () => {
		const res = await api.put(`/api/user/${guestId}`, {
			token: guestToken,
			body: { display_name: "New Name" },
		});
		expect(res.status).toBe(200);
		expect((await json(res)).data.display_name).toBe("New Name");
	});

	it("user cannot update another user profile (403)", async () => {
		expect(
			(
				await api.put(`/api/user/${adminId}`, {
					token: guestToken,
					body: { display_name: "Hacked" },
				})
			).status,
		).toBe(403);
	});

	it("admin can update any user profile", async () => {
		const res = await api.put(`/api/user/${guestId}`, {
			token: adminToken,
			body: { display_name: "Admin-set Name" },
		});
		expect(res.status).toBe(200);
		expect((await json(res)).data.display_name).toBe("Admin-set Name");
	});
});

// ─── DELETE /api/user/:id ─────────────────────────────────────────────────────

describe("DELETE /api/user/:id", () => {
	let adminToken: string;
	let guestToken: string;
	let guestId: number;

	beforeEach(async () => {
		await createUser(db, {
			email: "admin@example.com",
			password: "pass",
			type: "administrator",
		});
		const guest = await createUser(db, {
			email: "guest@example.com",
			password: "pass",
			type: "guest",
		});
		guestId = guest.id;
		adminToken = await loginAs("admin@example.com", "pass");
		guestToken = await loginAs("guest@example.com", "pass");
	});

	it("non-admin delete attempt returns 403", async () => {
		expect(
			(await api.delete(`/api/user/${guestId}`, { token: guestToken })).status,
		).toBe(403);
	});

	it("admin can delete a guest user", async () => {
		const res = await api.delete(`/api/user/${guestId}`, { token: adminToken });
		expect(res.status).toBe(200);
		expect((await json(res)).errno).toBe(0);
	});

	it("deleting non-existent user returns 404", async () => {
		expect(
			(await api.delete("/api/user/99999", { token: adminToken })).status,
		).toBe(404);
	});
});
