// Loads the built package as CJS and ESM and exercises each export.
// Plain CommonJS with no dependencies so it runs on old Node versions.
const assert = require("node:assert");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

function check(m) {
	const obj = { a: { b: 1, list: [1, 2] } };
	assert.strictEqual(m.safeGet(obj, "a.b"), 1);
	assert.strictEqual(m.safeGet(obj, "a.list[1]"), 2);
	assert.strictEqual(m.safeGet(obj, "a.zzz", "D"), "D");
	assert.strictEqual(m.safeHas(obj, "a.b"), true);
	assert.strictEqual(m.safeGetOrThrow(obj, "a.b"), 1);
	assert.throws(() => m.safeGetOrThrow(obj, "a.zzz"), m.SafeGetError);
	const next = m.safeSet(obj, "a.b", 2);
	assert.strictEqual(next.a.b, 2);
	assert.strictEqual(obj.a.b, 1);
	assert.throws(() => m.safeSet(obj, "__proto__.x", 1), m.SafeSetError);
}

check(require("../dist/index.js"));

import(pathToFileURL(path.join(__dirname, "../dist/index.mjs")).href).then(
	(m) => {
		check(m);
		console.log(`smoke ok on Node ${process.version}`);
	},
	(error) => {
		console.error(error);
		process.exit(1);
	},
);
