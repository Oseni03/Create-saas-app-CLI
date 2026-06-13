#!/usr/bin/env node

import * as p from "@clack/prompts";
import color from "picocolors";
import { execa } from "execa";
import fs from "fs-extra";
import path from "path";

class Question {
	constructor(question, answersArray, correctAnswerIndex) {
		this.question = question;
		this.answersArray = answersArray;
		this.correctAnswerIndex = correctAnswerIndex;
	}
}

// ── Configure these to point at YOUR template repos ────────────────────────
const BACKEND_REPOS = {
	Express: "Oseni03/saas-backend-express",
	FastAPI: "Oseni03/saas-backend-fastapi",
	DRF: "Oseni03/saas-backend-drf",
};

const FRONTEND_REPOS = {
	Next: "Oseni03/saas-frontend-nextjs",
};

const BACKEND_PORTS = {
	Express: 4000,
	FastAPI: 8000,
	DRF: 8000,
};

const FRONTEND_PORTS = {
	Next: 3000,
};

const BACKEND_MIGRATE_CMD = {
	Express: "npx prisma migrate deploy",
	FastAPI: "alembic upgrade head",
	DRF: "python manage.py migrate",
};

const BACKEND_SEED_CMD = {
	Express: "npm run db:seed",
	FastAPI: "python scripts/seed.py",
	DRF: "python manage.py seed",
};

async function main() {
	p.intro(color.green("Welcome to the Create Saas CLI!"));

	// ── Project name ────────────────────────────────────────────────────────
	const projectName = await p.text({
		message: "What is your project named?",
		placeholder: "my-saas-app",
		validate: (value) => {
			if (!value) return "Project name is required.";
			if (fs.existsSync(path.resolve(process.cwd(), value))) {
				return `Directory "${value}" already exists.`;
			}
		},
	});

	if (p.isCancel(projectName)) {
		p.cancel("Operation cancelled.");
		process.exit(0);
	}

	// ── Question definitions ───────────────────────────────────────────────
	const backendQuestion = new Question(
		"Which backend framework do you want to use?",
		["Express", "FastAPI", "DRF"],
		0,
	);

	const frontendQuestion = new Question(
		"Which frontend framework do you want to use?",
		["Next"],
		0,
	);

	const allQuestions = [backendQuestion, frontendQuestion];

	// ── Ask each question via p.select ─────────────────────────────────────
	const answers = {};

	for (const q of allQuestions) {
		const choice = await p.select({
			message: q.question,
			options: q.answersArray.map((label, i) => ({
				value: label,
				label,
				hint: i === q.correctAnswerIndex ? "recommended" : undefined,
			})),
			initialValue: q.answersArray[q.correctAnswerIndex],
		});

		if (p.isCancel(choice)) {
			p.cancel("Operation cancelled.");
			process.exit(0);
		}

		answers[q.question] = choice;
	}

	const backend = answers[backendQuestion.question];
	const frontend = answers[frontendQuestion.question];

	// ── Guard against unbuilt templates ────────────────────────────────────
	if (!BACKEND_REPOS[backend]) {
		p.cancel(
			`The ${backend} backend isn't available yet. Try Express or FastAPI for now.`,
		);
		process.exit(1);
	}
	if (!FRONTEND_REPOS[frontend]) {
		p.cancel(`The ${frontend} frontend isn't available yet.`);
		process.exit(1);
	}

	const root = path.resolve(process.cwd(), projectName);
	await fs.ensureDir(root);

	// ── Clone backend ───────────────────────────────────────────────────────
	const backendSpinner = p.spinner();
	backendSpinner.start(`Cloning ${backend} backend...`);
	await degit(BACKEND_REPOS[backend], path.join(root, "backend"));
	backendSpinner.stop(`${backend} backend cloned.`);

	// ── Clone frontend ──────────────────────────────────────────────────────
	const frontendSpinner = p.spinner();
	frontendSpinner.start(`Cloning ${frontend} frontend...`);
	await degit(FRONTEND_REPOS[frontend], path.join(root, "frontend"));
	frontendSpinner.stop(`${frontend} frontend cloned.`);

	// ── Write root config files ──────────────────────────────────────────────
	const configSpinner = p.spinner();
	configSpinner.start("Writing root configuration...");
	await writeRootEnv(root, backend, frontend);
	await writeRootDockerCompose(root, backend, frontend);
	await writeRootReadme(root, backend, frontend, projectName);
	await writeRootPackageJson(root, projectName, backend);
	configSpinner.stop("Root configuration written.");

	// ── Done ──────────────────────────────────────────────────────────────
	const backendPort = BACKEND_PORTS[backend];
	const frontendPort = FRONTEND_PORTS[frontend];

	p.note(
		[
			`cd ${projectName}`,
			`cp .env.example .env`,
			`cp backend/.env.example backend/.env`,
			`cp frontend/.env.example frontend/.env.local`,
			``,
			`docker compose up --build`,
			``,
			`Frontend → http://localhost:${frontendPort}`,
			`Backend  → http://localhost:${backendPort}`,
		].join("\n"),
		"Next steps",
	);

	p.outro(color.green("Boilerplate generated successfully!"));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Clone a GitHub repo without its .git history */
async function degit(repo, dest) {
	await execa("npx", ["degit", repo, dest]);
}

async function writeRootEnv(root, backend, frontend) {
	const backendPort = BACKEND_PORTS[backend];
	const frontendPort = FRONTEND_PORTS[frontend];

	const content = `# ── Root env — shared across services ─────────────────────
# Copy backend/.env.example → backend/.env and fill in secrets.
# Copy frontend/.env.example → frontend/.env.local and fill in values.

# Used by docker-compose to wire services together
BACKEND_PORT=${backendPort}
FRONTEND_PORT=${frontendPort}

# Frontend → backend
NEXT_PUBLIC_API_URL=http://localhost:${backendPort}/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:${frontendPort}

# Backend → frontend (CORS)
FRONTEND_URL=http://localhost:${frontendPort}
`;

	await fs.writeFile(path.join(root, ".env.example"), content);
}

async function writeRootDockerCompose(root, backend, frontend) {
	const backendPort = BACKEND_PORTS[backend];
	const frontendPort = FRONTEND_PORTS[frontend];

	const dbBlock = `
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: saas_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
`;

	const backendDatabaseUrl =
		backend === "FastAPI"
			? "postgresql+asyncpg://postgres:postgres@db:5432/saas_db"
			: "postgresql://postgres:postgres@db:5432/saas_db?schema=public";

	const backendRedisUrl =
		backend === "FastAPI" ? "redis://redis:6379/0" : "redis://redis:6379";

	const backendVolumes =
		backend === "Express"
			? `
      - ./backend:/app
      - /app/node_modules`
			: `
      - ./backend:/app`;

	const content = `services:
  backend:
    build:
      context: ./backend
      target: dev
    ports:
      - "\${BACKEND_PORT:-${backendPort}}:${backendPort}"
    env_file: ./backend/.env
    environment:
      DATABASE_URL: ${backendDatabaseUrl}
      REDIS_URL: ${backendRedisUrl}
    volumes:${backendVolumes}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      target: dev
    ports:
      - "\${FRONTEND_PORT:-${frontendPort}}:${frontendPort}"
    env_file: ./frontend/.env.local
    environment:
      NEXT_PUBLIC_API_URL: \${NEXT_PUBLIC_API_URL}
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      - backend
${dbBlock}
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
`;

	await fs.writeFile(path.join(root, "docker-compose.yml"), content);
}

async function writeRootReadme(root, backend, frontend, projectName) {
	const backendPort = BACKEND_PORTS[backend];
	const frontendPort = FRONTEND_PORTS[frontend];
	const healthPath = backend === "FastAPI" ? "/docs" : "/api/v1/health";

	const content = `# ${projectName}

A full-stack SaaS starter — **${backend} backend** + **${frontend}.js frontend**.

## Structure

\`\`\`
${projectName}/
├── backend/    # ${backend}
├── frontend/   # ${frontend}.js + Shadcn/ui
└── docker-compose.yml
\`\`\`

## Quick Start

\`\`\`bash
# 1. Configure environment
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Fill in secrets in each .env file

# 2. Start everything
docker compose up --build

# 3. Run migrations
docker compose exec backend ${BACKEND_MIGRATE_CMD[backend]}

# 4. Seed dev data
docker compose exec backend ${BACKEND_SEED_CMD[backend]}
\`\`\`

- Frontend: http://localhost:${frontendPort}
- Backend:  http://localhost:${backendPort}${healthPath}

## Swapping the Backend

This project was scaffolded with the **${backend}** backend. To switch to another
backend, remove \`backend/\` and re-clone with \`npx degit <repo> backend\`, then
update \`docker-compose.yml\` and \`backend/.env\` accordingly (different port,
different DB driver, different env var names — see each backend's README).
`;

	await fs.writeFile(path.join(root, "README.md"), content);
}

async function writeRootPackageJson(root, projectName, backend) {
	const content = {
		name: projectName,
		private: true,
		scripts: {
			dev: "docker compose up --build",
			stop: "docker compose down",
			"db:migrate": `docker compose exec backend ${BACKEND_MIGRATE_CMD[backend]}`,
			"db:seed": `docker compose exec backend ${BACKEND_SEED_CMD[backend]}`,
		},
	};

	await fs.writeJson(path.join(root, "package.json"), content, { spaces: 2 });
}

main().catch((err) => {
	p.cancel("Something went wrong.");
	console.error(err);
	process.exit(1);
});
