import { describe, it, expect, vi } from "vitest";
import { safeGet as typedSafeGet, type SafeGetOptions } from "./index";

// These tests exercise runtime behaviour with deliberately invalid or dynamic
// paths, so they use an untyped view of the function. Compile-time behaviour
// is covered in types.test.ts.
const safeGet = typedSafeGet as (
	obj: any,
	path: string,
	defaultValue?: any,
	options?: SafeGetOptions
) => any;

describe("safeGet", () => {
	const testObj = {
		user: {
			id: 1,
			profile: {
				name: "Alice",
				settings: {
					theme: "dark",
					notifications: true,
				},
			},
			tags: ["admin", "editor"],
		},
		meta: null,
	};

	it("accesses a top-level property", () => {
		expect(safeGet(testObj, "user")).toEqual(testObj.user);
		expect(safeGet(testObj, "user.id")).toBe(1);
	});

	it("accesses deeply nested properties", () => {
		expect(safeGet(testObj, "user.profile.name")).toBe("Alice");
		expect(safeGet(testObj, "user.profile.settings.theme")).toBe("dark");
		expect(safeGet(testObj, "user.profile.settings.notifications")).toBe(true);
	});

	it("returns undefined for missing intermediate keys", () => {
		expect(safeGet(testObj, "user.address.city")).toBeUndefined();
		expect(safeGet(testObj, "user.profile.age")).toBeUndefined();
	});

	it("returns the default value when a key is missing", () => {
		expect(safeGet(testObj, "user.address.city", "Unknown")).toBe("Unknown");
		expect(safeGet(testObj, "user.profile.age", 18)).toBe(18);
	});

	it("handles array access using dot notation", () => {
		expect(safeGet(testObj, "user.tags.0")).toBe("admin");
		expect(safeGet(testObj, "user.tags.1")).toBe("editor");
		expect(safeGet(testObj, "user.tags.2")).toBeUndefined();
	});

	it("handles array access using bracket notation", () => {
		expect(safeGet(testObj, "user.tags[0]")).toBe("admin");
		expect(safeGet(testObj, "user.tags[1]")).toBe("editor");
		expect(safeGet(testObj, "user.tags[2]")).toBeUndefined();
	});

	it("returns default value if the starting object is not an object", () => {
		expect(safeGet(null, "a.b", "default")).toBe("default");
		expect(safeGet(undefined, "a.b", "default")).toBe("default");
		expect(safeGet("string" as any, "a.b", "default")).toBe("default");
		expect(safeGet(42 as any, "a.b", "default")).toBe("default");
	});

	it("stops traversal when encountering null intermediates", () => {
		// meta is null
		expect(safeGet(testObj, "meta.foo")).toBeUndefined();
		expect(safeGet(testObj, "meta.foo", "fallback")).toBe("fallback");
	});

	it("does not allow prototype property access", () => {
		expect(safeGet(testObj, "__proto__")).toBeUndefined();
		expect(safeGet(testObj, "constructor")).toBeUndefined();
		expect(safeGet(testObj, "toString")).toBeUndefined();
	});

	it("returns undefined when the resolved value itself is undefined", () => {
		const obj = { a: { b: undefined } };
		expect(safeGet(obj, "a.b")).toBeUndefined();
		expect(safeGet(obj, "a.b", "fallback")).toBe("fallback");
	});

	describe("treatNullAsMissing option", () => {
		const obj = { user: { bio: null } };

		it("returns null by default when value is null", () => {
			expect(safeGet(obj, "user.bio", "default")).toBeNull();
		});

		it("returns default value when treatNullAsMissing is true", () => {
			expect(
				safeGet(obj, "user.bio", "default", { treatNullAsMissing: true })
			).toBe("default");
		});
	});

	describe("treatEmptyStringAsMissing option", () => {
		const obj = { user: { bio: "" } };

		it("returns empty string by default when value is empty string", () => {
			expect(safeGet(obj, "user.bio", "default")).toBe("");
		});

		it("returns default value when treatEmptyStringAsMissing is true", () => {
			expect(
				safeGet(obj, "user.bio", "default", { treatEmptyStringAsMissing: true })
			).toBe("default");
		});
	});

	describe("debug option", () => {
		it("warns when target is not an object", () => {
			const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
			safeGet(null, "a.b", "default", { debug: true });
			expect(spy).toHaveBeenCalledWith(
				expect.stringContaining("Target object is not an object"),
				null
			);
			spy.mockRestore();
		});

		it("warns when traversal stops early", () => {
			const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const obj = { a: null };
			safeGet(obj, "a.b", "default", { debug: true });
			expect(spy).toHaveBeenCalledWith(
				expect.stringContaining('Stopped at key "b"'),
				null
			);
			spy.mockRestore();
		});

		it("warns when key does not exist", () => {
			const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const obj = { a: {} };
			safeGet(obj, "a.b", "default", { debug: true });
			expect(spy).toHaveBeenCalledWith(
				expect.stringContaining('Key "b" does not exist')
			);
			spy.mockRestore();
		});
	});

	describe("path syntax", () => {
		const obj = { a: { "b.c": 1, "": 5, "it's": 2 }, list: [[1, 2]] };

		it("reaches keys containing dots via escapes or quoted brackets", () => {
			expect(safeGet(obj, "a.b\\.c", "D")).toBe(1);
			expect(safeGet(obj, 'a["b.c"]', "D")).toBe(1);
			expect(safeGet(obj, "a['it\\'s']", "D")).toBe(2);
		});

		it("reaches empty-string keys only via quoted brackets", () => {
			expect(safeGet(obj, "a['']", "D")).toBe(5);
			expect(safeGet(obj, "a.", "D")).toBe("D");
		});

		it("returns the default for malformed paths", () => {
			expect(safeGet(obj, "", "D")).toBe("D");
			expect(safeGet(obj, "a..b", "D")).toBe("D");
			expect(safeGet(obj, "list[0", "D")).toBe("D");
		});

		it("warns about malformed paths in debug mode", () => {
			const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
			safeGet(obj, "a..b", "D", { debug: true });
			expect(spy).toHaveBeenCalledWith(
				expect.stringContaining("Malformed path"),
				"a..b"
			);
			spy.mockRestore();
		});

		it("handles nested arrays", () => {
			expect(safeGet(obj, "list[0][1]")).toBe(2);
			expect(safeGet(obj, "list.0.1")).toBe(2);
		});
	});

	describe("prototype safety", () => {
		const obj = { a: { b: 1 } };

		it.each([
			"__proto__",
			"__proto__.polluted",
			"constructor",
			"constructor.prototype",
			"a.__proto__",
			"a.constructor.name",
			"a['__proto__']",
			"toString",
			"hasOwnProperty",
		])("does not resolve %s", (path) => {
			expect(safeGet(obj, path, "D")).toBe("D");
		});

		it("never mutates Object.prototype", () => {
			safeGet(obj, "__proto__.polluted", "D");
			expect(({} as any).polluted).toBeUndefined();
		});

		it("still reads own properties that shadow prototype names", () => {
			const shadow = { constructor: "mine", toString: 1 };
			expect(safeGet(shadow, "constructor")).toBe("mine");
			expect(safeGet(shadow, "toString")).toBe(1);
		});

		it("works on null-prototype objects", () => {
			const bare = Object.assign(Object.create(null), { x: { y: 2 } });
			expect(safeGet(bare, "x.y")).toBe(2);
		});
	});

	describe("non-plain values", () => {
		it("does not traverse into functions, strings or Dates", () => {
			const obj = { fn: () => 1, str: "abc", date: new Date(0) };
			expect(safeGet(obj, "fn.name", "D")).toBe("D");
			expect(safeGet(obj, "str.length", "D")).toBe("D");
			expect(safeGet(obj, "str.0", "D")).toBe("D");
			expect(safeGet(obj, "date.getTime", "D")).toBe("D");
		});

		it("returns such values when they are the target", () => {
			const date = new Date(0);
			expect(safeGet({ date }, "date")).toBe(date);
			expect(safeGet({ list: [1] }, "list.length")).toBe(1);
		});

		it("does not read inherited class members", () => {
			class User {
				name = "own";
				get upper() {
					return "GETTER";
				}
			}
			expect(safeGet(new User(), "name")).toBe("own");
			expect(safeGet(new User(), "upper", "D")).toBe("D");
		});

		it("returns the default for non-string paths", () => {
			expect(safeGet({ a: 1 }, undefined as any, "D")).toBe("D");
			expect(safeGet({ a: 1 }, 5 as any, "D")).toBe("D");
		});
	});

	describe("options combined", () => {
		const obj = { a: null, b: "", c: 0, d: false };

		it("treats other falsy values as present", () => {
			const opts = { treatNullAsMissing: true, treatEmptyStringAsMissing: true };
			expect(safeGet(obj, "c", "D", opts)).toBe(0);
			expect(safeGet(obj, "d", "D", opts)).toBe(false);
		});

		it("applies both flags together", () => {
			const opts = { treatNullAsMissing: true, treatEmptyStringAsMissing: true };
			expect(safeGet(obj, "a", "D", opts)).toBe("D");
			expect(safeGet(obj, "b", "D", opts)).toBe("D");
		});

		it("does not warn when debug is off", () => {
			const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
			safeGet(obj, "x.y", "D");
			safeGet(null, "x", "D");
			expect(spy).not.toHaveBeenCalled();
			spy.mockRestore();
		});
	});
});
