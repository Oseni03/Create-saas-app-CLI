# AGENTS.md — Create SaaS CLI

## Project Overview

CLI tool that scaffolds a Turborepo-style SaaS monorepo. User picks a backend (Express, FastAPI) and frontend (Next.js), and the CLI generates `apps/api`, `apps/web`, root config files, and Docker Compose setup.

## Architecture

- **`index.js`** — Entry point; handles CLI args, prompts, orchestrates scaffolding
- **`templates/`** — Template files rendered during scaffolding (if separated; currently inline in index.js or in `contexts/root/`)
- **`contexts/root/`** — Scaffolded root-level files (turbo.json, docker-compose.yml, etc.)
- **`test/`** — Node.js native test runner tests

## Agent Instructions

### General Rules
- Read the full file before editing. Prefer small, targeted edits.
- Match existing code style (ESM, `execa` for shell commands, `fs-extra` for file ops, `@clack/prompts` for UI, `picocolors` for colors).
- Do NOT add comments to generated output templates.
- Do NOT add external dependencies without checking first.
- Keep CLI output user-friendly (progress spinners, color, clear prompts).

### When Adding a New Backend/Frontend
1. Add a new option array entry in the prompt definition in `index.js`.
2. Create the corresponding template directory under `contexts/`.
3. Add scaffolding logic in the main generation function.
4. Update `--help` output and validation in `index.js`.
5. Add test cases covering the new stack option.

### Testing
```bash
npm test                 # run all tests
node --test --watch      # watch mode
```

Run tests before committing.

### Code Style Conventions
- **ESM only** (`import`/`export`, no `require`)
- **Async/await** for all I/O
- **No semicolons** (match existing style)
- **Single quotes** for strings
- **`execa`** for shell commands, never `child_process` directly
- **`fs-extra`** for filesystem operations
- **`@clack/prompts`** for interactive prompts
- **`picocolors`** for terminal colors
- Use `picocolors.cyan()` / `.green()` / `.yellow()` / `.red()` for emphasis, not raw ANSI codes

### Generated Project Conventions
Scaffolded monorepo output must follow:
- `apps/api/` — backend service (standard framework layout)
- `apps/web/` — Next.js app
- Root `turbo.json` for Turborepo orchestration
- Root `docker-compose.yml` with api + db services
- Root `.env.example` with placeholder values
- Root `README.md` explaining the stack

### Key Files
- `index.js` — CLI entry, arg parsing, prompt flow, scaffold orchestration
- `package.json` — Project metadata, dependencies, scripts
- `contexts/` — Template source files organized by project area
- `test/` — Tests mirroring the CLI's output structure

## Notes
- This package is published as `@oseni03/create-saas-app` on npm.
- The `--yes` flag skips all prompts and uses defaults.
- No TypeScript in this project (plain JS).
