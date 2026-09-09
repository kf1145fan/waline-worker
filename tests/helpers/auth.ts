import { api, json } from "@tests/helpers/request.js";

export async function loginAs(
	email: string,
	password: string,
): Promise<string> {
	const res = await api.post("/api/token", { body: { email, password } });
	if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`);
	return (await json(res)).data.token as string;
}

export async function makeAdmin(db: D1Database, userId: number): Promise<void> {
	await db
		.prepare("UPDATE wl_Users SET type = 'administrator' WHERE id = ?")
		.bind(userId)
		.run();
}

// Reimplements TOTP generation matching src/utils/totp.ts for use in tests.
export async function generateCurrentTotp(secret: string): Promise<string> {
	const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
	const cleaned = secret.replace(/=+$/, "").toUpperCase();
	let bits = "";
	for (const char of cleaned) {
		const val = BASE32.indexOf(char);
		if (val !== -1) bits += val.toString(2).padStart(5, "0");
	}
	const secretBytes = new Uint8Array(Math.floor(bits.length / 8));
	for (let i = 0; i < secretBytes.length; i++) {
		secretBytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
	}
	const counter = Math.floor(Date.now() / 1000 / 30);
	const buf = new ArrayBuffer(8);
	const view = new DataView(buf);
	view.setUint32(0, Math.floor(counter / 0x100000000));
	view.setUint32(4, counter >>> 0);
	const key = await crypto.subtle.importKey(
		"raw",
		secretBytes,
		{ name: "HMAC", hash: "SHA-1" },
		false,
		["sign"],
	);
	const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, buf));
	const offset = sig[sig.length - 1] & 0xf;
	const code =
		(((sig[offset] & 0x7f) << 24) |
			((sig[offset + 1] & 0xff) << 16) |
			((sig[offset + 2] & 0xff) << 8) |
			(sig[offset + 3] & 0xff)) %
		1_000_000;
	return code.toString().padStart(6, "0");
}
