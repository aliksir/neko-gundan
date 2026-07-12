> Based on: everything-claude-code (MIT) by affaan-m, adapted for neko-gundan
> Source: https://github.com/affaan-m/everything-claude-code

# TypeScript Language Rules

Language rules for TypeScript projects. Apply when `tsconfig.json` is detected.

---

## Coding Style

### Formatting

- **Prettier** for formatting, **ESLint** for linting — both are mandatory
- Use the project's existing config; don't override shared configs without team consensus
- Never commit unformatted code

```bash
npx prettier --write .
npx eslint --fix .
npx tsc --noEmit          # type check without emitting
```

### Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| Variables, functions, methods | `camelCase` | `parseEmail`, `userCount` |
| Types, interfaces, classes, enums | `PascalCase` | `UserService`, `ApiResponse` |
| Constants | `SCREAMING_SNAKE_CASE` or `camelCase` | `MAX_RETRIES`, `defaultTimeout` |
| File names | `kebab-case` or `camelCase` (match project) | `user-service.ts`, `apiClient.ts` |
| React components | `PascalCase` (file and export) | `UserProfile.tsx` |
| Type parameters | single uppercase or descriptive | `T`, `TResult`, `TInput` |

### Strict Mode

Always enable strict TypeScript. These are non-negotiable:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

### Type Safety

- **Never use `any`** — use `unknown` and narrow with type guards
- Prefer `interface` for object shapes, `type` for unions/intersections/utilities
- Use `as const` for literal types instead of enums (enums have runtime cost and poor tree-shaking)
- Avoid non-null assertion (`!`) — prefer optional chaining and nullish coalescing

```typescript
// Good: discriminated union
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: Error };

// Good: type narrowing
function processInput(input: unknown): string {
  if (typeof input !== "string") {
    throw new Error(`Expected string, got ${typeof input}`);
  }
  return input.trim();
}

// Bad: any and assertion
function processInput(input: any): string {
  return (input as string).trim();
}
```

### Error Handling

- Throw `Error` subclasses, never plain strings
- Use discriminated union results for expected failures
- Catch specific errors; rethrow unknown ones

```typescript
// Custom error with context
class NotFoundError extends Error {
  constructor(
    public readonly resource: string,
    public readonly id: string,
  ) {
    super(`${resource} not found: ${id}`);
    this.name = "NotFoundError";
  }
}

// Result pattern for expected failures
type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

### Import Organization

- Group imports: external → internal → relative → types
- Avoid barrel files (`index.ts` re-exports) in large projects — they defeat tree-shaking
- Use `type` imports for type-only usage

```typescript
import { z } from "zod";                    // external
import { db } from "@/lib/database";         // internal alias
import { formatDate } from "../utils/date";  // relative
import type { User } from "@/types";         // type-only
```

---

## Patterns

### Zod for Runtime Validation

Validate external data at system boundaries. Never trust API responses or user input.

```typescript
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "user"]),
});

type User = z.infer<typeof UserSchema>;

// Validate at the boundary
function parseUser(data: unknown): User {
  return UserSchema.parse(data);
}
```

### Dependency Injection

Pass dependencies through constructors or function parameters. Avoid module-level singletons.

```typescript
interface UserRepository {
  findById(id: string): Promise<User | null>;
}

class UserService {
  constructor(private readonly repo: UserRepository) {}

  async getUser(id: string): Promise<User> {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError("User", id);
    return user;
  }
}
```

### Async/Await

- Always handle Promise rejections
- Use `Promise.all` for independent concurrent operations
- Never use fire-and-forget promises without error handling

```typescript
// Good: concurrent independent operations
const [users, posts] = await Promise.all([
  fetchUsers(),
  fetchPosts(),
]);

// Good: sequential dependent operations
const user = await fetchUser(id);
const posts = await fetchPostsByUser(user.id);

// Bad: fire-and-forget
sendEmail(user.email); // unhandled rejection
```

---

## Testing

### Test Structure

Use `describe`/`it` blocks with behavior-driven naming.

```typescript
describe("UserService", () => {
  describe("createUser", () => {
    it("should create a user with valid input", async () => {
      const user = await service.createUser(validInput);
      expect(user.email).toBe(validInput.email);
    });

    it("should throw on duplicate email", async () => {
      await service.createUser(validInput);
      await expect(service.createUser(validInput)).rejects.toThrow(
        "already exists",
      );
    });
  });
});
```

### Test Commands

```bash
# Jest
npx jest --coverage
npx jest --watch

# Vitest
npx vitest run --coverage
npx vitest --watch

# Playwright (E2E)
npx playwright test
```

### Mocking

- Mock at the boundary (HTTP, database), not internal functions
- Use dependency injection to swap implementations in tests
- Prefer `vi.fn()` / `jest.fn()` over complex mock libraries

```typescript
const mockRepo: UserRepository = {
  findById: vi.fn().mockResolvedValue({ id: "1", name: "Test" }),
};

const service = new UserService(mockRepo);
```

### Coverage Target

- 80%+ on business logic
- E2E tests for critical user flows
- Don't chase 100% — test behavior, not implementation

---

## Security

### Input Validation

Validate all external input with Zod or similar at the system boundary.

```typescript
// API route handler
export async function POST(req: Request) {
  const body = CreateUserSchema.safeParse(await req.json());
  if (!body.success) {
    return Response.json({ error: body.error.issues }, { status: 400 });
  }
  // body.data is now typed and validated
}
```

### Secrets Management

Never hardcode secrets. Use environment variables with startup validation.

```typescript
const config = z
  .object({
    DATABASE_URL: z.string().url(),
    API_KEY: z.string().min(1),
  })
  .parse(process.env);
```

### XSS Prevention

- In React: never use `dangerouslySetInnerHTML` without sanitization
- Sanitize user-generated HTML with DOMPurify
- Use Content Security Policy headers

### SQL Injection Prevention

Always use parameterized queries. Never interpolate user input into SQL.

```typescript
// Good: parameterized (Prisma, Drizzle, or raw)
const user = await db.query("SELECT * FROM users WHERE id = $1", [userId]);

// Bad: string interpolation
const user = await db.query(`SELECT * FROM users WHERE id = '${userId}'`);
```

### Dependency Security

```bash
npm audit
npx osv-scanner --lockfile package-lock.json
```

---

## Toolchain

| Tool | Purpose | Command |
|------|---------|---------|
| `tsc` | Type checking | `npx tsc --noEmit` |
| `eslint` | Linting | `npx eslint .` |
| `prettier` | Formatting | `npx prettier --check .` |
| `vitest` / `jest` | Unit testing | `npx vitest run` / `npx jest` |
| `playwright` | E2E testing | `npx playwright test` |
| `osv-scanner` | Vulnerability scanning | `npx osv-scanner --lockfile package-lock.json` |

### CI Minimum

```bash
npx tsc --noEmit           # type check
npx eslint .               # lint
npx prettier --check .     # format check
npx vitest run --coverage  # test with coverage
```
