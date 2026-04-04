> Based on: everything-claude-code (MIT) by affaan-m, adapted for neko-gundan
> Source: https://github.com/affaan-m/everything-claude-code

# Python Language Rules

Language rules for Python projects. Apply when `pyproject.toml` or `requirements.txt` is detected.

---

## Coding Style

### Formatting

- **Ruff** for formatting and linting (replaces black + isort + flake8) — mandatory
- If ruff is not available, use **Black** + **isort**
- Never commit unformatted code

```bash
ruff format .
ruff check --fix .
mypy .               # type checking
```

### Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| Functions, methods, variables | `snake_case` | `parse_email`, `user_count` |
| Classes, exceptions | `PascalCase` | `UserService`, `NotFoundError` |
| Constants (module-level) | `SCREAMING_SNAKE_CASE` | `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| Private attributes | `_leading_underscore` | `_internal_state` |
| Modules, packages | `snake_case` | `user_service.py`, `http_utils` |

### Type Hints

Always use type hints for function signatures and class attributes. Use modern syntax (Python 3.10+).

```python
# Good: modern type hints
def find_user(user_id: str) -> User | None:
    ...

def process_items(items: list[str]) -> dict[str, int]:
    ...

# Bad: no hints or legacy typing
def find_user(user_id):
    ...

from typing import Optional, List, Dict  # legacy, use built-in
```

### Error Handling

- Define custom exceptions inheriting from project base exception
- Catch specific exceptions, never bare `except:`
- Use `raise ... from e` to preserve exception chains

```python
# Custom exception with context
class NotFoundError(Exception):
    def __init__(self, resource: str, id: str) -> None:
        super().__init__(f"{resource} not found: {id}")
        self.resource = resource
        self.id = id

# Good: specific catch with chain
try:
    user = repo.find_by_id(user_id)
except DatabaseError as e:
    raise ServiceError(f"Failed to fetch user {user_id}") from e

# Bad: bare except
try:
    user = repo.find_by_id(user_id)
except:
    pass  # swallowed error, lost context
```

### Data Classes and Pydantic

Use dataclasses for internal data, Pydantic for validation at boundaries.

```python
from dataclasses import dataclass
from pydantic import BaseModel, EmailStr

# Internal data structure
@dataclass(frozen=True)
class UserId:
    value: str

# Validation at API boundary
class CreateUserRequest(BaseModel):
    email: EmailStr
    name: str
    role: Literal["admin", "user"] = "user"
```

### Import Organization

Group imports: stdlib → third-party → local. Ruff/isort handles this automatically.

```python
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from app.models import User
from app.services.user import UserService
```

---

## Patterns

### Dependency Injection

Pass dependencies through constructors. Avoid module-level singletons.

```python
class UserService:
    def __init__(self, repo: UserRepository, logger: Logger) -> None:
        self._repo = repo
        self._logger = logger

    async def get_user(self, user_id: str) -> User:
        user = await self._repo.find_by_id(user_id)
        if user is None:
            raise NotFoundError("User", user_id)
        return user
```

### Context Managers

Use context managers for resource cleanup (files, connections, locks).

```python
# Good: automatic cleanup
async with aiohttp.ClientSession() as session:
    async with session.get(url) as response:
        data = await response.json()

# Custom context manager
from contextlib import asynccontextmanager

@asynccontextmanager
async def get_db_connection():
    conn = await pool.acquire()
    try:
        yield conn
    finally:
        await pool.release(conn)
```

### Path Handling

Always use `pathlib.Path` over `os.path`. Never hardcode path separators.

```python
from pathlib import Path

config_dir = Path.home() / ".config" / "myapp"
config_dir.mkdir(parents=True, exist_ok=True)
config_file = config_dir / "settings.json"

# Bad: string concatenation
config_file = os.path.join(os.path.expanduser("~"), ".config", "myapp", "settings.json")
```

### Async Patterns

- Use `asyncio.gather` for independent concurrent operations
- Use `asyncio.TaskGroup` (Python 3.11+) for structured concurrency
- Never use fire-and-forget tasks without error handling

```python
# Good: concurrent independent operations
users, posts = await asyncio.gather(
    fetch_users(),
    fetch_posts(),
)

# Good: structured concurrency (3.11+)
async with asyncio.TaskGroup() as tg:
    task1 = tg.create_task(fetch_users())
    task2 = tg.create_task(fetch_posts())
# Both complete or both cancel
```

---

## Testing

### Test Structure

Use pytest with descriptive test names.

```python
class TestUserService:
    async def test_create_user_with_valid_input(self, service: UserService) -> None:
        user = await service.create_user(valid_input)
        assert user.email == valid_input.email

    async def test_create_user_raises_on_duplicate_email(self, service: UserService) -> None:
        await service.create_user(valid_input)
        with pytest.raises(DuplicateError, match="already exists"):
            await service.create_user(valid_input)
```

### Fixtures

Use pytest fixtures for setup/teardown. Prefer factory fixtures over shared state.

```python
@pytest.fixture
def user_factory() -> Callable[..., User]:
    def _create(**overrides: Any) -> User:
        defaults = {"email": "test@example.com", "name": "Test User"}
        return User(**(defaults | overrides))
    return _create
```

### Test Commands

```bash
pytest --cov=app --cov-report=html
pytest -x --tb=short              # stop on first failure
pytest -k "test_create"           # run matching tests
pytest --timeout=10               # fail slow tests
```

### Coverage Target

- 80%+ on business logic
- Integration tests for API endpoints and database queries
- Don't mock everything — test real behavior where practical

---

## Security

### Input Validation

Validate all external input with Pydantic at the system boundary.

```python
from fastapi import FastAPI, HTTPException

app = FastAPI()

@app.post("/users")
async def create_user(request: CreateUserRequest) -> UserResponse:
    # request is already validated by Pydantic
    user = await service.create_user(request)
    return UserResponse.model_validate(user)
```

### Secrets Management

Never hardcode secrets. Use environment variables with startup validation.

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    api_key: str
    debug: bool = False

    model_config = {"env_file": ".env"}

settings = Settings()  # raises ValidationError if missing
```

### SQL Injection Prevention

Always use parameterized queries. Never interpolate user input into SQL.

```python
# Good: parameterized
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))

# Good: ORM (SQLAlchemy)
user = session.query(User).filter(User.id == user_id).first()

# Bad: f-string interpolation
cursor.execute(f"SELECT * FROM users WHERE id = '{user_id}'")
```

### Path Traversal Prevention

Validate file paths against a base directory.

```python
from pathlib import Path

def safe_read(base_dir: Path, filename: str) -> str:
    target = (base_dir / filename).resolve()
    if not target.is_relative_to(base_dir.resolve()):
        raise ValueError(f"Path traversal attempt: {filename}")
    return target.read_text()
```

### Dependency Security

```bash
pip-audit
bandit -r .
ruff check --select S .   # security rules
```

---

## Toolchain

| Tool | Purpose | Command |
|------|---------|---------|
| `ruff` | Formatting + linting | `ruff format . && ruff check .` |
| `mypy` | Type checking | `mypy .` |
| `pytest` | Testing | `pytest --cov` |
| `bandit` | Security SAST | `bandit -r .` |
| `pip-audit` | Vulnerability scanning | `pip-audit` |
| `uv` | Fast package management | `uv sync` / `uv pip install` |

### CI Minimum

```bash
ruff format --check .    # format check
ruff check .             # lint
mypy .                   # type check
pytest --cov --timeout=30  # test with coverage
```
