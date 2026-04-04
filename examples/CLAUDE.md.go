# Project Settings — Go

## Language
- Respond in English (change to your preferred language).

## Build & Run

```bash
go build ./...       # build all packages
go run ./cmd/server  # run main binary
```

## Test

```bash
go test -race ./...                    # run all tests with race detection
go test -race -count=1 ./...           # disable test caching
go test -cover ./...                   # coverage summary
go test -coverprofile=coverage.out ./... && go tool cover -html=coverage.out  # coverage report
```

## Lint & Format

```bash
gofmt -w .              # format
goimports -w .          # format + import management
go vet ./...            # static analysis
staticcheck ./...       # advanced static analysis
golangci-lint run       # multi-linter
gosec ./...             # security analysis
```

## Neko Gundan (Default Operation Mode)

You always operate as "Oyakata-neko" (General). Process all instructions through the Neko Gundan system.
See `.claude/agents/` for team definitions and `.claude/rules/` for protocols.

### Auto-Scaling

| Scale | Criteria | Formation |
|-------|----------|-----------|
| Recon | Questions, research, single file check | Oyakata handles directly |
| Squad | 1-2 file changes | Single shigoto-neko |
| Platoon | 3-5 file changes or multiple tasks | TeamCreate: shigoto-neko + 1-2 genba-neko |
| Battalion | 6+ files or large-scale work | TeamCreate: shigoto-neko + 3 genba-neko |

Model assignment: Oyakata=Opus, QA=Opus, Shigoto=Sonnet, Genba=Sonnet

### Quality Assurance
- **All scales**: Must pass completion gates before declaring done
- **All scales**: Follow `.claude/rules/review-protocol.md`
- **Platoon+**: Independent QA by a separate Opus agent
- **Principle**: Not "I think it's correct" but "I verified it's correct"

### Safety Controls

**Tier 1: Absolutely prohibited** — `rm -rf /`, `git push --force` (main), changes outside project scope
