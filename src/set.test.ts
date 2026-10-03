import { describe, it, expect, expectTypeOf } from "vitest";
import { safeGet, safeSet, SafeSetError } from "./index";

const set = safeSet as (obj: any, path: string, value: unknown) => any;

interface State {
	user: { name: string; tags: string[]; address?: { city: string } };
	items: { id: number }[];
}

const state = (): State => ({
	user: { name: "Alice", tags: ["a", "b"] },
	items: [{ id: 1 }],
});

describe("safeSet", () => {
	it("sets an existing value without mutating the input", () => {
		const before = state();
		const after = safeSet(before, "user.name", "Bob");
		expect(after.user.name).toBe("Bob");
		expect(before.user.name).toBe("Alice");
		expect(after).not.toBe(before);
	});

	it("shares untouched branches with the original", () => {
		const before = state();
		const after = safeSet(before, "user.name", "Bob");
		expect(after.items).toBe(before.items);
		expect(after.user.tags).toBe(before.user.tags);
	});

	it("returns the same object when the value is unchanged", () => {
		const before = state();
		expect(safeSet(before, "user.name", "Alice")).toBe(before);
	});

	it("still sets undefined over a missing key", () => {
		const after = set({ a: {} }, "a.b", undefined);
		expect(Object.hasOwn(after.a, "b")).toBe(true);
	});

	it("supports bracket notation and array indices", () => {
		const after = safeSet(state(), "items[0].id", 5);
		expect(after.items[0].id).toBe(5);
		expect(safeSet(state(), "user.tags.1", "z").user.tags).toEqual(["a", "z"]);
	});

	it("appends to arrays", () => {
		expect(safeSet(state(), "user.tags.2", "c").user.tags).toEqual([
			"a",
			"b",
			"c",
		]);
	});

	it("creates missing intermediates, choosing arrays for index keys", () => {
		expect(safeSet(state(), "user.address.city", "Paris").user.address).toEqual(
			{ city: "Paris" },
		);
		expect(set({}, "a.b.c", 1)).toEqual({ a: { b: { c: 1 } } });
		expect(set({}, "list[0].x", 1)).toEqual({ list: [{ x: 1 }] });
		expect(Array.isArray(set({}, "list.0", 1).list)).toBe(true);
	});

	it("replaces null and undefined intermediates", () => {
		expect(set({ a: null }, "a.b", 1)).toEqual({ a: { b: 1 } });
		expect(set({ a: undefined }, "a.b", 1)).toEqual({ a: { b: 1 } });
	});

	it("reaches keys with dots via quoted brackets", () => {
		expect(set({}, 'a["b.c"]', 1)).toEqual({ a: { "b.c": 1 } });
	});

	it("round-trips with safeGet", () => {
		const after = safeSet(state(), "user.name", "Bob");
		expect(safeGet(after, "user.name")).toBe("Bob");
	});

	it("keeps null-prototype objects", () => {
		const bare = Object.assign(Object.create(null), { a: 1 });
		const after = set(bare, "a", 2);
		expect(Object.getPrototypeOf(after)).toBeNull();
		expect(after.a).toBe(2);
	});

	describe("safety", () => {
		it.each([
			"__proto__.polluted",
			"a.__proto__.polluted",
			"constructor.prototype.polluted",
			"a['__proto__'].polluted",
			"a.constructor",
			"a.prototype.x",
			"__proto__",
		])("rejects %s and does not pollute Object.prototype", (path) => {
			expect(() => set({ a: {} }, path, "x")).toThrow(SafeSetError);
			expect(({} as any).polluted).toBeUndefined();
			expect(Object.prototype).not.toHaveProperty("polluted");
		});

		it("rejects malformed paths and non-object targets", () => {
			expect(() => set({}, "", 1)).toThrow("malformed path");
			expect(() => set({}, "a..b", 1)).toThrow("malformed path");
			expect(() => set(null, "a", 1)).toThrow("target is not an object");
			expect(() => set("str", "a", 1)).toThrow("target is not an object");
			expect(() => set({}, 5 as any, 1)).toThrow("malformed path");
		});

		it("refuses to overwrite a primitive intermediate", () => {
			expect(() => set({ a: "text" }, "a.b", 1)).toThrow('"a" holds a string');
			expect(() => set({ a: 1 }, "a.b", 1)).toThrow("holds a number");
		});

		it("refuses array gaps and non-index keys", () => {
			expect(() => set({ a: [1] }, "a.5", 1)).toThrow("would leave gaps");
			expect(() => set({ a: [1] }, "a.4294967294", 1)).toThrow("gaps");
			expect(() => set({ a: [1] }, "a.foo", 1)).toThrow("not an array index");
			expect(() => set({ a: [1] }, "a.length", 0)).toThrow(
				"not an array index",
			);
			// A missing container with an index key becomes an array, so no gaps there either.
			expect(() => set({}, "a.5", 1)).toThrow("gaps");
			expect(() => set({}, "a.0", 1)).not.toThrow();
		});

		it("refuses to copy class instances, Dates and Maps", () => {
			class Box {
				v = 1;
			}
			expect(() => set({ box: new Box() }, "box.v", 2)).toThrow(
				"non-plain object",
			);
			expect(() => set({ d: new Date() }, "d.x", 2)).toThrow("non-plain");
			expect(() => set(new Map(), "a", 2)).toThrow("non-plain");
		});

		it("includes the path on the error", () => {
			try {
				set({}, "a..b", 1);
				expect.unreachable();
			} catch (error) {
				expect((error as SafeSetError).path).toBe("a..b");
				expect((error as SafeSetError).name).toBe("SafeSetError");
			}
		});
	});

	it("is typed against the object and value", () => {
		const s = state();
		expectTypeOf(safeSet(s, "user.name", "x")).toEqualTypeOf<State>();
		expectTypeOf(safeSet(s, "items[0].id", 1)).toEqualTypeOf<State>();
		// @ts-expect-error wrong value type
		safeSet(s, "user.name", 1);
		// @ts-expect-error unknown path
		safeSet(s, "user.nmae", "x");
		// @ts-expect-error unknown bracket path
		safeSet(s, "items[0].idd", 1);
		const dynamic = "user.name" as string;
		expectTypeOf(safeSet(s, dynamic, 1)).toEqualTypeOf<State>();
	});
});
