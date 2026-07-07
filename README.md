# Create SaaS App CLI

Create SaaS App CLI is a command-line tool for scaffolding a modern SaaS starter monorepo with a selected backend and frontend stack.

It currently supports:

-   Backend: Express, FastAPI
-   Frontend: Next.js

The CLI generates a minimal Turborepo-style project structure with separate application folders for the API and web app.

## Features

-   Interactive prompts or `--yes` for automation
-   Generates `apps/api` + `apps/web` from framework-specific template repos
-   Root `turbo.json`, `docker-compose.yml`, `.env.example`, `README.md`
-   Ships **AI agent skills** (`.agents/skills/`) for grill, system-design, TDD, triage, issues, PRDs
-   Ships **context files** (`AGENTS.md`, `CONTEXT.md`, `DOMAIN.md`) for AI agent onboarding

## Usage

```bash
create-saas-app                          # interactive
create-saas-app --backend fastapi --frontend next --name my-app
create-saas-app --yes                     # defaults: Express + Next
create-saas-app --help                    # CLI options
```

## Generated Project Structure

```
my-app/
├── apps/
│   ├── api/                  # selected backend template
│   └── web/                  # Next.js frontend
├── .agents/skills/           # AI agent workflows
├── AGENTS.md                 # agent facts, commands, setup
├── CONTEXT.md                # stack, invariants, patterns
├── DOMAIN.md                 # domain glossary
├── package.json              # workspace root
├── turbo.json                # Turborepo orchestration
├── docker-compose.yml
├── README.md
└── .env.example
```

## Supported Stacks

| Backend   | Frontend |
| --------- | -------- |
| Express 5 | Next.js  |
| FastAPI   |          |

## Development

```bash
git clone https://github.com/Oseni03/Create-saas-app-CLI.git
cd Create-saas-app-CLI
npm install
npm test
```

## Roadmap

Planned improvements include:

-   a configurable template registry for adding new backends and frontends
-   shared packages such as UI and config libraries
-   shared schemas between frontend and backend irrespective of language or framework
-   preset starters for auth, billing, and deployment
-   billing as a microservice for better platform configuration (Paystack, Polar.sh or Stripe)

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

This project is licensed under the ISC License.
