import { describe, it, expect, vi } from "vitest";
import { safeGet } from "./index";

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

	describe("memoization", () => {
		it("returns correct value on repeated calls", () => {
			const obj = { a: { b: 1 } };
			// First call (cache miss)
			expect(safeGet(obj, "a.b")).toBe(1);
			// Second call (cache hit)
			expect(safeGet(obj, "a.b")).toBe(1);
		});
	});
});
