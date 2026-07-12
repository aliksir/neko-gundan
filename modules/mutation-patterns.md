# Mutation Patterns Catalog

> Canonical source for mutation operators used by `mutation_review` module.
> jit_tests operators (Negate/Remove/Swap/Change) are a lightweight subset of this catalog.

## M1: Logic Inversion

| Operator | Pattern (regex) | Replacement | Example |
|----------|----------------|-------------|---------|
| negate_gt | `(\w+)\s*>\s*(\w+)` | `$1 <= $2` | `x > 0` → `x <= 0` |
| negate_lt | `(\w+)\s*<\s*(\w+)` | `$1 >= $2` | `i < len` → `i >= len` |
| negate_eq | `(\w+)\s*===?\s*(\w+)` | `$1 !== $2` | `a === b` → `a !== b` |
| flip_and_or | `&&` | `\|\|` | `a && b` → `a \|\| b` |
| flip_bool | `\btrue\b` | `false` | `return true` → `return false` |

## M2: Boundary Shift

| Operator | Pattern | Replacement | Example |
|----------|---------|-------------|---------|
| off_by_one_gt | `>\s*(\d+)` | `> ($1 - 1)` | `> 5` → `> 4` |
| off_by_one_lt | `<\s*(\w+)\.length` | `<= $1.length` | `< arr.length` → `<= arr.length` |
| zero_to_one | `=\s*0\b` | `= 1` | `count = 0` → `count = 1` |

## M3: Null Safety Removal

| Operator | Pattern | Replacement | Example |
|----------|---------|-------------|---------|
| remove_null_check | `if\s*\(.+!=\s*null\)\s*\{` | (remove if wrapper, keep body) | Remove null guard |
| remove_optional | `(\w+)\?\.` | `$1.` | `obj?.prop` → `obj.prop` |
| remove_nullish | `\?\?\s*.+` | (remove nullish coalescing) | `x ?? default` → `x` |

## M4: Resource Leak

| Operator | Pattern | Replacement | Example |
|----------|---------|-------------|---------|
| remove_close | `\.\s*(close|destroy|end|dispose)\s*\(` | (delete line) | `stream.close()` removed |
| remove_finally | `finally\s*\{[^}]+\}` | (delete block) | finally cleanup removed |

## M5: Silent Error

| Operator | Pattern | Replacement | Example |
|----------|---------|-------------|---------|
| swallow_throw | `throw\s+` | `return null; //` | `throw err` → `return null` |
| empty_catch | `catch\s*\(\w+\)\s*\{[^}]+\}` | `catch(e) {}` | Error handling removed |
| ignore_return | `return\s+\{.*error` | `return { success: true }` | Error return → success |

## M6: Security Weakness

| Operator | Pattern | Replacement | Example |
|----------|---------|-------------|---------|
| weaken_comparison | `!==` | `!=` | Strict to loose comparison |
| remove_hash | `crypto\.\w+\([^)]+\)\.update\((\w+)\)\.digest\(\w+\)` | `$1` | Hash removed, raw value used |
| hardcode_secret | `process\.env\.(\w+)` | `'hardcoded_value'` | Env var → hardcoded |

## M7: Type Confusion

| Operator | Pattern | Replacement | Example |
|----------|---------|-------------|---------|
| remove_parse | `parseInt\(([^)]+)\)` | `$1` | `parseInt(x)` → `x` |
| remove_tostring | `\.toString\(\)` | `` | String conversion removed |
| number_to_string | `(\d+)` | `'$1'` | `42` → `'42'` (selective) |

## M8: Dead Code Injection

| Operator | Pattern | Replacement | Example |
|----------|---------|-------------|---------|
| early_return | (function first line) | `return undefined;` prepended | Unreachable function body |
| always_true | `if\s*\(` | `if (true \|\|` | Condition always true |
| unreachable_else | `else\s*\{` | `else if (false) {` | Else branch unreachable |
