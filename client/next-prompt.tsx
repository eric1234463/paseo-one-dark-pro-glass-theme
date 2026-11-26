import type { PluginClientContext } from "@getpaseo/plugin/client";
import type { z } from "zod";
import { nextPromptKind, nextPromptSchema } from "../shared/next-prompt";

export function contributeNextPrompt(client: PluginClientContext) {
  const renderer = {
    kind: nextPromptKind,
    version: 1,
    schema: nextPromptSchema,
    Component: () => null,
    composerSuggestion: ({ prompt }: z.infer<typeof nextPromptSchema>) => prompt,
  };
  return client.addTimelineRenderer(renderer);
}
