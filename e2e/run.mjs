import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import http from "node:http";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "mysql+pymysql://root@localhost/sticky_mind_grid_test";

const HEALTH_URL = "http://127.0.0.1:5000/api/health";
const HEALTH_TIMEOUT = 30_000;
const HEALTH_INTERVAL = 1_000;

function run(command, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: true,
      ...opts,
    });
    child.on("close", (code) => resolve(code));
    child.on("error", reject);
    return child;
  });
}

function runBackground(command, args, opts = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: true,
    detached: true,
    ...opts,
  });
  return child;
}

function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(json.status === "healthy");
        } catch {
          resolve(false);
        }
      });
    });
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForHealth() {
  const start = Date.now();
  while (Date.now() - start < HEALTH_TIMEOUT) {
    if (await checkHealth()) return true;
    await sleep(HEALTH_INTERVAL);
  }
  return false;
}

async function main() {
  const env = { ...process.env, DATABASE_URL };

  // Step 1: Seed the test database
  console.log("\n[1/4] Seeding test database...");
  const seedCode = await new Promise((resolve, reject) => {
    const child = spawn("python", ["seed.py"], {
      cwd: "backend",
      stdio: "inherit",
      shell: true,
      env,
    });
    child.on("close", (code) => resolve(code));
    child.on("error", reject);
  });

  if (seedCode !== 0) {
    console.error(`Seed failed with exit code ${seedCode}`);
    process.exit(seedCode);
  }

  // Step 2: Start Flask backend
  console.log("\n[2/4] Starting Flask backend...");
  const flask = runBackground("python", ["run.py"], {
    cwd: "backend",
    env,
  });

  // Step 3: Wait for backend health
  console.log("\n[3/4] Waiting for backend to be ready...");
  const healthy = await waitForHealth();
  if (!healthy) {
    console.error("Backend failed to become healthy within 30s");
    flask.kill("SIGTERM");
    process.exit(1);
  }
  console.log("Backend is healthy!");

  // Step 4: Run Playwright tests
  console.log("\n[4/4] Running Playwright tests...");
  const playwrightArgs = process.argv.slice(2);
  const playwrightCode = await new Promise((resolve, reject) => {
    const child = spawn("npx", ["playwright", "test", ...playwrightArgs], {
      stdio: "inherit",
      shell: true,
      env,
    });
    child.on("close", (code) => resolve(code));
    child.on("error", reject);
  });

  // Cleanup: kill Flask
  console.log("\nShutting down Flask backend...");
  try {
    process.kill(-flask.pid, "SIGTERM");
  } catch {
    flask.kill("SIGTERM");
  }

  process.exit(playwrightCode);
}

main().catch((err) => {
  console.error("Orchestrator failed:", err);
  process.exit(1);
});
