import { z } from "zod";

export const nextPromptKind = "next-prompt";
export const nextPromptSchema = z.object({ prompt: z.string().trim().min(1).max(500) });
