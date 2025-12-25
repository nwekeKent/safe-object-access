# safe-object-access

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/badge/GitHub-nwekeKent%2Fsafe--object--access-blue?logo=github)](https://github.com/nwekeKent/safe-object-access)

A robust, **strongly-typed** TypeScript utility for safely accessing deeply nested object properties using string paths.

## Features

- 🔒 **Type-Safe Paths**: TypeScript validates your string paths against the object's shape (autocomplete supported!).
- 🎯 **Return Type Inference**: The return value is automatically typed based on the path (no more `any`).
- 🛡️ **Safe Access**: Prevents crashes when accessing properties on `undefined` or `null`.
- 📦 **Bracket Notation**: Supports both dot notation (`users.0.name`) and bracket notation (`users[0].name`).
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
import { safeGet } from 'safe-object-access';

const user = {
  profile: {
    name: 'Alice',
    settings: {
      theme: 'dark' as 'dark' | 'light'
    }
  },
  tags: ['admin', 'editor']
};

//  Fully typed string path with autocomplete!
// inferred type: "dark" | "light" | undefined
const theme = safeGet(user, 'profile.settings.theme'); 

//  Supports Array indices (dot or bracket)
// inferred type: string | undefined
const firstTag = safeGet(user, 'tags[0]'); 

// Default values handled correctly
// inferred type: "dark" | "light"
const safeTheme = safeGet(user, 'profile.settings.theme', 'light');
```

### Advanced Usage

You can pass an optional `options` object as the fourth argument to customize how values are retrieved.

#### Handling `null` or Empty Strings
By default, `safeGet` only uses the default value if the result is `undefined`. Use these flags to handle other "empty" states:

```typescript
const data = { bio: null, draft: "" };

// Treat null as missing
const bio = safeGet(data, 'bio', 'No bio yet', { treatNullAsMissing: true });

// Treat empty string as missing
const draft = safeGet(data, 'draft', 'Start typing...', { treatEmptyStringAsMissing: true });
```

#### Debugging Paths
If a path is returning a default value and you don't know why, enable `debug` mode to see exactly where the traversal stopped in the console.

```typescript
safeGet(user, 'profile.addr.city', 'N/A', { debug: true });
// Console: [safeGet] Key "addr" does not exist on object.
```

### Usage with React

This library is perfect for React applications where data shapes might be unpredictable or when mapping over keys.

```tsx
import { safeGet } from 'safe-object-access';

interface UserData {
  user: {
    details?: {
      bio?: string;
    };
  };
}

const UserBio = ({ data }: { data: UserData }) => {
  // TypeScript will autocomplete the path "user.details.bio"
  const bio = safeGet(data, 'user.details.bio', 'No bio available');

  return <p>{bio}</p>;
};
```

## When to use vs. Optional Chaining

| Feature | `safeGet(obj, 'path.to.key')` | Optional Chaining (`obj?.path?.to?.key`) |
| :--- | :--- | :--- |
| **Dynamic Paths** | ✅ **Best Use Case**. Can use variables for paths. | ❌ Not possible. Paths must be hardcoded. |
| **Type Safety** | ✅ Types validated against string path. | ✅ Standard TS behavior. |
| **Syntax** | Function call. | Native operator. |
| **Use Case** | CMS content, deeply nested config, dynamic property access. | Standard static property access. |

### When NOT to use `safe-object-access`

1.  **Simple, Static Access**: If you know the path at compile time and it's short, just use optional chaining: `user?.profile?.name`. It's faster and requires no library.
2.  **Performance Critical Loops**: While optimized, parsing string paths is slower than direct access. Avoid using inside tight loops (thousands of iterations) if raw performance is critical.

## API

### `safeGet<T, P>(obj, path, defaultValue?, options?)`

- **`obj`**: The source object.
- **`path`**: A string representing the path (e.g., `'a.b.c'` or `'a[0].b'`). Strictly typed to conform to `T`.
- **`defaultValue`** (optional): A value to return if the resolution fails or returns `undefined`.
- **`options`** (optional):
    - **`treatNullAsMissing`**: (boolean) If `true`, returns `defaultValue` when the resolved value is `null`.
    - **`treatEmptyStringAsMissing`**: (boolean) If `true`, returns `defaultValue` when the resolved value is `""`.
    - **`debug`**: (boolean) If `true`, logs helpful debugging information to the console if the traversal fails.

Returns the value at the path (strictly typed) or the default value.

## 🤝 Contributing

Found a bug or have a feature request?

1.  **Fork** the GitHub Repository.
2.  **Create** your feature branch (`git checkout -b feature/AmazingFeature`).
3.  **Commit** your changes (`git commit -m 'Add some AmazingFeature'`).
4.  **Push** to the branch (`git push origin feature/AmazingFeature`).
5.  **Open** a Pull Request.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
