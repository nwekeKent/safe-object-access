import { describe, it, expect, expectTypeOf, vi } from "vitest";
import { safeGet } from "./index";

const isString = (v: unknown): v is string => typeof v === "string";
const isNumber = (v: unknown): v is number => typeof v === "number";

interface Payload {
	user: { name?: unknown; age?: unknown; tags: unknown[] };
}
const payload: Payload = { user: { name: "Alice", age: "41", tags: ["a"] } };

describe("guard option", () => {
	it("returns the value when the guard passes", () => {
		expect(safeGet(payload, "user.name", "anon", { guard: isString })).toBe(
			"Alice",
		);
	});

	it("returns the default when the guard fails", () => {
		expect(safeGet(payload, "user.age", 0, { guard: isNumber })).toBe(0);
	});

	it("returns undefined without a default when the guard fails", () => {
		expect(
			safeGet(payload, "user.age", undefined, { guard: isNumber }),
		).toBeUndefined();
	});

	it("does not call the guard for missing values", () => {
		const guard = vi.fn(isString);
		safeGet(payload, "user.nope" as any, "D", { guard });
		expect(guard).not.toHaveBeenCalled();
	});

	it("works with bracket paths", () => {
		expect(safeGet(payload, "user.tags[0]", "D", { guard: isString })).toBe(
			"a",
		);
	});

	it("applies after treatNullAsMissing", () => {
		const data = { v: null as unknown };
		expect(
			safeGet(data, "v", "D", { guard: isString, treatNullAsMissing: true }),
		).toBe("D");
	});

	it("accepts plain boolean predicates", () => {
		const nonEmpty = (v: unknown) => Array.isArray(v) && v.length > 0;
		expect(safeGet(payload, "user.tags", ["x"], { guard: nonEmpty })).toEqual([
			"a",
		]);
	});

	it("warns in debug mode when rejected", () => {
		const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
		safeGet(payload, "user.age", 0, { guard: isNumber, debug: true });
		expect(spy).toHaveBeenCalledWith(
			expect.stringContaining('Guard rejected value at "user.age"'),
			"41",
		);
		spy.mockRestore();
	});

	it("narrows the result type", () => {
		const name = safeGet(payload, "user.name", "anon", { guard: isString });
		expectTypeOf(name).toEqualTypeOf<string>();
		const age = safeGet(payload, "user.age", undefined, { guard: isNumber });
		expectTypeOf(age).toEqualTypeOf<number | undefined>();
		// @ts-expect-error unknown path is still rejected
		safeGet(payload, "user.nope", "D", { guard: isString });
	});
});
