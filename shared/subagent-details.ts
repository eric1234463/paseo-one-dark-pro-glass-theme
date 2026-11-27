import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

const child = z.object({
  id: z.uuid(),
  name: z.string().nullable(),
  role: z.string().nullable(),
  model: z.string().nullable(),
  effort: z.string().nullable(),
});

export const subagentDetailsRpc = defineRpc({
  name: "subagent-details.list",
  input: z.object({ agentId: z.string().min(1) }),
  output: z.object({ children: z.array(child) }),
});

export type CodexChild = z.infer<typeof child>;
