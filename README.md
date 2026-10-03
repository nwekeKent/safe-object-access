# safe-object-access

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/badge/GitHub-nwekeKent%2Fsafe--object--access-blue?logo=github)](https://github.com/nwekeKent/safe-object-access)

A robust, **strongly-typed** TypeScript utility for safely accessing deeply nested object properties using string paths.

## Features

- 🔒 **Type-Safe Paths**: TypeScript validates your string paths against the object's shape (autocomplete supported!).
- 🎯 **Return Type Inference**: The return value is automatically typed based on the path (no more `any`).
- 🛡️ **Safe Access**: Prevents crashes when accessing properties on `undefined` or `null`.
- 📦 **Bracket Notation**: Supports both dot notation (`users.0.name`) and bracket notation (`users[0].name`), both validated against your types.
- 🌳 **Optional, Nullable & Recursive Types**: Paths traverse optional/nullable properties and recursive types (depth-capped at 10).
- ⚡️ **High Performance**: Built-in path memoization for lightning-fast repeated access in React render loops.
- 🛠️ **Configurable Fallbacks**: Optionally treat `null` or empty strings as missing values.
- 🔍 **Debug Mode**: Detailed console warnings to pinpoint exactly where path traversal fails.
- 🚫 **Prototype Protection**: Automatically prevents access to `__proto__`, `constructor`, and `prototype` for security.

## Installation

```bash
npm install safe-object-access
```

## Usage

### Basic Usage

```typescript
import { safeGet } from "safe-object-access";

const user = {
	profile: {
		name: "Alice",
		settings: {
			theme: "dark" as "dark" | "light",
		},
	},
	tags: ["admin", "editor"],
};

//  Fully typed string path with autocomplete!
// inferred type: "dark" | "light" | undefined
const theme = safeGet(user, "profile.settings.theme");

//  Supports Array indices (dot or bracket)
// inferred type: string | undefined
const firstTag = safeGet(user, "tags[0]");

// Default values handled correctly
// inferred type: "dark" | "light"
const safeTheme = safeGet(user, "profile.settings.theme", "light");
```

### Advanced Usage

You can pass an optional `options` object as the fourth argument to customize how values are retrieved.

#### Handling `null` or Empty Strings

By default, `safeGet` only uses the default value if the result is `undefined`. Use these flags to handle other "empty" states:

```typescript
const data = { bio: null, draft: "" };

// Treat null as missing
const bio = safeGet(data, "bio", "No bio yet", { treatNullAsMissing: true });

// Treat empty string as missing
const draft = safeGet(data, "draft", "Start typing...", {
	treatEmptyStringAsMissing: true,
});
```

#### Validating Values with `guard`

Data from APIs or a CMS often has the right shape but the wrong type. Pass a `guard` to check the value at runtime; if it fails you get the default instead. A type guard also narrows the result type.

```typescript
const isString = (v: unknown): v is string => typeof v === "string";

// data.user.name is `unknown` or maybe a number at runtime
const name = safeGet(data, "user.name", "anonymous", { guard: isString });
// inferred type: string
```

The guard runs after the `undefined`/`null`/empty-string checks, and is not called for missing paths.

#### Debugging Paths

If a path is returning a default value and you don't know why, enable `debug` mode to see exactly where the traversal stopped in the console.

```typescript
safeGet(user, "profile.addr.city", "N/A", { debug: true });
// Console: [safeGet] Key "addr" does not exist on object.
```

### Usage with React

This library is perfect for React applications where data shapes might be unpredictable or when mapping over keys.

```tsx
import { safeGet } from "safe-object-access";

interface UserData {
	user: {
		details?: {
			bio?: string;
		};
	};
}

const UserBio = ({ data }: { data: UserData }) => {
	// TypeScript will autocomplete the path "user.details.bio"
	const bio = safeGet(data, "user.details.bio", "No bio available");

	return <p>{bio}</p>;
};
```

### What `safeGet` reads

Only **own, enumerable-or-not properties of objects and arrays** are read. This keeps lookups safe from prototype pollution, but it means:

- `__proto__`, `constructor`, `prototype` and other inherited members (including class getters and methods) resolve to the default value.
- Functions, strings, `Date`, `Map` and `Set` are not traversed into (`'name.length'` on a string returns the default). They can be returned when they are the final target.
- Own properties that happen to be named `constructor` or `toString` are read normally.

## When to use vs. Optional Chaining

| Feature           | `safeGet(obj, 'path.to.key')`                               | Optional Chaining (`obj?.path?.to?.key`)  |
| :---------------- | :---------------------------------------------------------- | :---------------------------------------- |
| **Dynamic Paths** | ✅ **Best Use Case**. Can use variables for paths.          | ❌ Not possible. Paths must be hardcoded. |
| **Type Safety**   | ✅ Types validated against string path.                     | ✅ Standard TS behavior.                  |
| **Syntax**        | Function call.                                              | Native operator.                          |
| **Use Case**      | CMS content, deeply nested config, dynamic property access. | Standard static property access.          |

### When NOT to use `safe-object-access`

1.  **Simple, Static Access**: If you know the path at compile time and it's short, just use optional chaining: `user?.profile?.name`. It's faster and requires no library.
2.  **Performance Critical Loops**: While optimized, parsing string paths is slower than direct access. Avoid using inside tight loops (thousands of iterations) if raw performance is critical.

## API

### `safeGet<T, P>(obj, path, defaultValue?, options?)`

- **`obj`**: The source object.
- **`path`**: A string representing the path (e.g., `'a.b.c'` or `'a[0].b'`). Strictly typed to conform to `T`. Supported syntax:
  - dot segments (`a.b`) and bracket indices (`a[0]`)
  - quoted bracket keys for special characters (`a["b.c"]`, `a['it\'s']`)
  - backslash escapes (`a\.b` is the single key `a.b`)
  - empty segments (`""`, `a..b`, `a.`, `a[]`) are malformed and return `defaultValue`; use `a['']` to reach an empty-string key.
- **`defaultValue`** (optional): A value to return if the resolution fails or returns `undefined`.
- **`options`** (optional):
  - **`treatNullAsMissing`**: (boolean) If `true`, returns `defaultValue` when the resolved value is `null`.
  - **`treatEmptyStringAsMissing`**: (boolean) If `true`, returns `defaultValue` when the resolved value is `""`.
  - **`debug`**: (boolean) If `true`, logs helpful debugging information to the console if the traversal fails.

Returns the value at the path (strictly typed) or the default value.

With a default, the return type excludes `undefined` (and `null` when `treatNullAsMissing: true`). Literal paths that don't exist on `T` are compile errors; non-literal `string` paths are accepted and typed as `any`.

### `safeHas<T, P>(obj, path, options?)`

Returns `true` when every key in `path` exists as an own property, even if the value is `undefined` or `null`. Use it when `safeGet` can't tell you whether a key is missing or explicitly `undefined`.

```typescript
const data = { a: { b: undefined } };
safeGet(data, "a.b", "D"); // 'D'
safeHas(data, "a.b"); // true
safeHas(data, "a.c"); // false
```

### `safeGetOrThrow<T, P>(obj, path, options?)`

Like `safeGet` without a default: if the path is missing or the value is unusable it throws a `SafeGetError` (with a `path` property) that says where resolution failed. Takes the same `treatNullAsMissing`, `treatEmptyStringAsMissing` and `guard` options, and the return type never includes `undefined`. Useful for config loading, tests, and anywhere a missing value is a bug.

```typescript
import { safeGetOrThrow, SafeGetError } from "safe-object-access";

const port = safeGetOrThrow(config, "db.port"); // number, or throws
// SafeGetError: [safeGetOrThrow] Cannot resolve "db.host": Key "host" does not exist on object.
```

### `safeSet<T, P>(obj, path, value)`

Immutable, typed counterpart to `safeGet`. Returns a copy of `obj` with `value` at `path`; the original is never mutated and untouched branches are shared, so unchanged references stay `===` (handy for React state). If the value is already there, `obj` itself is returned.

```typescript
import { safeSet } from "safe-object-access";

const next = safeSet(state, "user.profile.name", "Bob"); // value type-checked against the path
safeSet({}, "a.b[0].c", 1); // { a: { b: [{ c: 1 }] } }
```

Missing intermediates are created: an array when the next key is an index, otherwise an object. `safeSet` throws a `SafeSetError` (with a `path` property) instead of doing something surprising:

- keys `__proto__`, `constructor` or `prototype` anywhere in the path
- malformed paths, or a target that is not an object
- an intermediate that holds a string, number or other primitive (it won't overwrite it; `null`/`undefined` are replaced)
- array indices that would leave gaps (appending at `length` is fine) or non-index keys on arrays
- class instances, `Date`, `Map` and other non-plain objects on the path, which can't be copied faithfully

## 🤝 Contributing

Found a bug or have a feature request?

1.  **Fork** the GitHub Repository.
2.  **Create** your feature branch (`git checkout -b feature/AmazingFeature`).
3.  **Commit** your changes (`git commit -m 'Add some AmazingFeature'`).
4.  **Push** to the branch (`git push origin feature/AmazingFeature`).
5.  **Open** a Pull Request.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
