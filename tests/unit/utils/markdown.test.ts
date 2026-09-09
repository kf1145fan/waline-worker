import { describe, expect, it } from "vitest";

import { renderMarkdown } from "@/utils/markdown.js";

describe("renderMarkdown — inline formatting", () => {
	it("renders **bold**", () => {
		expect(renderMarkdown("**bold text**")).toContain(
			"<strong>bold text</strong>",
		);
	});

	it("renders *italic*", () => {
		expect(renderMarkdown("*italic text*")).toContain("<em>italic text</em>");
	});

	it("renders [link](url)", () => {
		const out = renderMarkdown("[click here](https://example.com)");
		expect(out).toContain('<a href="https://example.com"');
		expect(out).toContain("click here");
		expect(out).toContain('rel="ugc nofollow noreferrer noopener"');
	});

	it("renders `inline code`", () => {
		expect(renderMarkdown("use `console.log` here")).toContain(
			"<code>console.log</code>",
		);
	});

	it("renders fenced code blocks", () => {
		const out = renderMarkdown('```js\nconsole.log("hi")\n```');
		expect(out).toContain("<pre><code");
		expect(out).toContain("console.log");
	});
});

describe("renderMarkdown — block elements", () => {
	it("renders blockquotes", () => {
		expect(renderMarkdown("> quoted text")).toContain(
			"<blockquote>quoted text</blockquote>",
		);
	});

	it("renders unordered lists", () => {
		const out = renderMarkdown("- item one\n- item two");
		expect(out).toContain("<ul>");
		expect(out).toContain("<li>item one</li>");
	});
});

describe("renderMarkdown — XSS sanitization", () => {
	it("escapes <script> tags", () => {
		const out = renderMarkdown("<script>alert(1)</script>");
		expect(out).not.toContain("<script>");
		expect(out).toContain("&lt;script&gt;");
	});

	it("escapes <img onerror> attributes", () => {
		const out = renderMarkdown('<img onerror="evil()">');
		expect(out).not.toContain("<img");
		expect(out).toContain("&lt;img");
	});

	it("strips javascript: href links", () => {
		const out = renderMarkdown("[click](javascript:alert(1))");
		expect(out).not.toContain("javascript:");
		expect(out).not.toContain("<a ");
	});

	it("returns empty string for empty input", () => {
		expect(renderMarkdown("")).toBe("");
	});

	it("safely wraps plain text in a paragraph", () => {
		const out = renderMarkdown("Hello, world!");
		expect(out).toContain("Hello, world!");
		expect(out).not.toContain("<script");
	});
});
