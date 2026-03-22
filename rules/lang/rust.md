> Based on: everything-claude-code (MIT) by affaan-m, adapted for neko-gundan
> Source: https://github.com/affaan-m/everything-claude-code

# Rust Language Rules

Language rules for Rust projects. Apply when `Cargo.toml` is detected.

---

## Coding Style

### Formatting

- **rustfmt** for formatting, **clippy** for linting — both are mandatory, no style debates
- 4-space indent (rustfmt default)
- Max line width: 100 characters (rustfmt default)

```bash
cargo fmt
cargo clippy -- -D warnings
```

### Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| Functions, methods, variables, modules, crates | `snake_case` | `parse_input`, `user_service` |
| Types, traits, enums, type parameters | `PascalCase` | `UserRepository`, `FromStr` |
| Constants and statics | `SCREAMING_SNAKE_CASE` | `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| Lifetimes | short lowercase | `'a`, `'de` |

### Immutability

- Variables are immutable by default — embrace this
- Use `let` by default; `let mut` only when mutation is actually needed
- Prefer returning new values over in-place mutations
- Use `Cow<'_, T>` for conditional allocation scenarios

### Ownership and Borrowing

- Borrow (`&T`) by default; take ownership only when you need to store or consume
- Accept `&str` over `String` in function parameters
- Accept `&[T]` over `Vec<T>` in function parameters
- Return owned types from constructors and factories

```rust
// Good: borrow in parameters
fn process(input: &str) -> String { ... }

// Good: owned in return
fn create_user(name: &str) -> User { ... }
```

### Error Handling

- Libraries: use `thiserror` for typed, structured errors
- Applications: use `anyhow` for flexible error context and propagation
- Reserve `unwrap()` / `expect()` for tests and truly unreachable states
- Always wrap errors with context: `context("failed to open config")?`

```rust
// Library error
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("user not found: {id}")]
    NotFound { id: u64 },
    #[error("database error")]
    Database(#[from] sqlx::Error),
}

// Application usage
let config = std::fs::read_to_string("config.toml")
    .context("failed to read config file")?;
```

### Code Organization

- Organize modules by domain, not by type (`user/` not `models/controllers/`)
- Re-export public APIs from `lib.rs`
- Default visibility is private; expose only what callers need

---

## Patterns

### Repository Pattern with Traits

Encapsulate data access behind a trait for testability and swappable storage.

```rust
#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn find_by_id(&self, id: u64) -> Result<Option<User>>;
    async fn save(&self, user: &User) -> Result<()>;
}

pub struct PostgresUserRepository {
    pool: PgPool,
}

#[async_trait]
impl UserRepository for PostgresUserRepository {
    async fn find_by_id(&self, id: u64) -> Result<Option<User>> {
        sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id as i64)
            .fetch_optional(&self.pool)
            .await
            .context("find_by_id failed")
    }
    // ...
}
```

### Newtype Pattern

Prevent parameter mix-ups at compile time.

```rust
pub struct UserId(u64);
pub struct OrderId(u64);

// Compiler rejects: create_order(OrderId(1), UserId(42))
fn create_order(user: UserId, order: OrderId) { ... }
```

### Enum State Machines

Make invalid states impossible to represent.

```rust
pub enum OrderState {
    Pending { created_at: DateTime<Utc> },
    Paid { paid_at: DateTime<Utc>, amount: Decimal },
    Shipped { tracking_number: String },
    Cancelled { reason: String },
}
```

### Builder Pattern

Use for structs with many optional fields.

```rust
#[derive(Default)]
pub struct RequestBuilder {
    url: Option<String>,
    timeout: Option<Duration>,
    retries: u32,
}

impl RequestBuilder {
    pub fn url(mut self, url: impl Into<String>) -> Self {
        self.url = Some(url.into()); self
    }
    pub fn timeout(mut self, t: Duration) -> Self {
        self.timeout = Some(t); self
    }
    pub fn build(self) -> Result<Request> {
        Ok(Request {
            url: self.url.context("url is required")?,
            timeout: self.timeout.unwrap_or(Duration::from_secs(30)),
            retries: self.retries,
        })
    }
}
```

### Sealed Traits

Restrict external implementations of a trait.

```rust
mod private { pub trait Sealed {} }

pub trait MyTrait: private::Sealed {
    fn do_thing(&self);
}

// Only types in this crate can implement MyTrait
impl private::Sealed for MyType {}
impl MyTrait for MyType { ... }
```

---

## Testing

### Structure

- Unit tests: `#[cfg(test)]` modules co-located with source files
- Integration tests: `tests/` directory at crate root
- Benchmarks: `benches/` using Criterion

```
my_crate/
├── src/
│   ├── lib.rs
│   └── user.rs        # #[cfg(test)] mod tests { ... } here
├── tests/
│   └── integration.rs
└── benches/
    └── benchmarks.rs
```

### Recommended Frameworks

| Purpose | Crate |
|---------|-------|
| Parameterized tests | `rstest` |
| Property-based tests | `proptest` |
| Trait mocking | `mockall` |
| Async tests | `#[tokio::test]` |
| Coverage | `cargo-llvm-cov` |

### Test Patterns

```rust
// Parameterized test
#[rstest]
#[case("valid@example.com", true)]
#[case("not-an-email", false)]
fn test_email_validation(#[case] input: &str, #[case] expected: bool) {
    assert_eq!(validate_email(input), expected);
}

// Async test
#[tokio::test]
async fn test_fetch_user() {
    let repo = MockUserRepository::new();
    let result = repo.find_by_id(1).await.unwrap();
    assert!(result.is_some());
}

// Mock usage
#[test]
fn test_service_uses_repo() {
    let mut mock = MockUserRepository::new();
    mock.expect_find_by_id()
        .with(predicate::eq(1u64))
        .returning(|_| Ok(Some(User::default())));

    let svc = UserService::new(Arc::new(mock));
    assert!(svc.get_user(1).is_ok());
}
```

### Coverage Target

- 80%+ line coverage via `cargo-llvm-cov`
- Focus on business logic paths; skip trivial getters/setters

```bash
cargo llvm-cov --html   # HTML report in target/llvm-cov/
cargo llvm-cov --text   # Terminal summary
```

### Test Naming

Name tests after business behavior, not implementation:

```rust
// Good
fn user_cannot_checkout_with_empty_cart()
fn order_transitions_to_paid_on_payment_success()

// Bad
fn test_checkout()
fn test_pay()
```

---

## Security

### Secrets Management

Never hardcode API keys, tokens, or credentials.

```rust
// Good: environment variable with startup validation
let api_key = std::env::var("API_KEY")
    .context("API_KEY environment variable not set")?;

// Bad: hardcoded
let api_key = "sk-abc123...";
```

### SQL Injection Prevention

Always use parameterized queries. Never format user input into SQL strings.

```rust
// Good: parameterized query with sqlx
let user = sqlx::query_as!(
    User,
    "SELECT * FROM users WHERE email = $1",
    email  // bound parameter — safe
)
.fetch_optional(&pool)
.await?;

// Bad: string interpolation
let query = format!("SELECT * FROM users WHERE email = '{}'", email);
```

### Input Validation via Types

Parse into typed structures at system boundaries. Make invalid states unrepresentable.

```rust
pub struct Email(String);

impl Email {
    pub fn parse(raw: &str) -> Result<Self, ValidationError> {
        if raw.contains('@') && raw.len() <= 254 {
            Ok(Self(raw.to_lowercase()))
        } else {
            Err(ValidationError::InvalidEmail)
        }
    }
}
```

### Unsafe Code

- Minimize `unsafe` blocks to the smallest possible scope
- Every `unsafe` block **must** have a `// SAFETY:` comment explaining invariants

```rust
// SAFETY: ptr is guaranteed non-null and properly aligned by the caller.
//         Lifetime is bounded to 'a which outlives this call.
let slice = unsafe { std::slice::from_raw_parts(ptr, len) };
```

### Error Responses

Never expose internal details in client responses.

```rust
// Good: generic message to client, detailed error logged server-side
async fn handler(req: Request) -> Response {
    match process(req).await {
        Ok(result) => Response::ok(result),
        Err(e) => {
            tracing::error!(error = %e, "request processing failed");
            Response::internal_error("An error occurred")  // no internals
        }
    }
}
```

---

## Toolchain

| Tool | Purpose | Command |
|------|---------|---------|
| `rustfmt` | Formatting | `cargo fmt` |
| `clippy` | Linting | `cargo clippy -- -D warnings` |
| `cargo audit` | Dependency vulnerability audit | `cargo audit` |
| `cargo deny` | License/advisory policy | `cargo deny check` |
| `cargo-llvm-cov` | Code coverage | `cargo llvm-cov` |
| `cargo tree` | Dependency inspection | `cargo tree` |

### CI Minimum

```bash
cargo fmt --check
cargo clippy -- -D warnings
cargo test
cargo audit
```
