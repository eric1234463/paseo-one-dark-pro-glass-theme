import type { PluginServerContext } from "@getpaseo/plugin/server";
import { nextPromptKind, nextPromptSchema } from "../shared/next-prompt";

const instruction =
  "When replying directly to the user and your final reply leaves a concrete follow-up they may want to request, " +
  "append one final line in the format **Next prompt:** <one ready-to-send prompt in the user's language>. " +
  "Keep the prompt on a single line under 500 characters. Omit it if there is no useful follow-up " +
  "or the user requested an exact output format. Complete the current request first.";

export function contributeNextPrompt(server: PluginServerContext) {
  const removeOpen = server.addHook("agent.open.before", async ({ request }) => {
    if (request.provider !== "codex" || request.background || request.purpose !== "interactive") return;
    return {
      ...request,
      appendSystemPrompt: [...(request.appendSystemPrompt ?? []), instruction],
    };
  });
  const removeAfter = server.addHook("agent.turn.after", async ({ agent, turnId, outcome }, { paseo }) => {
    if (
      !turnId ||
      agent.provider !== "codex" ||
      agent.background ||
      agent.parentAgentId ||
      outcome.kind !== "completed"
    ) {
      return;
    }
    const timeline = paseo.agents.ref(agent.id).timeline;
    const { entries } = await timeline.refetch({ direction: "tail", limit: 1, wholeTurns: true });
    const reply = entries.findLast(({ item, turnId: entryTurnId }) =>
      entryTurnId === turnId && item.type === "assistant_message",
    )?.item;
    if (reply?.type !== "assistant_message") return;

    const lastLine = reply.text.trimEnd().split("\n").at(-1);
    const data = nextPromptSchema.safeParse({ prompt: lastLine?.match(/^\*\*Next prompt:\*\* (.+)$/)?.[1] });
    if (!data.success) return;
    await timeline.append({
      type: "plugin",
      id: `${nextPromptKind}-${turnId}`,
      kind: nextPromptKind,
      version: 1,
      data: data.data,
    });
  });
  return () => {
    removeOpen();
    removeAfter();
  };
}
