> Based on: everything-claude-code (MIT) by affaan-m, adapted for neko-gundan
> Source: https://github.com/affaan-m/everything-claude-code

# Go Language Rules

Language rules for Go projects. Apply when `go.mod` is detected.

---

## Coding Style

### Formatting

- **gofmt** and **goimports** are mandatory — no style debates
- `gofmt` handles indentation (tabs) and spacing; `goimports` also manages import blocks
- Never commit unformatted code

```bash
gofmt -w .
goimports -w .
go vet ./...
```

### Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| Packages | short lowercase, no underscores | `user`, `httputil` |
| Exported identifiers | `PascalCase` | `UserService`, `ParseEmail` |
| Unexported identifiers | `camelCase` | `parseInternal`, `maxRetries` |
| Constants (both) | `PascalCase` or `camelCase` by visibility | `MaxRetries`, `defaultTimeout` |
| Interfaces | noun or noun+`er` | `Reader`, `UserRepository` |
| Acronyms | keep uppercase | `HTTPClient`, `userID`, `parseURL` |

### Error Handling

Always wrap errors with context using `%w` for unwrapping support.

```go
// Good: contextual wrapping
if err != nil {
    return fmt.Errorf("failed to create user %q: %w", name, err)
}

// Bad: swallowed or bare error
if err != nil {
    return err  // loses context
}
```

- Never ignore errors (`_ = doSomething()` requires explicit justification comment)
- Use `errors.Is` / `errors.As` for error type checks, not string matching
- Define sentinel errors as package-level `var` with `errors.New`

```go
var ErrNotFound = errors.New("not found")
var ErrConflict = errors.New("already exists")

// Structured error type
type ValidationError struct {
    Field   string
    Message string
}
func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation error on %s: %s", e.Field, e.Message)
}
```

### Interface Design

- **Accept interfaces, return structs** — the fundamental Go interface principle
- Keep interfaces small: 1–3 methods maximum
- Define interfaces where they are **used**, not where they are **implemented**

```go
// Good: defined at point of use
type UserStore interface {
    FindByID(ctx context.Context, id int64) (*User, error)
}

type UserHandler struct {
    store UserStore  // accepts interface
}

// Return the concrete type from constructors
func NewPostgresUserStore(db *sql.DB) *PostgresUserStore { ... }
```

### Code Organization

- `cmd/` — main packages (one per binary)
- `internal/` — private packages (not importable by external modules)
- `pkg/` — public shared packages
- Keep `main.go` thin: parse flags, wire dependencies, call `run()`

---

## Patterns

### Functional Options

Configure objects without bloated constructors or fragile option structs.

```go
type Option func(*Server)

func WithPort(port int) Option {
    return func(s *Server) { s.port = port }
}

func WithTimeout(d time.Duration) Option {
    return func(s *Server) { s.timeout = d }
}

func NewServer(opts ...Option) *Server {
    s := &Server{port: 8080, timeout: 30 * time.Second}
    for _, opt := range opts {
        opt(s)
    }
    return s
}

// Usage
srv := NewServer(WithPort(9090), WithTimeout(60*time.Second))
```

### Dependency Injection via Constructors

Wire dependencies at construction time; avoid global state.

```go
type UserService struct {
    repo   UserRepository
    logger *slog.Logger
}

func NewUserService(repo UserRepository, logger *slog.Logger) *UserService {
    return &UserService{repo: repo, logger: logger}
}
```

### Context Propagation

Always thread `context.Context` as the first parameter. Never store contexts in structs.

```go
// Good
func (s *UserService) FindUser(ctx context.Context, id int64) (*User, error) {
    return s.repo.FindByID(ctx, id)
}

// Bad: context in struct
type UserService struct {
    ctx context.Context  // never do this
}
```

### Concurrency Patterns

- Use `sync.WaitGroup` for fan-out goroutines
- Use `errgroup.Group` (golang.org/x/sync/errgroup) for goroutines that return errors
- Always cancel contexts when done: `defer cancel()`

```go
g, ctx := errgroup.WithContext(ctx)
for _, item := range items {
    item := item  // capture loop var (pre-Go 1.22)
    g.Go(func() error {
        return process(ctx, item)
    })
}
if err := g.Wait(); err != nil {
    return fmt.Errorf("processing failed: %w", err)
}
```

---

## Testing

### Table-Driven Tests

Standard Go testing idiom. Always use `-race` flag.

```go
func TestParseEmail(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    string
        wantErr bool
    }{
        {"valid email", "user@example.com", "user@example.com", false},
        {"missing @",   "notanemail",       "",                  true},
        {"empty string","",                "",                  true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ParseEmail(tt.input)
            if (err != nil) != tt.wantErr {
                t.Fatalf("ParseEmail(%q) error = %v, wantErr %v", tt.input, err, tt.wantErr)
            }
            if got != tt.want {
                t.Errorf("ParseEmail(%q) = %q, want %q", tt.input, got, tt.want)
            }
        })
    }
}
```

### Race Detection

Always run tests with `-race`. Required in CI.

```bash
go test -race ./...
go test -race -count=1 ./...   # disable test caching
```

### Coverage

```bash
go test -cover ./...
go test -coverprofile=coverage.out ./... && go tool cover -html=coverage.out
```

Target: 80%+ on business logic packages.

### Test Helpers

```go
// Use t.Helper() to point errors at the caller, not the helper
func assertNoError(t *testing.T, err error) {
    t.Helper()
    if err != nil {
        t.Fatalf("expected no error, got: %v", err)
    }
}
```

### Test Naming

Use descriptive names that read as behavior specifications:

```go
// Good
func TestUserService_CreateUser_ReturnsErrorOnDuplicateEmail(t *testing.T)
func TestOrder_Pay_TransitionsStateToPaid(t *testing.T)

// Bad
func TestCreate(t *testing.T)
func TestOrder(t *testing.T)
```

---

## Security

### Secrets Management

Never hardcode credentials. Validate at startup.

```go
// Good: environment variable with startup validation
apiKey := os.Getenv("API_KEY")
if apiKey == "" {
    log.Fatal("API_KEY environment variable not configured")
}

// Bad: hardcoded
apiKey := "sk-abc123..."
```

### SQL Injection Prevention

Always use parameterized queries. Never interpolate user input into SQL.

```go
// Good: parameterized
row := db.QueryRowContext(ctx,
    "SELECT id, name FROM users WHERE email = $1",
    email,
)

// Bad: interpolation
query := fmt.Sprintf("SELECT * FROM users WHERE email = '%s'", email)
```

### Context and Timeouts

Always use `context.Context` for timeout control. Never make unbounded network calls.

```go
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel()

resp, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
```

### Input Validation

Validate and sanitize all external input at system boundaries.

```go
func parseUserID(s string) (int64, error) {
    id, err := strconv.ParseInt(s, 10, 64)
    if err != nil || id <= 0 {
        return 0, fmt.Errorf("invalid user ID %q", s)
    }
    return id, nil
}
```

### Error Responses

Never expose internal error details, stack traces, or DB structure to clients.

```go
func handleError(w http.ResponseWriter, err error) {
    slog.Error("request failed", "error", err)  // detailed, server-side only
    http.Error(w, "internal server error", http.StatusInternalServerError)
}
```

---

## Toolchain

| Tool | Purpose | Command |
|------|---------|---------|
| `gofmt` | Formatting | `gofmt -w .` |
| `goimports` | Import management + formatting | `goimports -w .` |
| `go vet` | Static analysis (stdlib) | `go vet ./...` |
| `staticcheck` | Advanced static analysis | `staticcheck ./...` |
| `gosec` | Security static analysis | `gosec ./...` |
| `golangci-lint` | Multi-linter runner | `golangci-lint run` |

### CI Minimum

```bash
gofmt -l .          # fail if any file needs formatting
go vet ./...
staticcheck ./...
go test -race ./...
```
