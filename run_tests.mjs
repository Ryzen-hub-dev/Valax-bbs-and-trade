import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

// 1. Force test environment flags before any application code executes
process.env.NODE_ENV = "test";
process.env.IS_TEST = "true";
process.env.TURSO_TEST_DATABASE_URL = "file:tests/temp_test_suite_sandbox.db";
delete process.env.TURSO_AUTH_TOKEN;
delete process.env.TURSO_TEST_AUTH_TOKEN;

console.log("=========================================================================");
console.log("            VALAX SCRUB BBS & TRADE - AUTOMATED TEST RUNNER              ");
console.log("=========================================================================");
console.log(`[Test Environment] NODE_ENV=${process.env.NODE_ENV} | IS_TEST=${process.env.IS_TEST}`);
console.log(`[Test Database Target] ${process.env.TURSO_TEST_DATABASE_URL}`);
console.log("=========================================================================\n");

const testSuites = [
  "tests/phase1a_security.test.ts",
  "tests/phase1a_migration_replay.test.ts",
  "tests/phase1a_route_handlers.test.ts",
  "tests/phase1b_auth_rbac.test.ts",
];

let allPassed = true;

for (const suite of testSuites) {
  console.log(`>>> Executing Test Suite: ${suite}`);
  const result = spawnSync("npx", ["tsx", suite], {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: "test",
      IS_TEST: "true",
      TURSO_TEST_DATABASE_URL: "file:tests/temp_test_suite_sandbox.db",
    },
  });

  if (result.status !== 0) {
    console.error(`\n[SUITE FAILED] Suite ${suite} exited with code ${result.status}`);
    allPassed = false;
    break;
  }
}

// Cleanup only temporary tests/temp_* files
const testsDir = path.join(process.cwd(), "tests");
if (fs.existsSync(testsDir)) {
  const files = fs.readdirSync(testsDir);
  for (const file of files) {
    if (file.startsWith("temp_") && (file.endsWith(".db") || file.endsWith(".db-journal"))) {
      try {
        fs.unlinkSync(path.join(testsDir, file));
      } catch (e) {}
    }
  }
}

if (!allPassed) {
  console.error("\n[TEST RUNNER SUMMARY] One or more test suites failed.");
  process.exit(1);
} else {
  console.log("\n=========================================================================");
  console.log("   ALL 4 TEST SUITES EXECUTED SUCCESSFULLY WITH ZERO FAILURES           ");
  console.log("=========================================================================");
  process.exit(0);
}