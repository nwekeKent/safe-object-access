import { describe, it, expect, vi } from "vitest";
import { safeHas, type SafeHasOptions } from "./index";

const has = safeHas as (
	obj: any,
	path: string,
	options?: SafeHasOptions,
) => boolean;

describe("safeHas", () => {
	const obj = {
		a: { b: 1, u: undefined, n: null, list: [10, 20], "x.y": 1 },
	};

	it("is true for existing paths", () => {
		expect(safeHas(obj, "a")).toBe(true);
		expect(safeHas(obj, "a.b")).toBe(true);
		expect(safeHas(obj, "a.list.1")).toBe(true);
		expect(safeHas(obj, "a.list[0]")).toBe(true);
		expect(has(obj, 'a["x.y"]')).toBe(true);
	});

	it("is true when the value is undefined or null", () => {
		expect(safeHas(obj, "a.u")).toBe(true);
		expect(safeHas(obj, "a.n")).toBe(true);
	});

	it("is false for missing keys, out-of-range indices and dead ends", () => {
		expect(has(obj, "a.zzz")).toBe(false);
		expect(has(obj, "a.list.2")).toBe(false);
		expect(has(obj, "a.b.c")).toBe(false);
		expect(has(obj, "a.n.c")).toBe(false);
	});

	it("is false for prototype members and malformed paths", () => {
		expect(has(obj, "__proto__")).toBe(false);
		expect(has(obj, "a.constructor")).toBe(false);
		expect(has(obj, "")).toBe(false);
		expect(has(obj, "a..b")).toBe(false);
	});

	it("is false when the target is not an object", () => {
		expect(has(null, "a")).toBe(false);
		expect(has("str", "length")).toBe(false);
	});

	it("warns only in debug mode", () => {
		const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
		has(obj, "a.zzz");
		expect(spy).not.toHaveBeenCalled();
		has(obj, "a.zzz", { debug: true });
		expect(spy).toHaveBeenCalledWith(
			expect.stringContaining('[safeHas] Key "zzz"'),
		);
		spy.mockRestore();
	});
});
