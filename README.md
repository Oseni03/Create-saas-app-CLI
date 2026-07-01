# Create SaaS App CLI

Create SaaS App CLI is a command-line tool for scaffolding a modern SaaS starter monorepo with a selected backend and frontend stack.

It currently supports:

- Backend: Express, FastAPI
- Frontend: Next.js

The CLI generates a minimal Turborepo-style project structure with separate application folders for the API and web app.

## Features

- Interactive prompts for project name and stack selection
- Non-interactive flags for automation
- Generates a minimal monorepo layout with:
    - apps/api
    - apps/web
    - root package.json
    - turbo.json
    - docker-compose.yml
    - README.md
    - .env.example
- Supports quick scaffolding for local development

## Installation

From npm:

```bash
npm install -g create-saas-app
```

From the repository:

```bash
git clone https://github.com/Oseni03/Create-saas-app-CLI.git
cd Create-saas-app-CLI
npm install
npm link
```

## Usage

### Interactive mode

```bash
create-saas-app
```

### Non-interactive mode

```bash
create-saas-app --backend fastapi --frontend next --name my-saas-app
```

### Fully non-interactive with defaults

```bash
create-saas-app --yes
```

## Generated Project Structure

```text
my-saas-app/
├── apps/
│   ├── api/
│   └── web/
├── package.json
├── turbo.json
├── docker-compose.yml
├── README.md
└── .env.example
```

## Development

```bash
git clone https://github.com/Oseni03/Create-saas-app-CLI.git
cd Create-saas-app-CLI
npm install
npm test
```

## Roadmap

Planned improvements include:

- a configurable template registry for adding new backends and frontends
- shared packages such as UI and config libraries
- shared schemas between frontend and backend irrespective of language or framework
- preset starters for auth, billing, and deployment
- billing as a microservice for better platform configuration (Paystack, Polar.sh or Stripe)

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

This project is licensed under the ISC License.
