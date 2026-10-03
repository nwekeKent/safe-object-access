import { describe, it, expect, beforeEach } from "vitest";
import {
	MAX_CACHE_SIZE,
	clearPathCache,
	getPathKeys,
	pathCacheSize,
} from "./path-cache";
import { safeGet } from "./index";

describe("path cache", () => {
	beforeEach(() => clearPathCache());

	it("returns the same parsed result on repeated calls", () => {
		const first = getPathKeys("a.b");
		expect(first).toEqual(["a", "b"]);
		expect(getPathKeys("a.b")).toBe(first);
		expect(pathCacheSize()).toBe(1);
	});

	it("caches malformed paths as null", () => {
		expect(getPathKeys("a..b")).toBeNull();
		expect(getPathKeys("a..b")).toBeNull();
		expect(pathCacheSize()).toBe(1);
	});

	it("never grows beyond the maximum size", () => {
		for (let i = 0; i < MAX_CACHE_SIZE * 3; i++) {
			safeGet({ a: 1 }, `items.${i}.name`);
		}
		expect(pathCacheSize()).toBe(MAX_CACHE_SIZE);
	});

	it("evicts the least recently used entry", () => {
		const first = getPathKeys("keep");
		for (let i = 0; i < MAX_CACHE_SIZE - 1; i++) getPathKeys(`p${i}`);
		getPathKeys("keep"); // refresh
		getPathKeys("overflow"); // evicts p0, not "keep"
		expect(getPathKeys("keep")).toBe(first);
		expect(pathCacheSize()).toBe(MAX_CACHE_SIZE);
	});
});
