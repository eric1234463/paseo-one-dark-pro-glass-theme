import type { PluginHandlerContext, PluginServerContext } from "@getpaseo/plugin/server";
import { execCommand } from "@getpaseo/plugin/server";
import { compareDiffRpc, compareInfoRpc } from "./shared/compare";

// Server side of the Compare panel: runs git in the workspace directory.
// baseRef is validated as a single ref name (no flags, no shell) and passed
// as argv — never through a shell — so user input cannot inject options.

const MAX_DIFF_CHARS = 120000;
// Large enough that clipping (above) decides, not the child-process buffer.
const GIT_MAX_BUFFER = 32 * 1024 * 1024;
const REF_RE = /^[A-Za-z0-9._\/-]+$/;

async function resolveCwd(
  ctx: PluginHandlerContext,
  workspaceId: string,
): Promise<{ cwd: string | null; error: string | null }> {
  try {
    const handle = ctx.paseo.workspaces.ref(workspaceId);
    const snap = handle.current() ?? (await handle.refresh());
    const cwd = snap?.workspaceDirectory ?? snap?.projectRootPath ?? null;
    if (!cwd) return { cwd: null, error: "Workspace directory is unavailable." };
    return { cwd, error: null };
  } catch (e) {
    return { cwd: null, error: e instanceof Error ? e.message : String(e) };
  }
}

async function git(cwd: string, args: string[]): Promise<string> {
  const res = await execCommand("git", args, { cwd });
  return res.stdout.trim();
}

export default function contribute(server: PluginServerContext) {
  server.handle(compareInfoRpc, async (input, ctx) => {
    const { cwd, error } = await resolveCwd(ctx, input.workspaceId);
    if (!cwd) {
      return { cwd: null, isGit: false, currentBranch: null, defaultBase: null, branches: [], error };
    }
    try {
      await git(cwd, ["rev-parse", "--git-dir"]);
    } catch {
      return {
        cwd,
        isGit: false,
        currentBranch: null,
        defaultBase: null,
        branches: [],
        error: "Not a git repository.",
      };
    }
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const query = (input.query ?? "").toLowerCase();
    let currentBranch: string | null = null;
    try {
      const head = await git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]);
      currentBranch = head === "HEAD" ? null : head;
    } catch {
      currentBranch = null;
    }
    let branches: string[] = [];
    try {
      const out = await git(cwd, [
        "for-each-ref",
        "--format=%(refname:short)",
        "refs/heads",
        "refs/remotes",
      ]);
      branches = out
        .split("\n")
        .map((b) => b.trim())
        .filter(Boolean)
        .filter((b) => !b.endsWith("/HEAD"))
        .filter((b) => (query ? b.toLowerCase().includes(query) : true))
        .slice(0, limit);
    } catch {
      branches = [];
    }
    let defaultBase: string | null = null;
    try {
      const originHead = await git(cwd, ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"]);
      defaultBase = originHead.replace(/^origin\//, "");
    } catch {
      defaultBase = null;
    }
    if (!defaultBase) {
      if (branches.includes("main")) defaultBase = "main";
      else if (branches.includes("master")) defaultBase = "master";
      else defaultBase = branches[0] ?? null;
    }
    return { cwd, isGit: true, currentBranch, defaultBase, branches, error: null };
  });

  server.handle(compareDiffRpc, async (input, ctx) => {
    const baseRef = input.baseRef.trim();
    if (!baseRef || !REF_RE.test(baseRef) || baseRef.startsWith("-") || baseRef.includes("..")) {
      return { diff: "", truncated: false, currentBranch: null, baseRef: null, error: "Invalid base ref." };
    }
    const { cwd, error } = await resolveCwd(ctx, input.workspaceId);
    if (!cwd) {
      return { diff: "", truncated: false, currentBranch: null, baseRef, error };
    }
    let currentBranch: string | null = null;
    try {
      const head = await git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]);
      currentBranch = head === "HEAD" ? null : head;
    } catch {
      currentBranch = null;
    }
    const args = ["diff", "--no-color", "--unified=3", "--no-ext-diff"];
    if (input.ignoreWhitespace) args.push("--ignore-all-space");
    args.push(`${baseRef}...HEAD`, "--");
    try {
      const res = await execCommand("git", args, { cwd, maxBuffer: GIT_MAX_BUFFER });
      const diff = res.stdout;
      const truncated = diff.length > MAX_DIFF_CHARS;
      return {
        diff: truncated ? `${diff.slice(0, MAX_DIFF_CHARS)}…` : diff,
        truncated,
        currentBranch,
        baseRef,
        error: res.stderr.trim() ? res.stderr.trim() : null,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const hint = msg.includes("unknown revision") || msg.includes("bad revision")
        ? `Unknown base ref "${baseRef}".`
        : /maxbuffer/i.test(msg)
          ? "Diff is too large to load (over ~32 MB). Pick a closer base branch."
          : msg.split("\n").slice(0, 3).join("\n");
      return { diff: "", truncated: false, currentBranch, baseRef, error: hint };
    }
  });

  return () => {};
}
