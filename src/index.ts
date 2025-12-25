type Primitive = string | number | boolean | null | undefined | symbol | Date;

export type Path<T> = T extends Primitive
	? never
	: T extends Array<infer U>
	? `${number}` | `${number}.${Path<U>}`
	: {
			[K in keyof T]: K extends string
				? T[K] extends Primitive
					? `${K}`
					: `${K}` | `${K}.${Path<T[K]>}`
				: never;
	  }[keyof T];

export type PathValue<
	T,
	P extends Path<T>
> = P extends `${infer Key}.${infer Rest}`
	? Key extends keyof T
		? Rest extends Path<T[Key]>
			? PathValue<T[Key], Rest>
			: never
		: T extends Array<infer U>
		? PathValue<U, Rest & Path<U>>
		: never
	: P extends keyof T
	? T[P]
	: never;

export interface SafeGetOptions {
	treatNullAsMissing?: boolean;
	treatEmptyStringAsMissing?: boolean;
	debug?: boolean;
}

const pathCache = new Map<string, string[]>();

export function safeGet<T, P extends Path<T>>(
	obj: T,
	path: P,
	defaultValue: PathValue<T, P>,
	options?: SafeGetOptions
): PathValue<T, P>;

export function safeGet<T, P extends Path<T>>(
	obj: T,
	path: P,
	defaultValue?: undefined,
	options?: SafeGetOptions
): PathValue<T, P> | undefined;

export function safeGet(
	obj: any,
	path: string,
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

	let keys = pathCache.get(path);
	if (!keys) {
		keys = path
			.replace(/\[/g, ".")
			.replace(/['"\]]/g, "")
			.split(".")
			.filter(Boolean);
		pathCache.set(path, keys);
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
