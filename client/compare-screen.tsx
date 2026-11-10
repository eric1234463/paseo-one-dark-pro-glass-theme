import type {
  PluginClientContext,
  PluginScreenProps,
  PluginSidebarItemProps,
} from "@getpaseo/plugin/client";
import { usePaseo } from "@getpaseo/plugin/client";
import { Icon, SidebarRow } from "@getpaseo/plugin/client/ui";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { CompareView } from "./compare-view";

const SCREEN_ID = "compare";

type WorkspaceEntry = {
  id: string;
  name: string;
  title?: string | null;
  projectDisplayName: string;
};

function CompareScreen({ theme }: PluginScreenProps) {
  const paseo = usePaseo();
  const colors = theme.colors;
  const mono = "monospace";
  const [entries, setEntries] = useState<WorkspaceEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // SHORTCUT: single page of 100; add pagination if the workspace list outgrows it
      const res = await paseo.workspaces.list({ page: { limit: 100 } });
      setEntries(
        (res.entries ?? []).map((e) => ({
          id: e.id,
          name: e.name,
          title: e.title,
          projectDisplayName: e.projectDisplayName,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [paseo]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = entries.find((e) => e.id === selectedId) ?? null;

  if (selected) {
    return (
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Icon name="FolderGit2" size={13} color={colors.accent} />
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, fontFamily: mono }}>
            <Text style={{ color: colors.foreground }}>{selected.title || selected.name}</Text>
            <Text style={{ color: colors.foregroundMuted }}> · {selected.projectDisplayName}</Text>
          </Text>
          <Pressable
            onPress={() => setSelectedId(null)}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <Text style={{ color: colors.accent, fontSize: 11 }}>Switch</Text>
          </Pressable>
        </View>
        <CompareView workspaceId={selected.id} theme={theme} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 12, gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon name="GitBranch" size={13} color={colors.accent} />
        <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>
          Compare — pick a workspace
        </Text>
        <Pressable onPress={load} disabled={loading} style={{ opacity: loading ? 0.5 : 1 }}>
          <Icon name="RefreshCw" size={13} color={colors.foregroundMuted} />
        </Pressable>
      </View>
      {error ? (
        <View
          style={{ borderWidth: 1, borderColor: colors.statusDanger, borderRadius: 6, padding: 10 }}
        >
          <Text style={{ color: colors.statusDanger, fontSize: 12 }}>{error}</Text>
        </View>
      ) : null}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24, gap: 6 }}>
        {loading ? (
          <Text style={{ color: colors.foregroundMuted, fontSize: 12 }}>Loading workspaces…</Text>
        ) : entries.length === 0 ? (
          <Text style={{ color: colors.foregroundMuted, fontSize: 12 }}>No workspaces found.</Text>
        ) : (
          entries.map((entry) => (
            <Pressable
              key={entry.id}
              onPress={() => setSelectedId(entry.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 6,
                backgroundColor: colors.surface0,
                paddingHorizontal: 10,
                paddingVertical: 8,
              }}
            >
              <Icon name="FolderGit2" size={13} color={colors.foregroundMuted} />
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, fontFamily: mono }}>
                <Text style={{ color: colors.foreground }}>{entry.title || entry.name}</Text>
                <Text style={{ color: colors.foregroundMuted }}> · {entry.projectDisplayName}</Text>
              </Text>
              <Icon name="ChevronRight" size={12} color={colors.foregroundMuted} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function CompareSidebarItem(props: PluginSidebarItemProps) {
  return (
    <SidebarRow
      icon="GitBranch"
      label="Compare"
      active={props.currentScreen?.screenId === SCREEN_ID}
      onPress={() => props.openScreen({ screenId: SCREEN_ID })}
    />
  );
}

export function contributeCompare(client: PluginClientContext) {
  const removeScreen = client.addScreen({
    id: SCREEN_ID,
    title: "Compare",
    Component: CompareScreen,
  });
  const removeItem = client.addSidebarHeaderItem({
    id: "compare",
    title: "Compare",
    Component: CompareSidebarItem,
  });
  return () => {
    removeScreen();
    removeItem();
  };
}
