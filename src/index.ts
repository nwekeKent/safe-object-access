import { lookupValue, resolvePath, warn } from "./resolve";

type Primitive =
	| string
	| number
	| boolean
	| bigint
	| null
	| undefined
	| symbol
	| Date
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	| Function;

/** Lookup table used to count recursion depth down to `never`. */
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Maximum nesting depth for which paths are generated. */
type MaxDepth = 10;

/**
 * All valid dot-notation paths into `T`. Optional and nullable properties are
 * traversed, and recursion stops after `MaxDepth` levels so recursive types
 * (e.g. tree nodes) don't blow up the compiler.
 */
export type Path<T, D extends number = MaxDepth> = [D] extends [never]
	? never
	: NonNullable<T> extends infer U
		? U extends Primitive
			? never
			: U extends readonly (infer E)[]
				? `${number}` | `${number}.${Path<E, Prev[D]>}`
				: {
						[K in PathKeys<U>]: `${K}` | `${K}.${Path<U[K], Prev[D]>}`;
					}[PathKeys<U>]
		: never;

/**
 * Keys of `U` usable in a dot path. Keys containing a dot cannot be written
 * as typed paths (they are reachable with a dynamic `a["x.y"]` path).
 */
type PathKeys<U> = {
	[K in keyof U & (string | number)]: `${K}` extends `${string}.${string}`
		? never
		: K;
}[keyof U & (string | number)];

/** Converts bracket notation (`a[0].b`) into dot notation (`a.0.b`). */
export type NormalizePath<P extends string> =
	P extends `${infer Head}[${infer Index}]${infer Tail}`
		? NormalizePath<`${Head}.${Index}${Tail}`> extends infer R extends string
			? R extends `.${infer Rest}`
				? Rest
				: R
			: never
		: P;

/**
 * The type found at dot-notation path `P` inside `T`. Optional and nullable
 * links in the chain contribute `undefined` (or `null`) to the result.
 */
export type PathValue<T, P extends string> = T extends unknown
	? P extends `${infer Key}.${infer Rest}`
		? Step<T, Key> extends infer Next
			? PathValue<Next, Rest>
			: never
		: Step<T, P>
	: never;

/** One traversal step: the type of `T[Key]`, or `undefined` if `T` is nullish. */
type Step<T, Key extends string> = T extends null | undefined
	? undefined
	: T extends readonly (infer E)[]
		? Key extends `${number}`
			? E | undefined
			: never
		: Key extends keyof T
			? T[Key]
			: Key extends `${infer N extends number}`
				? N extends keyof T
					? T[N]
					: never
				: never;

export interface SafeGetOptions {
	treatNullAsMissing?: boolean;
	treatEmptyStringAsMissing?: boolean;
	debug?: boolean;
	/**
	 * Runtime check applied to the resolved value. When it returns `false` the
	 * default value is returned instead. Use a type guard to narrow the
	 * result type.
	 */
	guard?: (value: unknown) => boolean;
}

/** `SafeGetOptions` with a type guard, which narrows the result type. */
export type GuardedOptions<G> = SafeGetOptions & {
	guard: (value: unknown) => value is G;
};

/** `P` if it names a valid path into `T` (dot or bracket notation), else `never`. */
export type ValidPath<T, P extends string> =
	NormalizePath<P> extends Path<T> ? P : never;

/** Removes the values the default replaces: `undefined`, plus `null` if opted in. */
export type Resolved<V, O extends SafeGetOptions> = O extends {
	treatNullAsMissing: true;
}
	? Exclude<V, undefined | null>
	: Exclude<V, undefined>;

export interface SafeHasOptions {
	debug?: boolean;
}

// Guarded lookups: the result is narrowed to the guard's type.
export function safeGet<T, P extends string, G>(
	obj: T,
	path: ValidPath<T, P>,
	defaultValue: G,
	options: GuardedOptions<G>,
): G;

export function safeGet<T, P extends string, G>(
	obj: T,
	path: ValidPath<T, P>,
	defaultValue: undefined,
	options: GuardedOptions<G>,
): G | undefined;

// Dot-notation paths (autocomplete).
export function safeGet<
	T,
	P extends string & Path<T>,
	O extends SafeGetOptions = SafeGetOptions,
>(
	obj: T,
	path: P,
	defaultValue: Resolved<PathValue<T, P>, O>,
	options?: O,
): Resolved<PathValue<T, P>, O>;

export function safeGet<T, P extends string & Path<T>>(
	obj: T,
	path: P,
	defaultValue?: undefined,
	options?: SafeGetOptions,
): PathValue<T, P> | undefined;

// Paths using bracket notation, validated against `T`.
export function safeGet<
	T,
	P extends string,
	O extends SafeGetOptions = SafeGetOptions,
>(
	obj: T,
	path: ValidPath<T, P>,
	defaultValue: Resolved<PathValue<T, NormalizePath<P>>, O>,
	options?: O,
): Resolved<PathValue<T, NormalizePath<P>>, O>;

export function safeGet<T, P extends string>(
	obj: T,
	path: ValidPath<T, P>,
	defaultValue?: undefined,
	options?: SafeGetOptions,
): PathValue<T, NormalizePath<P>> | undefined;

// Dynamic (non-literal) paths cannot be checked at compile time.
export function safeGet<P extends string>(
	obj: any,
	path: string extends P ? P : never,
	defaultValue?: any,
	options?: SafeGetOptions,
): any;

export function safeGet(
	obj: any,
	path: string,
	defaultValue?: any,
	options: SafeGetOptions = {},
) {
	const result = lookupValue(obj, path, options);
	if (result.found) return result.value;
	if (options.debug && !result.quiet) warn("safeGet", result);
	return defaultValue;
}

// Dot-notation paths (autocomplete).
export function safeHas<T, P extends string & Path<T>>(
	obj: T,
	path: P,
	options?: SafeHasOptions,
): boolean;

// Paths using bracket notation, validated against `T`.
export function safeHas<T, P extends string>(
	obj: T,
	path: ValidPath<T, P>,
	options?: SafeHasOptions,
): boolean;

// Dynamic (non-literal) paths cannot be checked at compile time.
export function safeHas<P extends string>(
	obj: any,
	path: string extends P ? P : never,
	options?: SafeHasOptions,
): boolean;

/**
 * Returns `true` when every key in `path` exists as an own property, even if
 * the value is `undefined` or `null`. Unlike `safeGet`, this distinguishes a
 * missing key from a key explicitly set to `undefined`.
 */
export function safeHas(
	obj: any,
	path: string,
	options: SafeHasOptions = {},
): boolean {
	const resolution = resolvePath(obj, path);
	if (!resolution.found && options.debug) warn("safeHas", resolution);
	return resolution.found;
}

/** Thrown by `safeGetOrThrow` when the path does not resolve to a usable value. */
export class SafeGetError extends Error {
	readonly path: string;

	constructor(path: string, reason: string) {
		super(`[safeGetOrThrow] Cannot resolve "${path}": ${reason}`);
		this.name = "SafeGetError";
		this.path = path;
	}
}

// Guarded lookups: the result is narrowed to the guard's type.
export function safeGetOrThrow<T, P extends string, G>(
	obj: T,
	path: ValidPath<T, P>,
	options: GuardedOptions<G>,
): G;

export function safeGetOrThrow<
	T,
	P extends string,
	O extends SafeGetOptions = SafeGetOptions,
>(
	obj: T,
	path: ValidPath<T, P>,
	options?: O,
): Resolved<PathValue<T, NormalizePath<P>>, O>;

// Dynamic (non-literal) paths cannot be checked at compile time.
export function safeGetOrThrow<P extends string>(
	obj: any,
	path: string extends P ? P : never,
	options?: SafeGetOptions,
): any;

/**
 * Like `safeGet`, but throws a `SafeGetError` instead of returning a default
 * when the path is missing or the value is unusable (`undefined`, opted-in
 * `null`/`""`, or rejected by `guard`). The return type never includes
 * `undefined`.
 */
export function safeGetOrThrow(
	obj: any,
	path: string,
	options: SafeGetOptions = {},
) {
	const result = lookupValue(obj, path, options);
	if (result.found) return result.value;
	const detail = "detail" in result ? ` ${describe(result.detail)}` : "";
	throw new SafeGetError(String(path), `${result.reason}${detail}`);
}

function describe(value: unknown): string {
	try {
		return typeof value === "string" ? JSON.stringify(value) : String(value);
	} catch {
		return Object.prototype.toString.call(value);
	}
}
