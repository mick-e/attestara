# Contributing to Attestara

Thank you for your interest in contributing to Attestara. This guide covers
everything you need to get started.

## Table of Contents

- [Development Setup](#development-setup)
- [Monorepo Structure](#monorepo-structure)
- [Code Style and Conventions](#code-style-and-conventions)
- [Testing](#testing)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Security Disclosures](#security-disclosures)

---

## Development Setup

### Prerequisites

- **Node.js** 20+ (check with `node --version`)
- **pnpm** 9+ (check with `pnpm --version`)
- **PostgreSQL** 14+ (for relay tests that hit the database)
- **Redis** 7+ (for relay/prover caching)

### First-Time Setup

```bash
# Clone the repository
git clone https://github.com/attestara/attestara.git
cd attestara

# Install dependencies
pnpm install

# Copy environment config
cp .env.example .env
# Edit .env with your DB, Redis, and RPC URLs

# Generate Prisma client and run migrations
cd packages/relay
pnpm db:generate
pnpm db:migrate
cd ../..

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Development Mode

```bash
# Start all packages in watch mode
pnpm dev

# Or start specific packages
cd packages/relay && pnpm dev   # Relay API on :3001
cd packages/prover && pnpm dev  # Prover on :3002
cd packages/portal && pnpm dev  # Portal on :3000
```

---

## Monorepo Structure

| Package | Description |
|---------|-------------|
| `packages/types` | Shared TypeScript type definitions |
| `packages/contracts` | Solidity smart contracts and Circom ZK circuits |
| `packages/relay` | Fastify API server (auth, agents, credentials, sessions) |
| `packages/prover` | ZK proof generation service with worker pool |
| `packages/sdk` | Client library for TypeScript consumers |
| `packages/portal` | Next.js 16 web dashboard |
| `packages/cli` | Commander.js CLI tool |

Dependencies flow downward: `types` and `contracts` are leaves; `sdk` depends
on both; `relay`, `prover`, and `cli` depend on `sdk` and/or `types`.

---

## Code Style and Conventions

### TypeScript

- **Strict mode** everywhere (`strict: true` in tsconfig)
- **ES2022** target, **ESM** modules (`"type": "module"`)
- Use `type` imports for type-only references (`import type { ... }`)
- Prefer `const` over `let`; avoid `var`
- No implicit `any`; no `@ts-ignore` without a comment explaining why

### Naming

- Files: `kebab-case.ts` (e.g., `agent.service.ts`)
- Classes: `PascalCase` (e.g., `SessionManager`)
- Functions/variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Types/interfaces: `PascalCase`

### Project Conventions

- All packages scoped under `@attestara/`
- Workspace dependencies use `workspace:*`
- Request validation with **Zod** (relay, prover)
- Database access through **Prisma** (relay only)
- API routes under `/v1/` prefix
- Request IDs via `crypto.randomUUID()`
- Structured error responses: `{ code, message, requestId }`

---

## Testing

### Running Tests

```bash
# All packages
pnpm test

# Specific packages
pnpm test:relay
pnpm test:sdk
pnpm test:contracts
pnpm test:portal

# Integration and E2E
pnpm test:integration
pnpm test:e2e

# CI pipeline (unit + integration)
pnpm test:ci

# Typecheck only
pnpm typecheck
```

### Test Frameworks

| Package | Framework | Config |
|---------|-----------|--------|
| relay, sdk, prover, cli | Vitest | `vitest.config.ts` |
| contracts | Hardhat | `hardhat.config.ts` |
| portal | Vitest + Testing Library | `vitest.config.ts` |

### Writing Tests

- Place tests adjacent to source files in a `__tests__` or `test` directory
- Name test files `*.test.ts` or `*.spec.ts`
- Use `describe` / `it` blocks with clear descriptions
- Mock external dependencies (DB, Redis, chain RPC) in unit tests
- For the relay, test env (`NODE_ENV=test`) disables rate limiting

### Test Expectations

- All new features require tests
- Bug fixes should include a regression test
- Tests must pass in CI before merge
- No `test.skip` without an associated issue number

---

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

| Type | When to Use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `perf` | Performance improvement |
| `chore` | Build, CI, or tooling changes |

### Scopes

Use the package name without the `@attestara/` prefix: `relay`, `sdk`, `cli`,
`portal`, `contracts`, `prover`, `types`.

### Examples

```
feat(sdk): add batch proof generation API
fix(relay): prevent session creation with expired credentials
docs(cli): add shell completion installation instructions
test(contracts): add MandateBound circuit edge case tests
```

---

## Pull Request Process

1. **Branch from `master`** with a descriptive name (e.g., `feat/batch-proofs`)
2. **Make your changes** following the conventions above
3. **Run tests** locally: `pnpm test && pnpm typecheck`
4. **Push your branch** and open a PR against `master`
5. **Fill in the PR template** with summary, test plan, and any migration notes
6. **Wait for CI** to pass (tests, typecheck, lint)
7. **Address review feedback** -- push new commits rather than force-pushing
8. A maintainer will merge once approved

### PR Checklist

- [ ] Tests pass locally (`pnpm test`)
- [ ] Types check (`pnpm typecheck`)
- [ ] No lint warnings (`pnpm lint`)
- [ ] Commit messages follow conventions
- [ ] New features are documented
- [ ] Breaking changes noted in PR description
- [ ] No secrets or credentials in the diff

---

## Security Disclosures

**Do not open public issues for security vulnerabilities.**

If you discover a security issue, please email **security@attestara.io** with:

- A description of the vulnerability
- Steps to reproduce
- Potential impact assessment

We will acknowledge receipt within 48 hours and provide a timeline for a fix.
Reporters who follow responsible disclosure will be credited in our security
advisory.

For more details, see `SECURITY.md`.

---

## Questions?

Open a [GitHub Discussion](https://github.com/attestara/attestara/discussions)
or reach out on our community Discord.
