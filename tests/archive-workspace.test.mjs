import assert from "node:assert/strict";
import test from "node:test";
import { archiveWorkspaceInBackground } from "../client/archive-workspace.ts";

test("closes the dialog before the archive request finishes", async () => {
  const events = [];
  let finishArchive;
  const archiveResult = new Promise((resolve) => {
    finishArchive = resolve;
  });

  const run = archiveWorkspaceInBackground({
    key: "workspace-1",
    inFlight: new Set(),
    archive: () => {
      events.push("archive");
      return archiveResult;
    },
    onPendingChange: (pending) => events.push(`pending:${pending.size}`),
    closeDialog: () => events.push("close"),
    showError: () => events.push("error"),
  });

  assert.deepEqual(events, ["pending:1", "close", "archive"]);
  finishArchive({ error: null });
  await run;
  assert.deepEqual(events, ["pending:1", "close", "archive", "pending:0"]);
});

test("reports an archive failure and clears the pending state", async () => {
  const events = [];

  await archiveWorkspaceInBackground({
    key: "workspace-1",
    inFlight: new Set(),
    archive: async () => ({ error: "daemon failed" }),
    onPendingChange: (pending) => events.push(`pending:${pending.size}`),
    closeDialog: () => events.push("close"),
    showError: (message) => events.push(`error:${message}`),
  });

  assert.deepEqual(events, ["pending:1", "close", "error:daemon failed", "pending:0"]);
});

test("does not start a duplicate archive for the same workspace", async () => {
  const inFlight = new Set();
  let archiveCalls = 0;
  let finishArchive;
  const archiveResult = new Promise((resolve) => {
    finishArchive = resolve;
  });
  const options = {
    key: "workspace-1",
    inFlight,
    archive: () => {
      archiveCalls += 1;
      return archiveResult;
    },
    onPendingChange: () => {},
    closeDialog: () => {},
    showError: () => {},
  };

  const first = archiveWorkspaceInBackground(options);
  await archiveWorkspaceInBackground(options);
  assert.equal(archiveCalls, 1);
  finishArchive({ error: null });
  await first;
});
