/**
 * Splits a path string into its keys, or returns `null` if the path is
 * malformed.
 *
 * Supported syntax:
 *  - dot segments:        `a.b.c`
 *  - bracket indices:     `a[0].b`
 *  - quoted bracket keys: `a["b.c"]`, `a['b']` (backslash escapes the quote)
 *  - escaped characters:  `a\.b` is the single key `a.b`
 *
 * Empty segments (`""`, `"a..b"`, `"a."`, `".a"`, `"a[]"`) are malformed
 * rather than silently skipped.
 */
export function parsePath(path: string): string[] | null {
	const keys: string[] = [];
	let current = "";
	let hasCurrent = false;
	// True right after a "." until the next segment starts.
	let needSegment = false;
	// True right after a "]" — only ".", "[" or the end may follow.
	let afterBracket = false;

	let i = 0;
	while (i < path.length) {
		const char = path[i];

		if (char === "\\") {
			if (afterBracket || i + 1 >= path.length) return null;
			current += path[i + 1];
			hasCurrent = true;
			needSegment = false;
			i += 2;
		} else if (char === ".") {
			if (!hasCurrent && !afterBracket) return null;
			if (hasCurrent) keys.push(current);
			current = "";
			hasCurrent = false;
			needSegment = true;
			afterBracket = false;
			i++;
		} else if (char === "[") {
			if (needSegment) return null;
			if (hasCurrent) keys.push(current);
			current = "";
			hasCurrent = false;

			const quote = path[i + 1];
			let key = "";
			i++;
			if (quote === '"' || quote === "'") {
				i++;
				let closed = false;
				while (i < path.length) {
					if (path[i] === "\\" && i + 1 < path.length) {
						key += path[i + 1];
						i += 2;
					} else if (path[i] === quote) {
						closed = true;
						i++;
						break;
					} else {
						key += path[i++];
					}
				}
				if (!closed || path[i] !== "]") return null;
				i++;
			} else {
				const end = path.indexOf("]", i);
				if (end === -1) return null;
				key = path.slice(i, end);
				if (key === "") return null;
				i = end + 1;
			}
			keys.push(key);
			afterBracket = true;
		} else {
			if (afterBracket) return null;
			current += char;
			hasCurrent = true;
			needSegment = false;
			i++;
		}
	}

	if (needSegment) return null;
	if (hasCurrent) keys.push(current);
	return keys.length > 0 ? keys : null;
}
