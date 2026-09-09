# Test Suite

Tests run inside the real `workerd` runtime via `@cloudflare/vitest-pool-workers`. Each test file gets its own in-memory D1 database — no Cloudflare account or `wrangler d1` commands required.

## Prerequisites

Node ≥ 20, pnpm ≥ 9

## Run

```bash
pnpm install          # install all devDependencies
pnpm test             # run all tests once
pnpm test:watch       # interactive watch mode
pnpm test:coverage    # Istanbul-instrumented coverage report
```

> **Note:** V8 coverage (`--coverage.provider=v8`) does not work inside `workerd` because it requires `node:inspector/promises`. Use Istanbul (the default via `test:coverage`).

## Structure

```
tests/
├── helpers/
│   ├── auth.ts        # loginAs(), makeAdmin(), generateCurrentTotp()
│   ├── factories.ts   # createUser(), createComment(), createArticle()
│   ├── request.ts     # api.{get,post,put,delete}() + json() shortcut
│   └── setup.ts       # setupDB() / resetDB() using schema.sql?raw
├── unit/
│   ├── middleware/auth.test.ts
│   └── utils/{avatar,markdown,password,totp,ua}.test.ts
└── integration/
    ├── token.test.ts
    ├── user.test.ts
    ├── comment.test.ts
    ├── article.test.ts
    ├── settings.test.ts
    └── shapes.test.ts
```

## Reset strategy

- Integration tests that mutate state use `beforeEach(resetDB)` at the top level of the file so each test gets a clean slate.
- `shapes.test.ts` uses `beforeAll(resetDB)` because it only reads; data created by that suite is stable for all its tests.
- Unit tests have no DB dependency.

## Environment

`JWT_SECRET` is injected via miniflare bindings (`'test-secret'`) in `vitest.config.ts` — never from a `.env` file.

## Linting

```bash
pnpm biome check src/ tests/    # report
pnpm biome check --write src/ tests/   # auto-fix safe rules
```
