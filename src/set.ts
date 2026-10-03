import { getPathKeys } from "./path-cache";
import { resolvePath } from "./resolve";

/** Thrown by `safeSet` when the assignment is unsafe or impossible. */
export class SafeSetError extends Error {
	readonly path: string;

	constructor(path: string, reason: string) {
		super(`[safeSet] Cannot set "${path}": ${reason}`);
		this.name = "SafeSetError";
		this.path = path;
	}
}

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const INDEX = /^(0|[1-9]\d*)$/;

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function clone(node: Record<string, unknown>, path: string): any {
	if (Array.isArray(node)) return node.slice();
	const proto = Object.getPrototypeOf(node);
	if (proto !== Object.prototype && proto !== null) {
		throw new SafeSetError(
			path,
			"cannot copy a non-plain object (class instance, Date, Map, ...)",
		);
	}
	return Object.assign(Object.create(proto), node);
}

function assign(
	node: Record<string, unknown>,
	keys: readonly string[],
	i: number,
	value: unknown,
	path: string,
): unknown {
	const key = keys[i];

	if (FORBIDDEN_KEYS.has(key)) {
		throw new SafeSetError(path, `the key "${key}" is not allowed`);
	}

	if (Array.isArray(node)) {
		if (!INDEX.test(key)) {
			throw new SafeSetError(path, `"${key}" is not an array index`);
		}
		if (Number(key) > node.length) {
			throw new SafeSetError(
				path,
				`index ${key} would leave gaps in an array of length ${node.length}`,
			);
		}
	}

	const copy = clone(node, path);

	if (i === keys.length - 1) {
		copy[key] = value;
		return copy;
	}

	const child = Object.hasOwn(node, key) ? node[key] : undefined;
	let next: Record<string, unknown>;
	if (child === undefined || child === null) {
		next = INDEX.test(keys[i + 1]) ? ([] as any) : {};
	} else if (isObject(child)) {
		next = child;
	} else {
		throw new SafeSetError(
			path,
			`"${key}" holds a ${typeof child}, which cannot contain "${keys[i + 1]}"`,
		);
	}

	copy[key] = assign(next, keys, i + 1, value, path);
	return copy;
}

/**
 * Immutable set: returns a copy of `obj` with `value` at `path`, sharing every
 * untouched branch with the original. Returns `obj` itself when the value is
 * already there. Throws `SafeSetError` for unsafe or impossible assignments.
 */
export function setPath<T>(obj: T, path: string, value: unknown): T {
	const keys = typeof path === "string" ? getPathKeys(path) : null;
	if (keys === null) throw new SafeSetError(String(path), "malformed path");
	if (!isObject(obj)) {
		throw new SafeSetError(path, "target is not an object");
	}

	const existing = resolvePath(obj, path);
	if (existing.found && Object.is(existing.value, value)) return obj;

	return assign(obj, keys, 0, value, path) as T;
}
