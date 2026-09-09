import { hashPassword } from "@/utils/password.js";

export interface UserData {
	display_name?: string;
	email?: string;
	password?: string;
	type?: string;
	url?: string;
	avatar?: string;
	label?: string;
}

export async function createUser(
	db: D1Database,
	data: UserData = {},
): Promise<any> {
	const email = data.email ?? `user${Date.now()}@example.com`;
	const hash = await hashPassword(data.password ?? "password123");
	await db
		.prepare(
			"INSERT INTO wl_Users (display_name, email, password, type, url, avatar, label) VALUES (?, ?, ?, ?, ?, ?, ?)",
		)
		.bind(
			data.display_name ?? email.split("@")[0],
			email,
			hash,
			data.type ?? "guest",
			data.url ?? "",
			data.avatar ?? "",
			data.label ?? "",
		)
		.run();
	return db
		.prepare("SELECT * FROM wl_Users WHERE email = ?")
		.bind(email)
		.first();
}

export async function createComment(
	db: D1Database,
	data: Record<string, any> = {},
): Promise<any> {
	await db
		.prepare(
			`INSERT INTO wl_Comment (user_id, comment, orig, nick, mail, link, url, status, sticky, pid, rid)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			data.user_id ?? null,
			data.comment ?? "<p>Test comment</p>",
			data.orig ?? "Test comment",
			data.nick ?? "Tester",
			data.mail ?? "tester@example.com",
			data.link ?? "",
			data.url ?? "/test-page",
			data.status ?? "approved",
			data.sticky ?? 0,
			data.pid ?? null,
			data.rid ?? null,
		)
		.run();
	return db
		.prepare("SELECT * FROM wl_Comment WHERE id = last_insert_rowid()")
		.first();
}

export async function createArticle(
	db: D1Database,
	data: Record<string, any> = {},
): Promise<any> {
	const url = data.url ?? "/test-article";
	// INSERT OR IGNORE: second call with the same url silently no-ops.
	// In tests, always resetDB between runs so this doesn't hide stale data.
	await db
		.prepare("INSERT OR IGNORE INTO wl_Counter (url, time) VALUES (?, ?)")
		.bind(url, data.time ?? 0)
		.run();
	return db.prepare("SELECT * FROM wl_Counter WHERE url = ?").bind(url).first();
}
