/**
 * Build-level regression test for Markdown processor handling.
 *
 * `starlight-links-validator` registers itself on Astro's live Markdown
 * processor. When the theme replaced that processor, the plugin collected no
 * links at all and reported success — link validation failed *open*, so a build
 * that merely succeeds proves nothing. This test therefore asserts the opposite
 * direction first: a site with a broken internal link must fail the build.
 *
 * The theme is packed and installed like a real consumer dependency so that
 * Astro, Starlight, and the plugins resolve their own versions.
 *
 * Usage: pnpm test:links-validation
 */

import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const packageDir = join(repoRoot, "packages", "northwestern-starlight-theme");
const fixtureDir = join(repoRoot, "tests", "fixtures", "links-validation");

const BROKEN_LINK = "/this/relative/does/not/exist/";
const DEPENDENCIES = [
    "astro@7",
    "@astrojs/starlight@0.41",
    "starlight-links-validator@0.25",
    "starlight-image-zoom@0.15",
    "astro-mermaid@2",
    "mermaid@11",
];

const failures = [];

function log(message) {
    console.log(`[links-validation] ${message}`);
}

function run(command, args, cwd) {
    const result = spawnSync(command, args, { cwd, encoding: "utf8" });
    return { ok: result.status === 0, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

function check(description, condition, output) {
    if (condition) {
        log(`PASS ${description}`);
        return;
    }

    failures.push(description);
    log(`FAIL ${description}`);
    if (output) console.log(output);
}

function writeHomePage(projectDir, link) {
    writeFileSync(
        join(projectDir, "src", "content", "docs", "index.md"),
        [
            "---",
            "title: Home",
            "---",
            "",
            `A link: [x](${link})`,
            "",
            "| Version | Supported |",
            "| --- | --- |",
            "| Astro 7 | Yes |",
            "",
            "```mermaid",
            "flowchart LR",
            "    Astro --> Starlight",
            "```",
            "",
        ].join("\n"),
    );
}

const workDir = mkdtempSync(join(tmpdir(), "nu-links-validation-"));
const projectDir = join(workDir, "project");

try {
    log("packing the theme");
    const pack = run("pnpm", ["pack", "--pack-destination", workDir], packageDir);
    if (!pack.ok) throw new Error(`pnpm pack failed:\n${pack.output}`);
    const tarball = pack.output.trim().split("\n").at(-1).trim();

    log("installing the fixture site");
    cpSync(fixtureDir, projectDir, { recursive: true });
    writeHomePage(projectDir, BROKEN_LINK);
    const install = run("pnpm", ["add", "--ignore-workspace", ...DEPENDENCIES, tarball], projectDir);
    if (!install.ok) throw new Error(`pnpm add failed:\n${install.output}`);

    log("building with a broken internal link");
    const broken = run("pnpm", ["exec", "astro", "build"], projectDir);
    check("a broken internal link fails the build", !broken.ok, broken.output);
    check("the report names the invalid link", broken.output.includes(BROKEN_LINK), broken.output);

    log("building with a valid internal link");
    writeHomePage(projectDir, "/other/");
    const valid = run("pnpm", ["exec", "astro", "build"], projectDir);
    check("a valid internal link builds clean", valid.ok, valid.output);
    check("links are actually validated", valid.output.includes("All internal links are valid"), valid.output);

    // Guards against the build passing for the wrong reason: the same Markdown
    // pipeline must still carry the theme's own plugins.
    const html = run(
        "node",
        ["-e", "process.stdout.write(require('fs').readFileSync('dist/index.html','utf8'))"],
        projectDir,
    );
    check("tables are still wrapped for scrolling", html.output.includes("nu-table-scroll"));
    check("mermaid diagrams are still rendered", html.output.includes('<pre class="mermaid"'));
} finally {
    rmSync(workDir, { recursive: true, force: true });
}

if (failures.length > 0) {
    console.error(`\n[links-validation] ${failures.length} check(s) failed:`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
}

log("all checks passed");
