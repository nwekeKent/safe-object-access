import { describe, it, expect, expectTypeOf } from "vitest";
import { safeGetOrThrow, SafeGetError } from "./index";

const isString = (v: unknown): v is string => typeof v === "string";
const get = safeGetOrThrow as (obj: any, path: string, options?: any) => any;

interface Config {
	db: { host?: string; port: number; pass: string | null; name: string };
	list: number[];
}
const config: Config = {
	db: { port: 5432, pass: null, name: "" },
	list: [1],
};

describe("safeGetOrThrow", () => {
	it("returns the value when present", () => {
		expect(safeGetOrThrow(config, "db.port")).toBe(5432);
		expect(safeGetOrThrow(config, "list[0]")).toBe(1);
	});

	it("returns falsy values that are not opted into", () => {
		expect(safeGetOrThrow(config, "db.pass")).toBeNull();
		expect(safeGetOrThrow(config, "db.name")).toBe("");
	});

	it("throws a SafeGetError for a missing value", () => {
		expect(() => safeGetOrThrow(config, "db.host")).toThrow(SafeGetError);
		expect(() => safeGetOrThrow(config, "db.host")).toThrow(
			'Cannot resolve "db.host"',
		);
	});

	it("exposes the path on the error", () => {
		try {
			safeGetOrThrow(config, "db.host");
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			expect((error as SafeGetError).path).toBe("db.host");
			expect((error as SafeGetError).name).toBe("SafeGetError");
		}
	});

	it("explains where traversal stopped", () => {
		expect(() => get(config, "db.pass.x")).toThrow(
			'Stopped at key "x" because current value is null',
		);
		expect(() => get(config, "db.nope.x")).toThrow('Key "nope" does not exist');
		expect(() => get(null, "a")).toThrow("Target object is not an object");
		expect(() => get(config, "a..b")).toThrow("Malformed path");
	});

	it("honours treatNullAsMissing and treatEmptyStringAsMissing", () => {
		expect(() =>
			safeGetOrThrow(config, "db.pass", { treatNullAsMissing: true }),
		).toThrow("Value is null");
		expect(() =>
			safeGetOrThrow(config, "db.name", { treatEmptyStringAsMissing: true }),
		).toThrow("Value is an empty string");
	});

	it("throws when the guard rejects the value", () => {
		expect(safeGetOrThrow(config, "db.name", { guard: isString })).toBe("");
		expect(() => get(config, "db.port", { guard: isString })).toThrow(
			"Guard rejected value: 5432",
		);
	});

	it("describes values that cannot be stringified", () => {
		const weird = { v: Object.create(null) };
		expect(() => get(weird, "v.x", { guard: () => false })).not.toThrow(
			TypeError,
		);
		expect(() => get(weird, "v", { guard: () => false })).toThrow(
			"[object Object]",
		);
	});

	it("types the result without undefined", () => {
		// Wrapped in functions: only the types matter, nothing is executed.
		expectTypeOf(() =>
			safeGetOrThrow(config, "db.host"),
		).returns.toEqualTypeOf<string>();
		expectTypeOf(() => safeGetOrThrow(config, "db.pass")).returns.toEqualTypeOf<
			string | null
		>();
		expectTypeOf(() =>
			safeGetOrThrow(config, "db.pass", { treatNullAsMissing: true }),
		).returns.toEqualTypeOf<string>();
		expectTypeOf(() =>
			safeGetOrThrow(config, "db.name", { guard: isString }),
		).returns.toEqualTypeOf<string>();
		// @ts-expect-error unknown path
		() => safeGetOrThrow(config, "db.typo");
	});
});
