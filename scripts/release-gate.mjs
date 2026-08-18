#!/usr/bin/env node
/** Run frontend release checks and emit redacted, blocking gate results. */

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const checks = [
  ["lint", "frontend", ["npm", "run", "lint"], "Fix ESLint findings."],
  ["typecheck", "frontend", ["npx", "tsc", "--noEmit"], "Resolve TypeScript errors."],
  ["tests", "frontend", ["npm", "test", "--", "--coverage"], "Fix frontend report tests and coverage."],
  ["report-suite", "frontend", ["npm", "run", "test:report"], "Fix report accessibility, responsive, export, print, compatibility, or failure-flow tests."],
  ["accessibility", "accessibility", ["npx", "vitest", "run", "src/components/results/report-accessibility.test.tsx"], "Fix semantic names, live regions, or focus behavior."],
  ["responsive", "responsive_layout", ["npx", "vitest", "run", "src/components/results/report-responsive-print-release-gate.test.tsx"], "Fix viewport overflow or control reachability."],
  ["export", "export", ["npx", "vitest", "run", "src/components/results/report-export-control.test.tsx", "src/lib/report-csv.test.ts"], "Fix CSV generation or download behavior."],
  ["print", "print", ["npx", "vitest", "run", "src/components/results/print-report-section.test.tsx", "src/components/results/report-responsive-print-release-gate.test.tsx"], "Fix print-only structure or page-break behavior."],
  ["build", "frontend", ["npm", "run", "build"], "Fix the production build before release."],
];

const failureClasses = new Set([
  "backend", "frontend", "http_e2e", "data_contract", "accessibility",
  "responsive_layout", "export", "print", "infrastructure",
]);
const sensitive = [
  [/bearer\s+[^\s,;]+/giu, "Bearer [REDACTED]"],
  [/(token|secret|password|passwd|api[_ -]?key|authorization)\s*[:=]\s*[^\s,;]+/giu, "$1=[REDACTED]"],
  [/(?:postgres(?:ql)?|mysql|sqlite(?:3)?|mongodb):\/\/[^\s'"]+/giu, "[REDACTED DATABASE URL]"],
  [/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/gu, "[REDACTED EMAIL]"],
  [/(?:\/Users\/|\/home\/|\/workspace\/|[A-Z]:\\)[^\s'"]+/gu, "[REDACTED INTERNAL PATH]"],
];

function redact(value) {
  return sensitive.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), String(value ?? "")).slice(-2000);
}

function run([name, failureClass, command, remediation]) {
  const result = spawnSync(command[0], command.slice(1), { encoding: "utf8", shell: false });
  const output = redact(`${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim());
  return {
    name,
    failure_class: failureClasses.has(failureClass) ? failureClass : "infrastructure",
    component: "cat-frontend",
    command: command.join(" "),
    passed: result.status === 0,
    required: true,
    remediation,
    output: output || null,
  };
}

const requested = process.argv.slice(2).filter((arg) => arg.startsWith("--check=")).map((arg) => arg.slice(8));
const artifactIndex = process.argv.indexOf("--artifact");
const artifact = artifactIndex >= 0 ? process.argv[artifactIndex + 1] : "release-gate-frontend.json";
const selected = requested.length ? checks.filter(([name]) => requested.includes(name)) : checks;
const results = selected.map(run);
const payload = { gate: "frontend", passed: results.every((result) => !result.required || result.passed), results };
writeFileSync(artifact, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
process.exit(payload.passed ? 0 : 1);
