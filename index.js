#!/usr/bin/env node

import * as p from "@clack/prompts";
import color from "picocolors";
import { execa } from "execa";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const BACKEND_REPOS = {
	Express: "Oseni03/saas-backend-express",
	FastAPI: "Oseni03/saas-backend-fastapi",
	DRF: "Oseni03/saas-backend-drf",
};

const FRONTEND_REPOS = {
	Next: "Oseni03/saas-frontend-next",
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
	// DRF: "python manage.py seed",
};

function parseArgs(argv = process.argv.slice(2)) {
	const options = {
		backend: undefined,
		frontend: undefined,
		name: undefined,
		yes: false,
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--backend") {
			options.backend = argv[index + 1];
			index += 1;
		} else if (arg === "--frontend") {
			options.frontend = argv[index + 1];
			index += 1;
		} else if (arg === "--name") {
			options.name = argv[index + 1];
			index += 1;
		} else if (arg === "--yes") {
			options.yes = true;
		} else if (arg === "--help" || arg === "-h") {
			options.help = true;
		} else {
			throw new Error(`Unknown argument: ${arg}`);
		}
	}

	return options;
}

function normalizeBackend(value) {
	if (!value) return null;
	const normalized = value.toLowerCase();
	if (normalized === "express") return "Express";
	if (normalized === "fastapi" || normalized === "fast-api") return "FastAPI";
	// if (normalized === "drf" || normalized === "django-rest-framework")
	// 	return "DRF";
	return null;
}

function normalizeFrontend(value) {
	if (!value) return null;
	const normalized = value.toLowerCase();
	if (
		normalized === "next" ||
		normalized === "nextjs" ||
		normalized === "next.js"
	)
		return "Next";
	return null;
}

async function main() {
	p.intro(color.green("Welcome to the Create Saas CLI!"));

	let cliOptions = {};
	try {
		cliOptions = parseArgs();
	} catch (error) {
		p.cancel(error.message);
		process.exit(1);
	}

	if (cliOptions.help) {
		p.note(
			[
				"Usage:",
				"  create-saas-app --name my-app",
				"  create-saas-app --backend fastapi --frontend next --yes",
			].join("\n"),
			"CLI options",
		);
		p.outro("Help displayed.");
		return;
	}

	const backend =
		normalizeBackend(cliOptions.backend) ||
		(cliOptions.yes ? "Express" : undefined);
	const frontend =
		normalizeFrontend(cliOptions.frontend) ||
		(cliOptions.yes ? "Next" : undefined);

	let projectName = cliOptions.name;
	let selectedBackend = backend;
	let selectedFrontend = frontend;

	if (!cliOptions.yes) {
		projectName = await p.text({
			message: "What is your project named?",
			placeholder: "my-saas-app",
			initialValue: projectName || undefined,
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

		if (!selectedBackend) {
			selectedBackend = await p.select({
				message: "Which backend framework do you want to use?",
				options: [
					{ value: "Express", label: "Express" },
					{ value: "FastAPI", label: "FastAPI" },
					{ value: "DRF", label: "DRF" },
				],
				initialValue: "Express",
			});
			if (p.isCancel(selectedBackend)) {
				p.cancel("Operation cancelled.");
				process.exit(0);
			}
		}

		if (!selectedFrontend) {
			selectedFrontend = await p.select({
				message: "Which frontend framework do you want to use?",
				options: [{ value: "Next", label: "Next" }],
				initialValue: "Next",
			});
			if (p.isCancel(selectedFrontend)) {
				p.cancel("Operation cancelled.");
				process.exit(0);
			}
		}
	} else {
		projectName = projectName || path.basename(process.cwd());
		selectedBackend = selectedBackend || "Express";
		selectedFrontend = selectedFrontend || "Next";
	}

	if (!BACKEND_REPOS[selectedBackend]) {
		p.cancel(`The ${selectedBackend} backend isn't available yet.`);
		process.exit(1);
	}
	if (!FRONTEND_REPOS[selectedFrontend]) {
		p.cancel(`The ${selectedFrontend} frontend isn't available yet.`);
		process.exit(1);
	}

	await generateScaffold({
		projectName,
		backend: selectedBackend,
		frontend: selectedFrontend,
		rootDir: process.cwd(),
	});

	p.outro(color.green("Boilerplate generated successfully!"));
}

async function generateScaffold({
	projectName,
	backend,
	frontend,
	rootDir = process.cwd(),
	cloneTemplate = cloneTemplateRepo,
	validateRepo = validateTemplateRepo,
}) {
	const root = path.resolve(rootDir, projectName);
	if (fs.existsSync(root)) {
		throw new Error(`Directory "${projectName}" already exists.`);
	}

	await fs.ensureDir(root);
	await fs.ensureDir(path.join(root, "apps", "api"));
	await fs.ensureDir(path.join(root, "apps", "web"));

	if (cloneTemplate === cloneTemplateRepo) {
		await validateRepo(BACKEND_REPOS[backend], backend);
		await validateRepo(FRONTEND_REPOS[frontend], frontend);
	}

	const backendSpinner = p.spinner();
	backendSpinner.start(`Scaffolding ${backend} backend...`);
	await cloneTemplate(BACKEND_REPOS[backend], path.join(root, "apps", "api"));
	backendSpinner.stop(`${backend} backend scaffolded.`);

	const frontendSpinner = p.spinner();
	frontendSpinner.start(`Scaffolding ${frontend} frontend...`);
	await cloneTemplate(
		FRONTEND_REPOS[frontend],
		path.join(root, "apps", "web"),
	);
	frontendSpinner.stop(`${frontend} frontend scaffolded.`);

	const configSpinner = p.spinner();
	configSpinner.start("Writing monorepo configuration...");
	if (isPythonBackend(backend)) {
		await writePythonBackendWrapper(root, backend);
	}
	await writeRootPackageJson(root, projectName);
	await writeTurboConfig(root);
	await writeRootDockerCompose(root, backend, frontend);
	await writeRootReadme(root, backend, frontend, projectName);
	await writeRootEnv(root, backend, frontend);
	configSpinner.stop("Monorepo configuration written.");

	return { root };
}

async function cloneTemplateRepo(repo, dest) {
	await execa("npx", ["degit", repo, dest]);
}

async function validateTemplateRepo(repo) {
	try {
		await execa("git", ["ls-remote", `https://github.com/${repo}`], {
			stdio: "pipe",
		});
	} catch (error) {
		throw new Error(
			`Could not validate template repository ${repo}. ${error.message}`,
		);
	}
}

function isPythonBackend(backend) {
	return backend === "FastAPI" || backend === "DRF";
}

async function detectDjangoProjectName(apiDir) {
	const files = await fs.readdir(apiDir);
	for (const file of files) {
		const fullPath = path.join(apiDir, file);
		const stat = await fs.stat(fullPath);
		if (stat.isDirectory()) {
			const asgiPath = path.join(fullPath, "asgi.py");
			if (fs.existsSync(asgiPath)) {
				return file;
			}
		}
	}
	return "project";
}

async function writePythonBackendWrapper(root, backend) {
	const apiDir = path.join(root, "apps", "api");
	let devCommand = "";

	if (backend === "FastAPI") {
		devCommand = "uv run uvicorn main:app --reload";
	} else if (backend === "DRF") {
		const projectName = await detectDjangoProjectName(apiDir);
		devCommand = `uv run uvicorn ${projectName}.asgi:application --reload`;
	}

	const packageJson = {
		name: "api",
		scripts: {
			dev: devCommand,
		},
	};

	await fs.writeJson(path.join(apiDir, "package.json"), packageJson, {
		spaces: 2,
	});
}

async function writeRootEnv(root, backend, frontend) {
	const backendPort = BACKEND_PORTS[backend];
	const frontendPort = FRONTEND_PORTS[frontend];
	const content = `# Shared environment values
BACKEND_PORT=${backendPort}
FRONTEND_PORT=${frontendPort}
NEXT_PUBLIC_API_URL=http://localhost:${backendPort}/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:${frontendPort}
`;
	await fs.writeFile(path.join(root, ".env.example"), content);
}

async function writeRootDockerCompose(root, backend, frontend) {
	const backendPort = BACKEND_PORTS[backend];
	const frontendPort = FRONTEND_PORTS[frontend];
	const content = `services:
  api:
    build:
      context: ./apps/api
    ports:
      - "\${BACKEND_PORT:-${backendPort}}:${backendPort}"

  web:
    build:
      context: ./apps/web
    ports:
      - "\${FRONTEND_PORT:-${frontendPort}}:${frontendPort}"
`;
	await fs.writeFile(path.join(root, "docker-compose.yml"), content);
}

async function writeRootReadme(root, backend, frontend, projectName) {
	const backendPort = BACKEND_PORTS[backend];
	const frontendPort = FRONTEND_PORTS[frontend];
	const content = `# ${projectName}

A minimal Turborepo starter with a ${backend} backend and a ${frontend} frontend.

## Structure

- apps/api — selected backend template
- apps/web — selected frontend template

## Quick start

1. cd ${projectName}
2. npm install
3. npm run dev

Frontend: http://localhost:${frontendPort}
Backend: http://localhost:${backendPort}
`;
	await fs.writeFile(path.join(root, "README.md"), content);
}

async function writeRootPackageJson(root, projectName) {
	const content = {
		name: projectName,
		private: true,
		packageManager: "npm@10.8.2",
		workspaces: ["apps/*"],
		scripts: {
			dev: "turbo run dev",
			build: "turbo run build",
			lint: "turbo run lint",
		},
		devDependencies: {
			turbo: "^2.0.0",
		},
	};
	await fs.writeJson(path.join(root, "package.json"), content, { spaces: 2 });
}

async function writeTurboConfig(root) {
	const content = {
		$schema: "https://turbo.build/schema.json",
		tasks: {
			build: {
				dependsOn: ["^build"],
				outputs: ["dist/**", ".next/**"],
			},
			dev: {
				cache: false,
				persistent: true,
			},
			lint: {
				outputs: [],
			},
		},
	};
	await fs.writeJson(path.join(root, "turbo.json"), content, { spaces: 2 });
}

const isMainModule =
	process.argv[1] &&
	path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
	main().catch((error) => {
		p.cancel("Something went wrong.");
		console.error(error);
		process.exit(1);
	});
}

export { generateScaffold, parseArgs };
