// ============================================================================
// Sandboxed LaTeX compilation.
// ============================================================================
// Defence in depth (the container itself is the outer boundary):
//   * only approved template files are copied into a fresh temp directory;
//   * shell escape disabled (flag + texmf env), TeX file I/O in "paranoid"
//     mode (no absolute paths, no parent directories, no dotfiles);
//   * wall-clock timeout kills the whole process group; optional prlimit caps
//     CPU seconds, address space and output file size;
//   * runs as the container's non-root user with no inherited secrets in env;
//   * temp directory is always removed.
// ============================================================================
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, normalize, sep } from "node:path";
import type { LatexEngine } from "./latex-escape.ts";

export type CompileOptions = {
  engine: LatexEngine;
  templateDir: string;
  assets: string[];
  mainFile: string;
  source: string;
  timeoutMs: number;
  passes?: number;
};

export type CompileResult = { ok: true; pdf: Buffer; log: string } | { ok: false; code: "COMPILE_FAILED" | "COMPILE_TIMEOUT" | "ENGINE_MISSING"; log: string };

const PRLIMIT = ["/usr/bin/prlimit", "/bin/prlimit"].find((p) => existsSync(p));

function safeJoin(base: string, relative: string): string {
  const target = normalize(join(base, relative));
  if (!target.startsWith(normalize(base) + sep)) throw new Error(`Asset path escapes template directory: ${relative}`);
  return target;
}

function run(command: string, args: string[], cwd: string, timeoutMs: number): Promise<{ code: number | null; timedOut: boolean; output: string; spawnError?: NodeJS.ErrnoException }> {
  return new Promise((resolve) => {
    const env: NodeJS.ProcessEnv = {
      PATH: process.env.PATH ?? "/usr/bin:/bin",
      HOME: cwd,
      TMPDIR: cwd,
      LANG: "C.UTF-8",
      shell_escape: "f",
      openout_any: "p",
      openin_any: "p",
      max_print_line: "1000",
      SOURCE_DATE_EPOCH: "0",
    };
    const [cmd, finalArgs] = PRLIMIT
      ? [PRLIMIT, [`--cpu=${Math.ceil(timeoutMs / 1000)}`, "--as=1610612736", "--fsize=52428800", "--nofile=256", "--", command, ...args]]
      : [command, args];
    let output = "";
    let timedOut = false;
    const child = spawn(cmd, finalArgs, { cwd, env, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    const collect = (chunk: Buffer) => {
      if (output.length < 200_000) output += chunk.toString("utf8");
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        if (child.pid) process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    }, timeoutMs);
    child.on("error", (spawnError: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      resolve({ code: null, timedOut, output, spawnError });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, timedOut, output });
    });
  });
}

export async function compileLatex(options: CompileOptions): Promise<CompileResult> {
  const workDir = await mkdtemp(join(tmpdir(), "resume-"));
  try {
    for (const asset of options.assets) {
      const from = safeJoin(options.templateDir, asset);
      const to = safeJoin(workDir, asset);
      await mkdir(dirname(to), { recursive: true });
      await copyFile(from, to);
    }
    await writeFile(safeJoin(workDir, options.mainFile), options.source, "utf8");

    const args = ["-no-shell-escape", "-interaction=nonstopmode", "-halt-on-error", "-file-line-error", options.mainFile];
    const started = Date.now();
    let log = "";
    for (let pass = 0; pass < (options.passes ?? 1); pass++) {
      const remaining = options.timeoutMs - (Date.now() - started);
      if (remaining <= 0) return { ok: false, code: "COMPILE_TIMEOUT", log };
      const result = await run(options.engine, args, workDir, remaining);
      log = result.output;
      if (result.spawnError?.code === "ENOENT") return { ok: false, code: "ENGINE_MISSING", log: `${options.engine} not installed` };
      if (result.timedOut) return { ok: false, code: "COMPILE_TIMEOUT", log };
      if (result.code !== 0) return { ok: false, code: "COMPILE_FAILED", log };
    }
    const pdfPath = safeJoin(workDir, options.mainFile.replace(/\.tex$/, ".pdf"));
    if (!existsSync(pdfPath)) return { ok: false, code: "COMPILE_FAILED", log };
    return { ok: true, pdf: await readFile(pdfPath), log };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

/** Last error lines of a TeX log for server-side diagnostics (never sent to students). */
export function summariseTexLog(log: string): string {
  const lines = log.split(/\r?\n/);
  const errorIndex = lines.findIndex((l) => /^!|:\d+: /.test(l));
  return (errorIndex >= 0 ? lines.slice(errorIndex, errorIndex + 6) : lines.slice(-8)).join("\n").slice(0, 1200);
}
