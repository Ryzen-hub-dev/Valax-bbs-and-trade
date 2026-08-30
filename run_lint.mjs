import { ESLint } from "eslint";
import fs from "fs";
import path from "path";

function getAllTsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllTsFiles(fullPath));
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      results.push(fullPath);
    }
  }
  return results;
}

async function run() {
  console.log("=========================================================================");
  console.log("            VALAX SCRUB BBS & TRADE - ESLINT CODE AUDIT                  ");
  console.log("=========================================================================\n");

  const files = getAllTsFiles(path.join(process.cwd(), "src"));
  console.log(`Discovered ${files.length} TypeScript / React source files in src/`);

  const eslint = new ESLint({
    useEslintrc: true,
  });

  const results = await eslint.lintFiles(files);
  const formatter = await eslint.loadFormatter("stylish");
  const resultText = formatter.format(results);

  let errorCount = 0;
  let warningCount = 0;
  for (const r of results) {
    errorCount += r.errorCount;
    warningCount += r.warningCount;
  }

  if (resultText.trim()) {
    console.log(resultText);
  }

  console.log(`[ESLINT AUDIT SUMMARY] ${errorCount} Errors, ${warningCount} Warnings across ${files.length} files.`);
  console.log("=========================================================================");

  if (errorCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("ESLint execution error:", err);
  process.exit(1);
});