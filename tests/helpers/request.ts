import { SELF } from "cloudflare:test";

const BASE = "http://localhost";

type Method = "GET" | "POST" | "PUT" | "DELETE";

interface RequestOptions {
	body?: unknown;
	token?: string;
	params?: Record<string, string | string[]>;
}

function buildUrl(
	path: string,
	params?: Record<string, string | string[]>,
): string {
	if (!params) return `${BASE}${path}`;
	const qs = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (Array.isArray(value)) for (const v of value) qs.append(key, v);
		else qs.set(key, value);
	}
	return `${BASE}${path}?${qs.toString()}`;
}

async function request(
	method: Method,
	path: string,
	options: RequestOptions = {},
): Promise<Response> {
	const { body, token, params } = options;
	const headers: Record<string, string> = {};
	if (body !== undefined) headers["Content-Type"] = "application/json";
	if (token) headers.Authorization = `Bearer ${token}`;
	return SELF.fetch(buildUrl(path, params), {
		method,
		headers,
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});
}

export const api = {
	get: (path: string, options?: RequestOptions) =>
		request("GET", path, options),
	post: (path: string, options?: RequestOptions) =>
		request("POST", path, options),
	put: (path: string, options?: RequestOptions) =>
		request("PUT", path, options),
	delete: (path: string, options?: RequestOptions) =>
		request("DELETE", path, options),
};

export async function json<T = any>(res: Response): Promise<T> {
	return res.json() as Promise<T>;
}
