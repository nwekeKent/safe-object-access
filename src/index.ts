import { getPathKeys } from "./path-cache";

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
				[K in keyof U & (string | number)]: `${K}` | `${K}.${Path<U[K], Prev[D]>}`;
		  }[keyof U & (string | number)]
	: never;

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
export type ValidPath<T, P extends string> = NormalizePath<P> extends Path<T>
	? P
	: never;

/** Removes the values the default replaces: `undefined`, plus `null` if opted in. */
export type Resolved<V, O extends SafeGetOptions> = O extends {
	treatNullAsMissing: true;
}
	? Exclude<V, undefined | null>
	: Exclude<V, undefined>;

// Dot-notation paths (autocomplete).
export function safeGet<
	T,
	P extends string & Path<T>,
	O extends SafeGetOptions = SafeGetOptions
>(
	obj: T,
	path: P,
	defaultValue: Resolved<PathValue<T, P>, O>,
	options?: O
): Resolved<PathValue<T, P>, O>;

export function safeGet<T, P extends string & Path<T>>(
	obj: T,
	path: P,
	defaultValue?: undefined,
	options?: SafeGetOptions
): PathValue<T, P> | undefined;

// Paths using bracket notation, validated against `T`.
export function safeGet<
	T,
	P extends string,
	O extends SafeGetOptions = SafeGetOptions
>(
	obj: T,
	path: ValidPath<T, P>,
	defaultValue: Resolved<PathValue<T, NormalizePath<P>>, O>,
	options?: O
): Resolved<PathValue<T, NormalizePath<P>>, O>;

export function safeGet<T, P extends string>(
	obj: T,
	path: ValidPath<T, P>,
	defaultValue?: undefined,
	options?: SafeGetOptions
): PathValue<T, NormalizePath<P>> | undefined;

// Dynamic (non-literal) paths cannot be checked at compile time.
export function safeGet<P extends string>(
	obj: any,
	path: string extends P ? P : never,
	defaultValue?: any,
	options?: SafeGetOptions
): any;

export function safeGet(
	obj: any,
	path: string,
	defaultValue?: any,
	options: SafeGetOptions = {}
) {
	if (!obj || typeof obj !== "object") {
		if (options.debug) {
			console.warn(`[safeGet] Target object is not an object:`, obj);
		}
		return defaultValue;
	}

	const keys = typeof path === "string" ? getPathKeys(path) : null;

	if (keys === null) {
		if (options.debug) {
			console.warn(`[safeGet] Malformed path:`, path);
		}
		return defaultValue;
	}

	let current: any = obj;

	for (const key of keys) {
		if (
			current === null ||
			current === undefined ||
			typeof current !== "object"
		) {
			if (options.debug) {
				console.warn(
					`[safeGet] Stopped at key "${key}" because current value is`,
					current
				);
			}
			return defaultValue;
		}

		if (Object.hasOwn(current, key)) {
			current = current[key];
		} else {
			if (options.debug) {
				console.warn(`[safeGet] Key "${key}" does not exist on object.`);
			}
			return defaultValue;
		}
	}

	if (current === undefined) {
		return defaultValue;
	}

	if (current === null && options.treatNullAsMissing) {
		return defaultValue;
	}

	if (current === "" && options.treatEmptyStringAsMissing) {
		return defaultValue;
	}

	return current;
}
