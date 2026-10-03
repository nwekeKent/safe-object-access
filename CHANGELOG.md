# Changelog

## Unreleased

### Breaking (types only)

- Literal paths that do not exist on the object type are now compile errors.
  Previously a typo such as `safeGet(user, "profle.name")` silently fell through
  to an untyped `any` overload. Non-literal `string` paths still compile and are
  typed `any`.
- With a default value, the return type no longer includes `undefined`
  (or `null` when `treatNullAsMissing: true`).

### Fixed

- `Path` no longer offers keys containing dots (e.g. `a.x.y` for a key `"x.y"`),
  which could not resolve at runtime.
- Keys containing dots are reachable via `a\.b` or `a["b.c"]`.
- Malformed paths (`""`, `a..b`, `a.`, `a[]`, unclosed brackets) return the
  default value instead of being silently normalised. Previously `""` resolved
  to the whole object.
- Quote characters inside plain keys are no longer stripped.
- The path cache is now a bounded LRU (500 entries) instead of growing forever.

### Added

- `guard` option for `safeGet`: a runtime check on the resolved value. When it
  fails the default is returned; a type guard narrows the result type.
- `safeHas(obj, path)`: true when the path exists as own properties, even if the
  value is `undefined` or `null`.
- Typed bracket-notation paths (`children[0].id`).
- `Path` traverses optional/nullable properties and recursive types
  (depth-capped at 10).
- `NormalizePath`, `ValidPath` and `Resolved` type exports.
- CI, coverage thresholds, Prettier, `engines` (Node >= 16.9) and corrected
  `exports` type conditions.
