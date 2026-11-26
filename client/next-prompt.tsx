import type { PluginClientContext, PluginTimelineItemProps } from "@getpaseo/plugin/client";
import { useComposers } from "@getpaseo/plugin/client";
import { Icon, useToast } from "@getpaseo/plugin/client/ui";
import { Pressable, Text } from "react-native";
import type { z } from "zod";
import { nextPromptKind, nextPromptSchema } from "../shared/next-prompt";

function NextPrompt({ agentId, item, theme }: PluginTimelineItemProps<z.infer<typeof nextPromptSchema>>) {
  const [composer] = useComposers({ agentId });
  const toast = useToast();
  const { prompt } = item.data;
  const { foregroundMuted, surface1 } = theme.colors;
  if (!composer) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Use suggested prompt: ${prompt}`}
      onPress={async () => {
        try {
          const draft = composer.prompt;
          if (draft !== prompt && !draft.endsWith(`\n\n${prompt}`)) {
            composer.setPrompt(draft.trim() ? `${draft}\n\n${prompt}` : prompt);
          }
          await composer.focus();
        } catch {
          toast.show("Could not open the chat composer.");
        }
      }}
      style={({ pressed }) => ({
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        minHeight: 44,
        paddingHorizontal: 8,
        backgroundColor: pressed ? surface1 : "transparent",
      })}
    >
      <Icon name="Pencil" size={14} color={foregroundMuted} />
      <Text style={{ color: foregroundMuted, flexShrink: 1, fontSize: 14 }}>Use suggested prompt</Text>
    </Pressable>
  );
}

export function contributeNextPrompt(client: PluginClientContext) {
  return client.addTimelineRenderer({
    kind: nextPromptKind,
    version: 1,
    schema: nextPromptSchema,
    Component: NextPrompt,
  });
}
