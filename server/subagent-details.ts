import { createReadStream } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { z } from "zod";
import type { CodexChild } from "../shared/subagent-details";

const stringField = z.string().trim().min(1).nullish();
const sessionMetadata = z.object({
  type: z.literal("session_meta"),
  payload: z.object({
    id: z.uuid(),
    agent_nickname: stringField,
    agent_role: stringField,
    source: z.object({
      subagent: z.object({
        thread_spawn: z.object({
          parent_thread_id: z.string(),
          agent_nickname: stringField,
          agent_role: stringField,
        }),
      }),
    }),
  }),
});
const turnContext = z.object({
  type: z.literal("turn_context"),
  payload: z.object({ model: stringField, effort: stringField }),
});

function parseLine(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return undefined;
  }
}

async function readChild(path: string, parentId: string): Promise<CodexChild | null> {
  const stream = createReadStream(path, { encoding: "utf8", highWaterMark: 8192 });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  try {
    let child: CodexChild | null = null;
    for await (const line of lines) {
      if (!child) {
        const metadata = sessionMetadata.safeParse(parseLine(line));
        if (!metadata.success) return null;
        const { id, agent_nickname, agent_role, source } = metadata.data.payload;
        const spawn = source.subagent.thread_spawn;
        if (spawn.parent_thread_id !== parentId) return null;
        child = {
          id,
          name: agent_nickname ?? spawn.agent_nickname ?? null,
          role: agent_role ?? spawn.agent_role ?? null,
          model: null,
          effort: null,
        };
      } else if (line.includes('"turn_context"')) {
        const context = turnContext.safeParse(parseLine(line));
        if (context.success) {
          child.model = context.data.payload.model ?? null;
          child.effort = context.data.payload.effort ?? null;
        }
      }
    }
    return child;
  } finally {
    lines.close();
    stream.destroy();
  }
}

export async function readCodexSubagents(codexHome: string, parentId: string): Promise<CodexChild[]> {
  const children = new Map<string, CodexChild>();
  // SHORTCUT: scan rollout headers per open; index parent IDs if histories make this slow.
  for (const directory of ["sessions", "archived_sessions"]) {
    try {
      const files = await readdir(join(codexHome, directory), { recursive: true, withFileTypes: true });
      for (const file of files.sort((a, b) => b.name.localeCompare(a.name))) {
        if (!file.isFile() || !file.name.startsWith("rollout-") || !file.name.endsWith(".jsonl")) continue;
        try {
          const child = await readChild(join(file.parentPath, file.name), parentId);
          if (child && !children.has(child.id)) children.set(child.id, child);
        } catch (error) {
          // A session can move to the archive between listing and opening it.
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return [...children.values()];
}
