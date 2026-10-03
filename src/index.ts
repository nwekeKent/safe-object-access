import { resolvePath, warn } from "./resolve";

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
}

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
	const resolution = resolvePath(obj, path);

	if (!resolution.found) {
		if (options.debug) warn("safeGet", resolution);
		return defaultValue;
	}

	const { value } = resolution;

	if (value === undefined) {
		return defaultValue;
	}

	if (value === null && options.treatNullAsMissing) {
		return defaultValue;
	}

	if (value === "" && options.treatEmptyStringAsMissing) {
		return defaultValue;
	}

	return value;
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
