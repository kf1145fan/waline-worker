import schema from "../../schema.sql?raw";

export async function setupDB(db: D1Database): Promise<void> {
	const statements = schema
		.split(";")
		.map((s) => s.replace(/--[^\n]*/g, "").trim())
		.filter((s) => s.length > 0)
		.map((s) => db.prepare(s));
	await db.batch(statements);
}

export async function resetDB(db: D1Database): Promise<void> {
	await db.batch([
		db.prepare("DROP TABLE IF EXISTS wl_Comment"),
		db.prepare("DROP TABLE IF EXISTS wl_Counter"),
		db.prepare("DROP TABLE IF EXISTS wl_Users"),
		db.prepare("DROP TABLE IF EXISTS wl_Settings"),
	]);
	await setupDB(db);
}
