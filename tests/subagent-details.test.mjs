import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readCodexSubagents } from "../server/subagent-details.ts";

const parent = "00000000-0000-4000-8000-000000000001";
const active = "00000000-0000-4000-8000-000000000002";
const archived = "00000000-0000-4000-8000-000000000003";
const other = "00000000-0000-4000-8000-000000000004";
const pending = "00000000-0000-4000-8000-000000000005";

function session(id, owner, extra = {}) {
  return { type: "session_meta", payload: { id, source: { subagent: { thread_spawn: { parent_thread_id: owner, ...extra } } } } };
}

function turn(model, effort) {
  return { type: "turn_context", payload: { model, effort } };
}

test("lists only direct children and reads each child's latest saved model and effort", async (t) => {
  const home = await mkdtemp(join(tmpdir(), "codex-subagent-details-"));
  t.after(() => rm(home, { recursive: true, force: true }));
  const sessions = join(home, "sessions", "2026", "11", "27");
  const archive = join(home, "archived_sessions");
  await mkdir(sessions, { recursive: true });
  await mkdir(archive);

  const write = (directory, id, ...records) => writeFile(
    join(directory, `rollout-${id}.jsonl`),
    records.map((record) => typeof record === "string" ? record : JSON.stringify(record)).join("\n"),
  );
  await Promise.all([
    write(sessions, active, session(active, parent, { agent_nickname: "James", agent_role: "explore" }),
      turn("gpt-6.2-sol", "medium"), turn("gpt-6-luna", "high"), '{"type":"turn_context"'),
    write(archive, archived, session(archived, parent, { agent_nickname: " " }),
      turn("old-model", "low"), turn("gpt-6.2-astra", " ")),
    write(archive, active, session(active, parent), turn("old-model", "low")),
    write(sessions, pending, session(pending, parent)),
    write(sessions, other, session(other, active), turn("grandchild", "low")),
    write(sessions, parent, { type: "session_meta", payload: { id: parent, source: "cli" } }, turn("parent", "xhigh")),
  ]);

  const children = await readCodexSubagents(home, parent);
  assert.deepEqual(children.sort((a, b) => a.id.localeCompare(b.id)), [
    { id: active, name: "James", role: "explore", model: "gpt-6-luna", effort: "high" },
    { id: archived, name: null, role: null, model: "gpt-6.2-astra", effort: null },
    { id: pending, name: null, role: null, model: null, effort: null },
  ]);
  assert.deepEqual(await readCodexSubagents(home, other), []);
});
