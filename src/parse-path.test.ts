import { describe, it, expect } from "vitest";
import { parsePath } from "./parse-path";

describe("parsePath", () => {
	it("splits dot paths", () => {
		expect(parsePath("a.b.c")).toEqual(["a", "b", "c"]);
		expect(parsePath("a")).toEqual(["a"]);
	});

	it("handles bracket indices", () => {
		expect(parsePath("a[0].b")).toEqual(["a", "0", "b"]);
		expect(parsePath("[0][1]")).toEqual(["0", "1"]);
		expect(parsePath("a[0][1]")).toEqual(["a", "0", "1"]);
	});

	it("handles quoted bracket keys", () => {
		expect(parsePath('a["b.c"]')).toEqual(["a", "b.c"]);
		expect(parsePath("a['b c'].d")).toEqual(["a", "b c", "d"]);
		expect(parsePath("a['it\\'s']")).toEqual(["a", "it's"]);
		expect(parsePath("a['']")).toEqual(["a", ""]);
		expect(parsePath('a["it\'s"]')).toEqual(["a", "it's"]);
	});

	it("handles escaped characters", () => {
		expect(parsePath("a\\.b.c")).toEqual(["a.b", "c"]);
		expect(parsePath("a\\\\b")).toEqual(["a\\b"]);
	});

	it("keeps quote characters in plain segments", () => {
		expect(parsePath("it's.a\"b")).toEqual(["it's", 'a"b']);
	});

	it.each([
		"",
		".",
		"a.",
		".a",
		"a..b",
		"a[]",
		"a[0",
		"a['b'",
		"a['b'x]",
		"a[0]b",
		"a.[0]",
		"a\\",
		"a[0]\\.b",
	])("rejects malformed path %j", (path) => {
		expect(parsePath(path)).toBeNull();
	});
});
