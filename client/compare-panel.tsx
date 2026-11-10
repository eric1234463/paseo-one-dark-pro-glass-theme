import type {
  PluginClientContext,
  PluginWorkspacePanelProps,
} from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { Icon, TextInput } from "@getpaseo/plugin/client/ui";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { compareDiffRpc, compareInfoRpc } from "../shared/compare";
import { highlightCode, tint, Tokens } from "./syntax";

// Compare panel: current branch vs a selectable base branch.
// Paseo's native diff has no branch picker; the daemon runs git and this
// panel renders the unified diff with the One Dark Pro colors.

type FileSection = {
  path: string;
  lines: string[];
  added: number;
  removed: number;
};

function parseDiff(diff: string): FileSection[] {
  const sections: FileSection[] = [];
  let current: FileSection | null = null;
  const push = () => {
    if (current) sections.push(current);
    current = null;
  };
  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) {
      push();
      const m = line.match(/ b\/(.+)$/);
      current = { path: m?.[1] ?? line.slice("diff --git ".length), lines: [line], added: 0, removed: 0 };
      continue;
    }
    if (!current) {
      // Diff without `diff --git` headers (e.g. --no-index edge): group as one file.
      current = { path: "changes", lines: [], added: 0, removed: 0 };
    }
    current.lines.push(line);
    if (line.startsWith("+") && !line.startsWith("+++")) current.added += 1;
    else if (line.startsWith("-") && !line.startsWith("---")) current.removed += 1;
    const plus = line.match(/^\+\+\+ b\/(.+)$/);
    if (plus && current.path === "changes") current.path = plus[1];
  }
  push();
  return sections.filter((s) => s.lines.length > 0);
}

function FileDiff({
  section,
  mono,
  foreground,
  foregroundMuted,
  accent,
  success,
  danger,
}: {
  section: FileSection;
  mono: string;
  foreground: string;
  foregroundMuted: string;
  accent: string;
  success: string;
  danger: string;
}) {
  const lineText = { fontSize: 11, fontFamily: mono, paddingHorizontal: 8 };
  return (
    <View>
      {section.lines.map((line, i) => {
        if (line.startsWith("@@") || line.startsWith("+++") || line.startsWith("---") || line.startsWith("diff --git") || line.startsWith("index ")) {
          const color = line.startsWith("@@") ? accent : foregroundMuted;
          return (
            <Text key={i} selectable style={{ ...lineText, color }}>
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
            key={i}
            selectable
            style={{
              ...lineText,
              backgroundColor: added ? tint(success) : removed ? tint(danger) : "transparent",
            }}
          >
            <Text style={{ color: added ? success : removed ? danger : foregroundMuted }}>
              {added ? "+ " : removed ? "- " : "  "}
            </Text>
            <Tokens tokens={highlightCode(code)} fallback={foreground} />
          </Text>
        );
      })}
    </View>
  );
}

function ComparePanel({ workspaceId, theme }: PluginWorkspacePanelProps) {
  const colors = theme.colors;
  const mono = "monospace";
  const getInfo = useRpc(compareInfoRpc);
  const getDiff = useRpc(compareDiffRpc);

  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [baseInput, setBaseInput] = useState("");
  const [appliedBase, setAppliedBase] = useState("");
  const [branches, setBranches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [sections, setSections] = useState<FileSection[]>([]);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [diffTooLarge, setDiffTooLarge] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const loadInfo = useCallback(
    async (query: string) => {
      try {
        const res = await getInfo({ workspaceId, query, limit: 50 });
        if (res.error && !res.isGit) setInfoError(res.error);
        else setInfoError(null);
        setCurrentBranch(res.currentBranch);
        setBranches(res.branches ?? []);
        if (res.defaultBase && !appliedBase) {
          setAppliedBase(res.defaultBase);
          setBaseInput((cur) => cur || res.defaultBase!);
        }
      } catch (e) {
        setInfoError(e instanceof Error ? e.message : String(e));
      }
    },
    // appliedBase is intentionally read, not tracked, to seed once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getInfo, workspaceId],
  );

  const loadDiff = useCallback(
    async (base: string) => {
      if (!base) return;
      setRefreshing(true);
      setDiffError(null);
      try {
        const res = await getDiff({ workspaceId, baseRef: base, ignoreWhitespace });
        if (res.error) {
          setDiffError(res.error);
          setSections([]);
        } else {
          setCurrentBranch(res.currentBranch);
          setSections(parseDiff(res.diff));
          setDiffTooLarge(res.truncated);
          // Collapsed by default: file list only, diff renders on expand.
          setExpanded({});
        }
      } catch (e) {
        setDiffError(e instanceof Error ? e.message : String(e));
        setSections([]);
      } finally {
        setRefreshing(false);
        setLoading(false);
      }
    },
    [getDiff, ignoreWhitespace, workspaceId],
  );

  useEffect(() => {
    setLoading(true);
    loadInfo("").finally(() => setLoading(false));
  }, [loadInfo, workspaceId]);

  useEffect(() => {
    if (appliedBase) loadDiff(appliedBase);
  }, [appliedBase, loadDiff]);

  useEffect(() => {
    const t = setTimeout(() => loadInfo(baseInput), 300);
    return () => clearTimeout(t);
  }, [baseInput, loadInfo]);

  const added = sections.reduce((n, s) => n + s.added, 0);
  const removed = sections.reduce((n, s) => n + s.removed, 0);
  const applyBase = (base: string) => {
    const next = base.trim();
    if (!next) return;
    setBaseInput(next);
    setAppliedBase(next);
    setExpanded({});
    setShowSuggestions(false);
  };

  return (
    <View style={{ flex: 1, padding: 12, gap: 10 }}>
      {infoError ? (
        <View
          style={{ borderWidth: 1, borderColor: colors.statusDanger, borderRadius: 6, padding: 10 }}
        >
          <Text style={{ color: colors.statusDanger, fontSize: 12 }}>{infoError}</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <Icon name="GitBranch" size={13} color={colors.accent} />
        <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: mono, flexShrink: 1 }}>
          <Text style={{ color: colors.foregroundMuted }}>current </Text>
          <Text style={{ color: colors.foreground }}>{currentBranch ?? "…"}</Text>
          <Text style={{ color: colors.foregroundMuted }}> vs </Text>
          <Text style={{ color: colors.accent }}>{appliedBase || "…"}</Text>
        </Text>
      </View>

      <View style={{ gap: 4 }}>
        <Text style={{ color: colors.foregroundMuted, fontSize: 11 }}>Base branch</Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <View style={{ flex: 1 }}>
            <TextInput
              value={baseInput}
              onChangeText={(text) => {
                setBaseInput(text);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="main"
              placeholderTextColor={colors.foregroundMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 6,
                fontSize: 12,
                fontFamily: mono,
                color: colors.foreground,
                backgroundColor: colors.surface0,
              }}
            />
          </View>
          <Pressable
            onPress={() => applyBase(baseInput)}
            disabled={refreshing || !baseInput.trim()}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 6,
              paddingHorizontal: 10,
              justifyContent: "center",
              backgroundColor: tint(colors.accent, "1F"),
              opacity: refreshing || !baseInput.trim() ? 0.5 : 1,
            }}
          >
            <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "600" }}>
              {refreshing ? "…" : "Compare"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => appliedBase && loadDiff(appliedBase)}
            disabled={refreshing || !appliedBase}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 6,
              paddingHorizontal: 8,
              justifyContent: "center",
              opacity: refreshing || !appliedBase ? 0.5 : 1,
            }}
          >
            <Icon name="RefreshCw" size={13} color={colors.foregroundMuted} />
          </Pressable>
        </View>
        {showSuggestions && branches.length > 0 ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 6,
              backgroundColor: colors.surface0,
              maxHeight: 160,
              overflow: "hidden",
            }}
          >
            <ScrollView>
              {branches
                .filter((b) => !baseInput || b.toLowerCase().includes(baseInput.toLowerCase()))
                .slice(0, 20)
                .map((branch) => (
                  <Pressable
                    key={branch}
                    onPress={() => applyBase(branch)}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 6,
                      backgroundColor:
                        branch === appliedBase ? tint(colors.accent, "26") : "transparent",
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 12,
                        fontFamily: mono,
                        color: branch === appliedBase ? colors.accent : colors.foreground,
                      }}
                    >
                      {branch}
                    </Text>
                  </Pressable>
                ))}
            </ScrollView>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable
          onPress={() => setIgnoreWhitespace((v) => !v)}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <Icon
            name={ignoreWhitespace ? "SquareCheck" : "Square"}
            size={13}
            color={ignoreWhitespace ? colors.accent : colors.foregroundMuted}
          />
          <Text style={{ color: colors.foregroundMuted, fontSize: 11 }}>Ignore whitespace</Text>
        </Pressable>
        <Text style={{ fontSize: 11, fontFamily: mono }}>
          <Text style={{ color: colors.foregroundMuted }}>
            {loading ? "Loading…" : `${sections.length} files `}
          </Text>
          <Text style={{ color: colors.statusSuccess }}>+{added}</Text>
          <Text style={{ color: colors.foregroundMuted }}> </Text>
          <Text style={{ color: colors.statusDanger }}>−{removed}</Text>
        </Text>
      </View>

      {diffError ? (
        <View
          style={{ borderWidth: 1, borderColor: colors.statusDanger, borderRadius: 6, padding: 10 }}
        >
          <Text style={{ color: colors.statusDanger, fontSize: 12 }}>{diffError}</Text>
        </View>
      ) : null}
      {diffTooLarge ? (
        <Text style={{ color: colors.statusWarning, fontSize: 11 }}>
          Diff truncated by the plugin (too large).
        </Text>
      ) : null}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24, gap: 8 }}>
        {!loading && !diffError && sections.length === 0 ? (
          <Text style={{ color: colors.foregroundMuted, fontSize: 12 }}>
            No differences between {currentBranch ?? "current"} and {appliedBase || "base"}.
          </Text>
        ) : null}
        {sections.map((section) => {
          const open = Boolean(expanded[section.path]);
          const slash = section.path.lastIndexOf("/");
          return (
            <View
              key={section.path}
              style={{
                borderWidth: 1,
                borderColor: tint(colors.accent, "55"),
                borderRadius: 6,
                backgroundColor: colors.surface0,
                overflow: "hidden",
              }}
            >
              <Pressable
                onPress={() =>
                  setExpanded((prev) => ({ ...prev, [section.path]: !prev[section.path] }))
                }
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                  backgroundColor: tint(colors.accent, open ? "26" : "14"),
                }}
              >
                <Icon
                  name={open ? "ChevronDown" : "ChevronRight"}
                  size={12}
                  color={colors.foregroundMuted}
                />
                <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, fontFamily: mono }}>
                  {slash >= 0 ? (
                    <>
                      <Text style={{ color: colors.foregroundMuted }}>
                        {section.path.slice(0, slash + 1)}
                      </Text>
                      <Text style={{ color: colors.foreground }}>
                        {section.path.slice(slash + 1)}
                      </Text>
                    </>
                  ) : (
                    <Text style={{ color: colors.foreground }}>{section.path}</Text>
                  )}
                </Text>
                <Text style={{ fontSize: 11, fontFamily: mono }}>
                  <Text style={{ color: colors.statusSuccess }}>+{section.added}</Text>{" "}
                  <Text style={{ color: colors.statusDanger }}>−{section.removed}</Text>
                </Text>
              </Pressable>
              {open ? (
                <View style={{ paddingVertical: 6 }}>
                  <FileDiff
                    section={section}
                    mono={mono}
                    foreground={colors.foreground}
                    foregroundMuted={colors.foregroundMuted}
                    accent={colors.accent}
                    success={colors.statusSuccess}
                    danger={colors.statusDanger}
                  />
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function contributeComparePanel(client: PluginClientContext) {
  return client.addWorkspacePanel({
    id: "compare",
    title: "Compare",
    icon: "GitBranch",
    Component: ComparePanel,
  });
}
