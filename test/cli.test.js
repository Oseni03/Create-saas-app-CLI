import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { generateScaffold, parseArgs } from "../index.js";

test("parseArgs supports override flags and yes mode", () => {
	const options = parseArgs([
		"--backend",
		"fastapi",
		"--frontend",
		"next",
		"--name",
		"demo-app",
		"--yes",
	]);

	assert.deepEqual(options, {
		backend: "fastapi",
		frontend: "next",
		name: "demo-app",
		yes: true,
	});
});

test("generateScaffold creates a minimal turborepo layout and clones templates", async () => {
	const tempRoot = await fs.mkdtemp(
		path.join(os.tmpdir(), "create-saas-cli-"),
	);
	const cloneCalls = [];

	await generateScaffold({
		projectName: "demo-app",
		backend: "FastAPI",
		frontend: "Next",
		rootDir: tempRoot,
		cloneTemplate: async (repo, dest) => {
			cloneCalls.push({ repo, dest });
			await fs.mkdir(dest, { recursive: true });
			await fs.writeFile(
				path.join(dest, "package.json"),
				JSON.stringify({ name: dest.split("/").pop() }),
			);
		},
	});

	const packageJson = JSON.parse(
		await fs.readFile(
			path.join(tempRoot, "demo-app", "package.json"),
			"utf8",
		),
	);
	const turboConfig = await fs.readFile(
		path.join(tempRoot, "demo-app", "turbo.json"),
		"utf8",
	);

	assert.equal(packageJson.name, "demo-app");
	assert.match(turboConfig, /"tasks"/);
	assert.deepEqual(
		cloneCalls.map((entry) => entry.dest),
		[
			path.join(tempRoot, "demo-app", "apps", "api"),
			path.join(tempRoot, "demo-app", "apps", "web"),
		],
	);
	assert.equal(cloneCalls[0].repo, "Oseni03/saas-backend-fastapi");
	assert.equal(cloneCalls[1].repo, "Oseni03/saas-frontend-next");
});

test("generateScaffold creates uv wrapper for FastAPI", async () => {
	const tempRoot = await fs.mkdtemp(
		path.join(os.tmpdir(), "create-saas-cli-"),
	);

	await generateScaffold({
		projectName: "demo-app",
		backend: "FastAPI",
		frontend: "Next",
		rootDir: tempRoot,
		cloneTemplate: async (repo, dest) => {
			await fs.mkdir(dest, { recursive: true });
			await fs.writeFile(
				path.join(dest, "package.json"),
				JSON.stringify({ name: dest.split("/").pop() }),
			);
		},
	});

	const apiPackageJson = JSON.parse(
		await fs.readFile(
			path.join(tempRoot, "demo-app", "apps", "api", "package.json"),
			"utf8",
		),
	);

	assert.equal(apiPackageJson.name, "api");
	assert.match(
		apiPackageJson.scripts.dev,
		/uv run uvicorn main:app --reload/,
	);
});

test("generateScaffold creates uv wrapper for DRF with auto-detected project", async () => {
	const tempRoot = await fs.mkdtemp(
		path.join(os.tmpdir(), "create-saas-cli-"),
	);

	await generateScaffold({
		projectName: "demo-app",
		backend: "DRF",
		frontend: "Next",
		rootDir: tempRoot,
		cloneTemplate: async (repo, dest) => {
			await fs.mkdir(dest, { recursive: true });
			await fs.mkdir(path.join(dest, "config"), { recursive: true });
			await fs.writeFile(
				path.join(dest, "package.json"),
				JSON.stringify({ name: dest.split("/").pop() }),
			);
			await fs.writeFile(
				path.join(dest, "config", "asgi.py"),
				"# Django ASGI config",
			);
		},
	});

	const apiPackageJson = JSON.parse(
		await fs.readFile(
			path.join(tempRoot, "demo-app", "apps", "api", "package.json"),
			"utf8",
		),
	);

	assert.equal(apiPackageJson.name, "api");
	assert.match(
		apiPackageJson.scripts.dev,
		/uv run uvicorn config\.asgi:application --reload/,
	);
});
