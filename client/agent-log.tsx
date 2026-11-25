import type { PluginClientContext, PluginTimelineItemProps } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/ui";
import { useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { z } from "zod";

const kind = "agent-log";
const schema = z.object({
  description: z.string(),
  log: z.string(),
  failed: z.boolean(),
});

function AgentLog({ item, theme }: PluginTimelineItemProps<z.infer<typeof schema>>) {
  const [expanded, setExpanded] = useState(false);
  const { description, log, failed } = item.data;
  const colors = theme.colors;
  const label = failed ? "Agent log · Failed" : "Agent log";
  const color = failed ? colors.statusDanger : colors.foregroundMuted;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={description ? `${label}, ${description}` : label}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          minHeight: 44,
          paddingHorizontal: 4,
          backgroundColor: pressed ? colors.surface1 : "transparent",
        })}
      >
        <Icon name={expanded ? "ChevronDown" : "ChevronRight"} size={14} color={color} />
        <Text style={{ flexShrink: 1, fontSize: 14, color }}>{label}</Text>
      </Pressable>
      {expanded && (
        <ScrollView nestedScrollEnabled style={{ maxHeight: 240 }} contentContainerStyle={{ paddingHorizontal: 8 }}>
          {description ? <Text selectable style={{ color: colors.foreground }}>{description}</Text> : null}
          <Text selectable style={{ color: colors.foregroundMuted }}>{log}</Text>
        </ScrollView>
      )}
    </>
  );
}

export function contributeAgentLog(client: PluginClientContext) {
  const removeTransformer = client.addTimelineTransformer({
    id: kind,
    query: { itemType: "tool_call" },
    transform: ({ item }) => {
      const { detail } = item;
      // Native Task rows link to the child's timeline but do not render inline logs.
      if (detail.type !== "sub_agent" || detail.childSessionId || !detail.log?.trim()) return undefined;
      const error = item.status === "failed" ? item.error : null;
      const errorText = error == null || typeof error === "string" ? error : JSON.stringify(error, null, 2);
      return {
        items: [{
          type: "plugin",
          kind,
          version: 1,
          data: {
            description: detail.description ?? "",
            log: !errorText ? detail.log : `${detail.log}\n\n${errorText}`,
            failed: item.status === "failed",
          },
        }],
      };
    },
  });
  const removeRenderer = client.addTimelineRenderer({ kind, version: 1, schema, Component: AgentLog });
  return () => {
    removeTransformer();
    removeRenderer();
  };
}
