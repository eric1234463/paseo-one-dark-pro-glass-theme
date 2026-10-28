import type {
  PluginClientContext,
  PluginTimelineItemProps,
} from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/ui";
import type { AgentTimelineItem } from "@getpaseo/protocol/agent-types";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { z } from "zod";

// Collapses every tool call except plans into one colored line; tapping it opens
// a box with the full command, output or highlighted diff. MCP tool calls are
// hidden unless they failed. Icon names are Lucide export names (PascalCase):
// the host looks them up on the lucide module and renders nothing for kebab-case.

const KIND = "tool-line";
const VERSION = 3;
// SHORTCUT: keeps a bounded slice of output; move to an RPC fetch if full output is needed
const MAX_OUTPUT = 8000;

// One Dark Pro syntax colors (upstream bukitoka/one-dark-pro-max token colors).
const SYNTAX = {
  keyword: "#C678DD",
  string: "#98C379",
  number: "#D19A66",
  function: "#61AFEF",
  type: "#E5C07B",
  operator: "#56B6C2",
  variable: "#E06C75",
  comment: "#7F848E",
};

const ACTIONS = {
  shell: { icon: "SquareTerminal", title: "Ran", color: SYNTAX.function },
  read: { icon: "Eye", title: "Read", color: SYNTAX.comment },
  edit: { icon: "Pencil", title: "Edited", color: SYNTAX.type },
  write: { icon: "FilePlus", title: "Wrote", color: SYNTAX.type },
  search: { icon: "Search", title: "Searched", color: SYNTAX.comment },
  fetch: { icon: "Globe", title: "Fetched", color: SYNTAX.operator },
  worktree: { icon: "GitBranch", title: "Worktree", color: SYNTAX.string },
  agent: { icon: "Bot", title: "Agent", color: SYNTAX.keyword },
  other: { icon: "Wrench", title: "", color: SYNTAX.comment },
} as const;

type Action = keyof typeof ACTIONS;

const toolLineSchema = z.object({
  action: z.enum(Object.keys(ACTIONS) as [Action, ...Action[]]),
  icon: z.string(),
  title: z.string(),
  target: z.string(),
  isPath: z.boolean(),
  status: z.enum(["running", "completed", "failed", "canceled"]),
  output: z.string(),
  diff: z.object({ added: z.number(), removed: z.number() }).nullable(),
});

type ToolLineData = z.infer<typeof toolLineSchema>;
type ToolCallItem = Extract<AgentTimelineItem, { type: "tool_call" }>;
type Described = Omit<ToolLineData, "status">;

function clip(text: string, keepEnd: boolean): string {
  if (text.length <= MAX_OUTPUT) return text;
  return keepEnd ? `…${text.slice(-MAX_OUTPUT)}` : `${text.slice(0, MAX_OUTPUT)}…`;
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

function prefixLines(text: string, prefix: string): string[] {
  return text === "" ? [] : text.split("\n").map((line) => `${prefix}${line}`);
}

function described(
  action: Action,
  target: string,
  output: string,
  extra: Partial<Described> = {},
): Described {
  const { icon, title } = ACTIONS[action];
  return { action, icon, title, target, isPath: false, output, diff: null, ...extra };
}

function fileDiff(action: Action, filePath: string, diff: string): Described {
  const lines = diff.split("\n");
  return described(action, filePath, diff, {
    isPath: true,
    diff: {
      added: lines.filter((line) => line.startsWith("+") && !line.startsWith("+++")).length,
      removed: lines.filter((line) => line.startsWith("-") && !line.startsWith("---")).length,
    },
  });
}

// `cd <dir> && cmd` is noise in a one-line summary; show `cmd`.
function shellCommand(command: string): string {
  return command.replace(/^\s*cd\s+("[^"]*"|'[^']*'|\S+)\s*(&&|;)\s*/, "");
}

function describe(item: ToolCallItem): Described {
  const detail = item.detail;
  switch (detail.type) {
    case "shell":
      return described("shell", shellCommand(detail.command), detail.output ?? "");
    case "read":
      return described("read", detail.filePath, "", { isPath: true });
    case "edit":
      return fileDiff(
        "edit",
        detail.filePath,
        detail.unifiedDiff ??
          [
            ...prefixLines(detail.oldString ?? "", "-"),
            ...prefixLines(detail.newString ?? "", "+"),
          ].join("\n"),
      );
    case "write":
      return fileDiff("write", detail.filePath, prefixLines(detail.content ?? "", "+").join("\n"));
    case "search":
      return described(
        "search",
        detail.query,
        detail.content ?? detail.filePaths?.join("\n") ?? "",
      );
    case "fetch":
      return described("fetch", detail.url, detail.result ?? "");
    case "worktree_setup":
      return described("worktree", detail.branchName, detail.log);
    case "sub_agent":
      return described("agent", detail.description ?? "", detail.log, {
        title: detail.subAgentType ?? "Agent",
      });
    case "plain_text":
      return described("other", "", detail.text ?? "", {
        // Protocol icon names are snake_case (square_terminal); Lucide exports are PascalCase.
        icon: (detail.icon ?? "wrench")
          .split("_")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(""),
        title: detail.label ?? item.name,
      });
    default:
      return described("other", "", stringify(item.detail), { title: item.name });
  }
}

type Token = { text: string; color?: string };

const KEYWORDS = new Set(
  (
    "as async await break case catch class const continue def default delete do elif else " +
    "enum export extends false finally fn for from func function go if impl import in " +
    "instanceof interface let match new nil none null package pub return self static struct " +
    "super switch this throw true try type typeof undefined var void while with yield"
  ).split(" "),
);

// SHORTCUT: regex tokenizer, language-agnostic; swap for a real grammar if accuracy matters
const CODE_TOKEN =
  /(\/\/.*$|\/\*.*?(?:\*\/|$)|#\s.*$)|("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|`(?:[^`\\]|\\.)*`?)|(\b\d[\d_.]*\b)|([A-Za-z_$][\w$]*)|(=>|[=!<>]=?=?|&&|\|\||[+\-*/%?:])/g;

function highlightCode(line: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  for (const match of line.matchAll(CODE_TOKEN)) {
    const [text, comment, string, number, word, operator] = match;
    const index = match.index ?? 0;
    if (index > last) tokens.push({ text: line.slice(last, index) });
    let color: string | undefined;
    if (comment) color = SYNTAX.comment;
    else if (string) color = SYNTAX.string;
    else if (number) color = SYNTAX.number;
    else if (operator) color = SYNTAX.operator;
    else if (word) {
      if (KEYWORDS.has(word)) color = SYNTAX.keyword;
      else if (line[index + word.length] === "(") color = SYNTAX.function;
      else if (/^[A-Z]/.test(word)) color = SYNTAX.type;
    }
    tokens.push({ text, color });
    last = index + text.length;
  }
  if (last < line.length) tokens.push({ text: line.slice(last) });
  return tokens;
}

const SHELL_TOKEN =
  /(#\s.*$)|("(?:[^"\\]|\\.)*"?|'[^']*'?)|(\$\{?\w+\}?)|(\|\||&&|[|;<>]+)|([^\s|;&<>"'$]+)/g;

function highlightShell(command: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  let commandNext = true;
  for (const match of command.matchAll(SHELL_TOKEN)) {
    const [text, comment, string, variable, operator, word] = match;
    const index = match.index ?? 0;
    if (index > last) tokens.push({ text: command.slice(last, index) });
    let color: string | undefined;
    if (comment) color = SYNTAX.comment;
    else if (string) color = SYNTAX.string;
    else if (variable) color = SYNTAX.variable;
    else if (operator) {
      color = SYNTAX.operator;
      // Redirects (>, <) keep the current command; pipes and separators start a new one.
      commandNext = !/^[<>]+$/.test(operator);
    } else if (word) {
      if (commandNext) {
        color = SYNTAX.function;
        commandNext = false;
      } else if (word.startsWith("-")) color = SYNTAX.number;
    }
    tokens.push({ text, color });
    last = index + text.length;
  }
  if (last < command.length) tokens.push({ text: command.slice(last) });
  return tokens;
}

function tint(hex: string): string {
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? `${hex}26` : "transparent";
}

function Tokens({ tokens, fallback }: { tokens: Token[]; fallback: string }) {
  return tokens.map((token, index) => (
    <Text key={index} style={{ color: token.color ?? fallback }}>
      {token.text}
    </Text>
  ));
}

function ToolLine({ item, theme, layout }: PluginTimelineItemProps<ToolLineData>) {
  const { action, icon, title, target, isPath, status, output, diff } = item.data;
  const [expanded, setExpanded] = useState(status === "failed");
  const colors = theme.colors;
  const mono = layout.platform === "ios" ? "Menlo" : "monospace";
  const isShell = action === "shell";
  const expandable = isShell || Boolean(output);
  const actionColor = status === "failed" ? colors.statusDanger : ACTIONS[action].color;
  const statusIcon =
    status === "failed"
      ? { name: "CircleX", color: colors.statusDanger }
      : status === "canceled"
        ? { name: "Ban", color: colors.foregroundMuted }
        : status === "running"
          ? { name: "Loader", color: colors.accent }
          : null;
  const slash = target.lastIndexOf("/");

  const lineText = { fontSize: 11, fontFamily: mono, paddingHorizontal: 8 };
  const diffLine = (line: string, index: number) => {
    if (line.startsWith("@@") || line.startsWith("+++") || line.startsWith("---")) {
      const color = line.startsWith("@@") ? colors.accent : colors.foregroundMuted;
      return (
        <Text key={index} selectable style={{ ...lineText, color }}>
          {line}
        </Text>
      );
    }
    const sign = line.charAt(0);
    const added = sign === "+";
    const removed = sign === "-";
    const code = added || removed || sign === " " ? line.slice(1) : line;
    return (
      <Text
        key={index}
        selectable
        style={{
          ...lineText,
          backgroundColor: added
            ? tint(colors.statusSuccess)
            : removed
              ? tint(colors.statusDanger)
              : "transparent",
        }}
      >
        <Text
          style={{
            color: added
              ? colors.statusSuccess
              : removed
                ? colors.statusDanger
                : colors.foregroundMuted,
          }}
        >
          {added ? "+ " : removed ? "- " : "  "}
        </Text>
        <Tokens tokens={highlightCode(code)} fallback={colors.foreground} />
      </Text>
    );
  };

  return (
    <View style={{ marginVertical: 1 }}>
      <Pressable
        onPress={() => setExpanded((value) => !value)}
        disabled={!expandable}
        style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2 }}
      >
        <View style={{ width: 12 }}>
          {expandable ? (
            <Icon
              name={expanded ? "ChevronDown" : "ChevronRight"}
              size={12}
              color={colors.foregroundMuted}
            />
          ) : null}
        </View>
        <Icon name={icon} size={13} color={actionColor} />
        <Text style={{ color: actionColor, fontSize: 12, fontWeight: "600" }}>{title}</Text>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, fontFamily: mono }}>
          {isShell ? (
            <Tokens tokens={highlightShell(target.split("\n")[0])} fallback={colors.foreground} />
          ) : isPath && slash >= 0 ? (
            <>
              <Text style={{ color: colors.foregroundMuted }}>{target.slice(0, slash + 1)}</Text>
              <Text style={{ color: colors.foreground }}>{target.slice(slash + 1)}</Text>
            </>
          ) : (
            <Text style={{ color: colors.foregroundMuted }}>{target.split("\n")[0]}</Text>
          )}
        </Text>
        {diff ? (
          <Text style={{ fontSize: 11, fontFamily: mono }}>
            <Text style={{ color: colors.statusSuccess }}>+{diff.added}</Text>{" "}
            <Text style={{ color: colors.statusDanger }}>−{diff.removed}</Text>
          </Text>
        ) : null}
        {statusIcon && <Icon name={statusIcon.name} size={12} color={statusIcon.color} />}
      </Pressable>
      {expanded ? (
        <View
          style={{
            marginTop: 2,
            marginLeft: 18,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 6,
            backgroundColor: colors.surface1,
            overflow: "hidden",
          }}
        >
          {isShell ? (
            <Text
              selectable
              style={{
                fontSize: 12,
                fontFamily: mono,
                paddingHorizontal: 8,
                paddingVertical: 6,
                borderBottomWidth: output ? 1 : 0,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ color: colors.accent }}>$ </Text>
              <Tokens tokens={highlightShell(target)} fallback={colors.foreground} />
            </Text>
          ) : null}
          {output ? (
            <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ paddingVertical: 6 }}>
              {diff ? (
                output.split("\n").map(diffLine)
              ) : (
                <Text
                  selectable
                  style={{
                    color: colors.foregroundMuted,
                    fontSize: 11,
                    fontFamily: mono,
                    paddingHorizontal: 8,
                  }}
                >
                  {output}
                </Text>
              )}
            </ScrollView>
          ) : null}
        </View>
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
      // MCP calls (mcp__<server>__<tool>) are noise; keep failures visible.
      if (item.name.startsWith("mcp__") && item.status !== "failed") return { items: [] };
      const base = describe(item);
      const error = item.status === "failed" ? stringify(item.error) : "";
      const data: ToolLineData = {
        ...base,
        status: item.status,
        output: clip([base.output, error].filter(Boolean).join("\n\n"), base.diff === null),
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
