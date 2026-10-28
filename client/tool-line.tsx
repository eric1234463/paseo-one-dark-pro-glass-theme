import type {
  PluginClientContext,
  PluginTimelineItemProps,
} from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/react-native";
import type { AgentTimelineItem } from "@getpaseo/protocol/agent-types";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { z } from "zod";

// Collapses every tool call except plans into one tappable line with an icon.
// Plans, permission prompts and assistant messages keep Paseo's native rendering.

const KIND = "tool-line";
const VERSION = 1;
// SHORTCUT: keeps the output tail only; move to an RPC fetch if full output is needed
const MAX_OUTPUT = 8000;

const toolLineSchema = z.object({
  icon: z.string(),
  title: z.string(),
  summary: z.string(),
  status: z.enum(["running", "completed", "failed", "canceled"]),
  output: z.string(),
});

type ToolLineData = z.infer<typeof toolLineSchema>;
type ToolCallItem = Extract<AgentTimelineItem, { type: "tool_call" }>;

function tail(text: string | undefined): string {
  if (!text) return "";
  return text.length > MAX_OUTPUT ? `…${text.slice(-MAX_OUTPUT)}` : text;
}

function stringify(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function describe(item: ToolCallItem): Omit<ToolLineData, "status"> {
  const detail = item.detail;
  switch (detail.type) {
    case "shell":
      return {
        icon: "square-terminal",
        title: "Shell",
        summary: detail.command,
        output: detail.output ?? "",
      };
    case "read":
      return { icon: "eye", title: "Read", summary: detail.filePath, output: detail.content ?? "" };
    case "edit":
      return {
        icon: "pencil",
        title: "Edit",
        summary: detail.filePath,
        output: detail.unifiedDiff ?? detail.newString ?? "",
      };
    case "write":
      return { icon: "file-plus", title: "Write", summary: detail.filePath, output: detail.content ?? "" };
    case "search":
      return {
        icon: "search",
        title: detail.toolName ?? "Search",
        summary: detail.query,
        output: detail.content ?? detail.filePaths?.join("\n") ?? "",
      };
    case "fetch":
      return { icon: "globe", title: "Fetch", summary: detail.url, output: detail.result ?? "" };
    case "worktree_setup":
      return { icon: "git-branch", title: "Worktree", summary: detail.branchName, output: detail.log };
    case "sub_agent":
      return {
        icon: "bot",
        title: detail.subAgentType ?? "Agent",
        summary: detail.description ?? "",
        output: detail.log,
      };
    case "plain_text":
      return {
        icon: (detail.icon ?? "wrench").replace(/_/g, "-"),
        title: detail.label ?? item.name,
        summary: "",
        output: detail.text ?? "",
      };
    default:
      return { icon: "wrench", title: item.name, summary: "", output: stringify(item.detail) };
  }
}

function ToolLine({ item, theme, layout }: PluginTimelineItemProps<ToolLineData>) {
  const { icon, title, summary, status, output } = item.data;
  const [expanded, setExpanded] = useState(status === "failed");
  const colors = theme.colors;
  const mono = layout.platform === "ios" ? "Menlo" : "monospace";
  const statusIcon =
    status === "failed"
      ? { name: "circle-x", color: colors.statusDanger }
      : status === "canceled"
        ? { name: "ban", color: colors.foregroundMuted }
        : status === "running"
          ? { name: "loader", color: colors.accent }
          : null;

  return (
    <View style={{ paddingVertical: 2 }}>
      <Pressable
        onPress={() => setExpanded((value) => !value)}
        disabled={!output}
        style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
      >
        <Icon name={icon} size={13} color={colors.foregroundMuted} />
        <Text style={{ color: colors.foregroundMuted, fontSize: 12, fontWeight: "600" }}>
          {title}
        </Text>
        <Text
          numberOfLines={1}
          style={{ flex: 1, color: colors.foregroundMuted, fontSize: 12, fontFamily: mono }}
        >
          {summary.split("\n")[0]}
        </Text>
        {statusIcon && <Icon name={statusIcon.name} size={12} color={statusIcon.color} />}
        {output ? (
          <Icon
            name={expanded ? "chevron-down" : "chevron-right"}
            size={12}
            color={colors.foregroundMuted}
          />
        ) : null}
      </Pressable>
      {expanded && output ? (
        <ScrollView
          style={{
            maxHeight: 240,
            marginTop: 4,
            marginLeft: 6,
            paddingLeft: 12,
            borderLeftWidth: 1,
            borderLeftColor: colors.border,
          }}
        >
          <Text selectable style={{ color: colors.foreground, fontSize: 11, fontFamily: mono }}>
            {output}
          </Text>
        </ScrollView>
      ) : null}
    </View>
  );
}

export function contributeToolLine(client: PluginClientContext) {
  const removeTransformer = client.addTimelineTransformer({
    id: KIND,
    query: { itemType: "tool_call" },
    transform: ({ item }) => {
      if (item.detail.type === "plan") return undefined;
      const described = describe(item);
      const error = item.status === "failed" ? stringify(item.error) : "";
      const data: ToolLineData = {
        ...described,
        status: item.status,
        output: tail([described.output, error].filter(Boolean).join("\n\n")),
      };
      return { items: [{ type: "plugin", kind: KIND, version: VERSION, data }] };
    },
  });
  const removeRenderer = client.addTimelineRenderer({
    kind: KIND,
    version: VERSION,
    schema: toolLineSchema,
    Component: ToolLine,
  });
  return () => {
    removeTransformer();
    removeRenderer();
  };
}
