import { describe, it, expectTypeOf } from "vitest";
import { safeGet, type Path, type PathValue } from "./index";

interface Node {
	id: number;
	opt?: { a: string; b?: { c: number } };
	children: Node[];
	nul: { x: 1 } | null;
	m: Record<string, { v: boolean }>;
	tup: [string, { z: 1 }];
	theme: "dark" | "light";
	bio: string | null;
	createdAt: Date;
}

const n = {} as Node;
const dynamicPath = "id" as string;

describe("types", () => {
	it("infers the value type, adding undefined without a default", () => {
		expectTypeOf(safeGet(n, "id")).toEqualTypeOf<number | undefined>();
		expectTypeOf(safeGet(n, "theme")).toEqualTypeOf<
			"dark" | "light" | undefined
		>();
	});

	it("removes undefined when a default is given", () => {
		expectTypeOf(safeGet(n, "theme", "light")).toEqualTypeOf<
			"dark" | "light"
		>();
		expectTypeOf(safeGet(n, "opt.b.c", 0)).toEqualTypeOf<number>();
	});

	it("traverses optional and nullable properties", () => {
		expectTypeOf(safeGet(n, "opt.b.c")).toEqualTypeOf<number | undefined>();
		expectTypeOf(safeGet(n, "nul.x")).toEqualTypeOf<1 | undefined>();
	});

	it("supports recursive types without hitting the compiler limit", () => {
		expectTypeOf(safeGet(n, "children.0.children.0.id", 1)).toEqualTypeOf<number>();
	});

	it("supports records and tuples", () => {
		expectTypeOf(safeGet(n, "m.anything.v", false)).toEqualTypeOf<boolean>();
		expectTypeOf(safeGet(n, "tup.1.z")).toEqualTypeOf<1 | undefined>();
	});

	it("does not descend into Date", () => {
		expectTypeOf(safeGet(n, "createdAt")).toEqualTypeOf<Date | undefined>();
		// @ts-expect-error Date internals are not paths
		safeGet(n, "createdAt.getTime");
	});

	it("validates bracket-notation paths", () => {
		expectTypeOf(safeGet(n, "children[0].id", 1)).toEqualTypeOf<number>();
		expectTypeOf(safeGet(n, "children[0].children[1].id")).toEqualTypeOf<
			number | undefined
		>();
		// @ts-expect-error unknown key after a bracket
		safeGet(n, "children[0].idd");
	});

	it("honours treatNullAsMissing in the return type", () => {
		expectTypeOf(
			safeGet(n, "bio", "none", { treatNullAsMissing: true })
		).toEqualTypeOf<string>();
		expectTypeOf(safeGet(n, "bio", null)).toEqualTypeOf<string | null>();
	});

	it("rejects typos and mismatched defaults", () => {
		// @ts-expect-error unknown path
		safeGet(n, "idd");
		// @ts-expect-error default must match the value type
		safeGet(n, "id", "x");
	});

	it("allows dynamic string paths as an escape hatch", () => {
		expectTypeOf(safeGet(n, dynamicPath)).toBeAny();
	});

	it("exposes Path and PathValue", () => {
		expectTypeOf<Path<{ a: { b: 1 } }>>().toEqualTypeOf<"a" | "a.b">();
		expectTypeOf<PathValue<{ a: { b: 1 } }, "a.b">>().toEqualTypeOf<1>();
	});
});
