import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const compareInfoInput = z.object({
  workspaceId: z.string(),
  query: z.string().optional(),
  limit: z.number().optional(),
});

export const compareInfoOutput = z.object({
  cwd: z.string().nullable(),
  isGit: z.boolean(),
  currentBranch: z.string().nullable(),
  defaultBase: z.string().nullable(),
  branches: z.array(z.string()),
  error: z.string().nullable(),
});

export const compareDiffInput = z.object({
  workspaceId: z.string(),
  baseRef: z.string(),
  ignoreWhitespace: z.boolean().optional(),
});

export const compareDiffOutput = z.object({
  diff: z.string(),
  truncated: z.boolean(),
  currentBranch: z.string().nullable(),
  baseRef: z.string().nullable(),
  error: z.string().nullable(),
});

export const compareInfoRpc = defineRpc({
  name: "compare.info",
  input: compareInfoInput,
  output: compareInfoOutput,
});

export const compareDiffRpc = defineRpc({
  name: "compare.diff",
  input: compareDiffInput,
  output: compareDiffOutput,
});
