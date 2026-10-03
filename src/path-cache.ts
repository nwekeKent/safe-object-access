import { parsePath } from "./parse-path";

export const MAX_CACHE_SIZE = 500;

const cache = new Map<string, readonly string[] | null>();

/**
 * Parses a path, memoizing the result in a bounded LRU cache so dynamic paths
 * (e.g. `items.${id}.name`) cannot grow memory without limit.
 */
export function getPathKeys(path: string): readonly string[] | null {
	const hit = cache.get(path);
	if (hit !== undefined) {
		// Re-insert to mark as most recently used.
		cache.delete(path);
		cache.set(path, hit);
		return hit;
	}

	const keys = parsePath(path);
	if (cache.size >= MAX_CACHE_SIZE) {
		cache.delete(cache.keys().next().value as string);
	}
	cache.set(path, keys);
	return keys;
}

/** Number of cached paths. Exposed for tests. */
export function pathCacheSize(): number {
	return cache.size;
}

export function clearPathCache(): void {
	cache.clear();
}
