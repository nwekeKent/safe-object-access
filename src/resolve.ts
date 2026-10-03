import { getPathKeys } from "./path-cache";

export type Resolution =
	| { found: true; value: unknown }
	| {
			found: false;
			reason: string;
			detail?: unknown;
			/** Missing for an expected reason; `debug` mode does not warn. */
			quiet?: boolean;
	  };

export interface LookupOptions {
	treatNullAsMissing?: boolean;
	treatEmptyStringAsMissing?: boolean;
	guard?: (value: unknown) => boolean;
}

/**
 * Walks `path` through own properties of `obj`. A resolution is `found` when
 * every key exists as an own property, even if the value is `undefined`.
 */
export function resolvePath(obj: unknown, path: unknown): Resolution {
	if (!obj || typeof obj !== "object") {
		return {
			found: false,
			reason: "Target object is not an object:",
			detail: obj,
		};
	}

	const keys = typeof path === "string" ? getPathKeys(path) : null;
	if (keys === null) {
		return { found: false, reason: "Malformed path:", detail: path };
	}

	let current: any = obj;
	for (const key of keys) {
		if (
			current === null ||
			current === undefined ||
			typeof current !== "object"
		) {
			return {
				found: false,
				reason: `Stopped at key "${key}" because current value is`,
				detail: current,
			};
		}
		if (!Object.hasOwn(current, key)) {
			return { found: false, reason: `Key "${key}" does not exist on object.` };
		}
		current = current[key];
	}
	return { found: true, value: current };
}

export function warn(
	fn: string,
	resolution: Resolution & { found: false },
): void {
	if ("detail" in resolution) {
		console.warn(`[${fn}] ${resolution.reason}`, resolution.detail);
	} else {
		console.warn(`[${fn}] ${resolution.reason}`);
	}
}

/**
 * `resolvePath` plus the "is this value usable?" rules shared by `safeGet` and
 * `safeGetOrThrow`: `undefined`, opted-in `null`/`""`, and guard failures all
 * count as not found.
 */
export function lookupValue(
	obj: unknown,
	path: unknown,
	options: LookupOptions,
): Resolution {
	const resolution = resolvePath(obj, path);
	if (!resolution.found) return resolution;

	const { value } = resolution;
	if (value === undefined) {
		return { found: false, reason: "Value is undefined.", quiet: true };
	}
	if (value === null && options.treatNullAsMissing) {
		return { found: false, reason: "Value is null.", quiet: true };
	}
	if (value === "" && options.treatEmptyStringAsMissing) {
		return { found: false, reason: "Value is an empty string.", quiet: true };
	}
	if (options.guard && !options.guard(value)) {
		return { found: false, reason: "Guard rejected value:", detail: value };
	}
	return resolution;
}
