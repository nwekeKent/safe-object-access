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

export function safeGet<T, P extends Path<T>>(
	obj: T,
	path: P,
	defaultValue: PathValue<T, P>
): PathValue<T, P>;

export function safeGet<T, P extends Path<T>>(
	obj: T,
	path: P
): PathValue<T, P> | undefined;

export function safeGet(obj: any, path: string, defaultValue?: any): any;

export function safeGet(obj: any, path: string, defaultValue?: any) {
	if (!obj || typeof obj !== "object") {
		return defaultValue;
	}

	const keys = path
		.replace(/\[/g, ".")
		.replace(/['"\]]/g, "")
		.split(".")
		.filter(Boolean);

	let current: any = obj;

	for (const key of keys) {
		if (
			current === null ||
			current === undefined ||
			typeof current !== "object"
		) {
			return defaultValue;
		}

		if (Object.hasOwn(current, key)) {
			current = current[key];
		} else {
			return defaultValue;
		}
	}

	return current === undefined ? defaultValue : current;
}
