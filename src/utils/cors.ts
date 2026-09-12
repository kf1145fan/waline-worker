/**
 * CORS allowlist helpers.
 *
 * The allowlist is a comma-separated list of origins/domains that may come from
 * the SECURE_DOMAINS env var and/or the UI-managed `secure_domains` setting.
 */

/**
 * Normalize an allowlist entry: strip scheme, trailing slashes, whitespace.
 * Accepts both `yourdomain.com` and `https://yourdomain.com` / `https://yourdomain.com/`.
 */
export function normalizeDomain(d: string): string {
	return d
		.trim()
		.replace(/^https?:\/\//i, "")
		.replace(/\/+$/, "")
		.toLowerCase();
}

/**
 * Check whether an Origin is allowed by a comma-separated allowlist.
 * Exact host match, or subdomain match (`blog.example.com` is allowed by `example.com`).
 */
export function originAllowed(origin: string, allowlist: string): boolean {
	if (!origin) return false;
	let host = origin;
	try {
		host = new URL(origin).host.toLowerCase();
	} catch {
		host = normalizeDomain(origin);
	}
	const domains = allowlist
		.split(",")
		.map(normalizeDomain)
		.filter((d) => d.length > 0);
	return domains.some((d) => host === d || host.endsWith(`.${d}`));
}
