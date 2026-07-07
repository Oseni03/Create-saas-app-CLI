# AGENTS.md — {{projectName}}

npm workspaces monorepo (`apps/*`), Turbo for task orchestration.

## Apps

`apps/web` — Next.js App Router frontend (port {{frontendPort}})
`apps/api` — {{backend}} backend (port {{backendPort}})

Root env vars (`BACKEND_PORT`, `FRONTEND_PORT`, `NEXT_PUBLIC_*`) shared in `.env.example`. Each app has its own `.env.example` with per-app secrets.

## Commands (root)

```
npm run dev      # turbo run dev — both apps
npm run build    # turbo run build
npm run lint     # turbo run lint
```

## Local Setup

1. `npm install` at root
2. `apps/api`: `cp .env.example .env`, fill secrets
3. `apps/web`: `cp .env.example .env.local`
4. Start infra: `docker compose up -d` from `apps/api/`
5. Run DB migrations: `{{dbMigrateCmd}}` from `apps/api/`
6. `npm run dev` at root

## Per-app Docs

- `apps/web/AGENTS.md` — frontend architecture, auth, conventions
- `apps/api/AGENTS.md` — backend architecture, commands, gotchas
- `apps/api/context/` — API contract, architecture, dev guide
