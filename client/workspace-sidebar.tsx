import type { PluginSidebarViewProps, ProjectRef, WorkspaceRef } from "@getpaseo/plugin/client";
import { getPaseoClient, useAgents, useHosts, usePaseo, useProject, useProjects, useWorkspace, useWorkspaces } from "@getpaseo/plugin/client";
import { Icon, Modal } from "@getpaseo/plugin/client/ui";
import { useQueries } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { providerIconFallbacks } from "./provider-icons";
import { tint } from "./syntax";

type Colors = PluginSidebarViewProps["theme"]["colors"];
type WorkspaceList = ReturnType<typeof getPaseoClient>["workspaces"]["list"];
type PullRequest = NonNullable<NonNullable<Awaited<ReturnType<WorkspaceList>>["entries"][number]["githubRuntime"]>["pullRequest"]>;
type ProviderDisplay = { label: string; iconSvg?: string };
type ArchiveTarget = { reference: WorkspaceRef; title: string; worktree: boolean };

function ActivityIcon({ color, size, animate }: { color: string; size: number; animate: boolean }) {
  const [rotation] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!animate) return;
    const animation = Animated.loop(Animated.timing(rotation, {
      toValue: 1,
      duration: 1100,
      easing: Easing.linear,
      useNativeDriver: Platform.OS !== "web",
      isInteraction: false,
    }));
    animation.start();
    return () => {
      animation.stop();
      rotation.setValue(0);
    };
  }, [animate, rotation]);

  return (
    <Animated.View style={animate ? {
      transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }],
    } : undefined}>
      <Icon name="LoaderCircle" size={size} color={color} />
    </Animated.View>
  );
}

function SidebarRow({
  colors,
  style,
  selected,
  ...props
}: Omit<ComponentProps<typeof Pressable>, "style"> & {
  colors: Colors;
  style?: ComponentProps<typeof View>["style"];
  selected?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.row,
        style,
        {
          backgroundColor: selected || pressed ? colors.surface2 : hovered ? colors.surface1 : "transparent",
          borderColor: focused ? colors.accent : "transparent",
        },
      ]}
    />
  );
}

function ProjectChoice({ reference, hostLabel, colors, onPress }: {
  reference: ProjectRef;
  hostLabel?: string;
  colors: Colors;
  onPress: () => void;
}) {
  const name = useProject(reference, (project) => project.displayName);
  if (!name) return null;

  return (
    <SidebarRow
      colors={colors}
      accessibilityLabel={hostLabel ? `${name}, ${hostLabel}` : name}
      onPress={onPress}
      style={styles.touchRow}
    >
      <Icon name="Folder" size={15} color={colors.foregroundMuted} />
      <View style={styles.workspaceContent}>
        <Text numberOfLines={1} style={[styles.workspaceTitle, { color: colors.foreground }]}>{name}</Text>
        {hostLabel && <Text style={[styles.projectName, { color: colors.foregroundMuted }]}>{hostLabel}</Text>}
      </View>
    </SidebarRow>
  );
}

function WorkspaceRow({
  reference,
  active,
  layout,
  navigation,
  theme: { colors },
  pullRequest,
  provider,
  animate,
  now,
  onArchive,
}: PluginSidebarViewProps & {
  reference: WorkspaceRef;
  pullRequest?: PullRequest;
  provider?: ProviderDisplay;
  animate: boolean;
  now: number;
  onArchive: (target: ArchiveTarget) => void;
}) {
  const workspace = useWorkspace(reference);
  if (!workspace) return null;

  const title = workspace.title ?? workspace.name;
  const timestamp = workspace.lastPromptAt ?? workspace.createdAt;
  const minutes = timestamp ? Math.max(0, Math.floor((now - Date.parse(timestamp)) / 60_000)) : null;
  const unit = minutes === null || minutes < 60 ? { name: "minute", duration: 1 } :
    minutes < 1440 ? { name: "hour", duration: 60 } : { name: "day", duration: 1440 };
  const age = minutes === null ? null : Math.floor(minutes / unit.duration);
  const time = age === null ? null : age === 0 ? "now" : `${age}${unit.name[0]}`;
  const elapsed = age === null ? null : age === 0 ? "Just now" : `${age} ${unit.name}${age === 1 ? "" : "s"} ago`;
  const selected = active.workspace?.key === reference.key;
  const status = {
    running: { icon: "CircleDot", color: colors.accent },
    needs_input: { icon: "CircleAlert", color: colors.statusWarning },
    attention: { icon: "Bell", color: colors.statusWarning },
    failed: { icon: "CircleX", color: colors.statusDanger },
    done: null,
  }[workspace.indicator];
  const state = pullRequest?.state.toLowerCase();
  const prState = pullRequest && (
    pullRequest.isMerged || state === "merged" ? "Merged" :
    state === "closed" ? "Closed" :
    pullRequest.isDraft ? "Draft" :
    state === "open" || state === "opened" ? "Open" : pullRequest.state
  );
  const prLabel = pullRequest && (pullRequest.number === undefined ? prState : `#${pullRequest.number} ${prState}`);
  const checks = pullRequest?.checksStatus;
  const check = checks === "success" ? { icon: "Check", label: "Checks passed", color: colors.statusSuccess } :
    checks === "failure" ? { icon: "CircleX", label: "Checks failed", color: colors.statusDanger } :
    checks === "pending" ? { icon: "LoaderCircle", label: "Checks pending", color: colors.statusWarning } :
    null;
  const prColor = prState === "Open" ? colors.statusSuccess :
    prState === "Merged" ? colors.accent :
    prState === "Closed" ? colors.statusDanger : colors.foregroundMuted;

  return (
    <View style={styles.workspaceActions}>
      <SidebarRow
        colors={colors}
        selected={selected}
        accessibilityState={{ selected }}
        accessibilityLabel={[title, workspace.projectDisplayName, elapsed, provider?.label, workspace.indicatorLabel, prLabel && `Pull request ${prLabel}`, check?.label].filter(Boolean).join(", ")}
        onPress={() => navigation.openWorkspace(reference)}
        style={[styles.workspaceRow, layout.compact && styles.touchRow]}
      >
        <View style={styles.workspaceContent}>
          <Text numberOfLines={1} style={[styles.workspaceTitle, { color: colors.foreground }]}>
            {title}
          </Text>
          <View style={styles.prStatus}>
            <Text numberOfLines={1} style={[styles.projectName, { color: colors.foregroundMuted }]}>
              {workspace.projectDisplayName}
            </Text>
            {prLabel && (
              <View style={styles.prStatus}>
                <Icon name={prState === "Merged" ? "GitMerge" : "GitPullRequest"} size={12} color={prColor} />
                <Text style={[styles.prLabel, { color: prColor }]}>{prLabel}</Text>
              </View>
            )}
            {check && (
              <View style={styles.prStatus}>
                {checks === "pending" ? (
                  <ActivityIcon size={12} color={check.color} animate={animate} />
                ) : (
                  <Icon name={check.icon} size={12} color={check.color} />
                )}
                <Text numberOfLines={1} style={[styles.prLabel, { color: colors.foregroundMuted }]}>{check.label}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.trailing}>
          {time && <Text style={[styles.time, { color: colors.foregroundMuted }]}>{time}</Text>}
          {(status || provider) && (
            <View style={styles.rowIcons}>
              {workspace.indicator === "running" && status ? (
                <ActivityIcon size={14} color={status.color} animate={animate} />
              ) : status && (
                <Icon name={status.icon} size={14} color={status.color} />
              )}
              {provider && (
                <Icon
                  icon={provider.iconSvg ? { svg: provider.iconSvg } : "Bot"}
                  size={16}
                  color={colors.foregroundMuted}
                />
              )}
            </View>
          )}
        </View>
      </SidebarRow>
      <SidebarRow
        colors={colors}
        accessibilityLabel={`Archive ${title}`}
        accessibilityState={{ disabled: Boolean(workspace.archivingAt) }}
        disabled={Boolean(workspace.archivingAt)}
        onPress={() => onArchive({ reference, title, worktree: workspace.kind === "worktree" })}
        style={[styles.archiveAction, layout.compact && styles.touchAction]}
      >
        <Icon name="Archive" size={15} color={colors.foregroundMuted} />
      </SidebarRow>
    </View>
  );
}

export function WorkspaceSidebar(props: PluginSidebarViewProps) {
  const { theme: { colors }, layout } = props;
  const paseo = usePaseo();
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [choosingProject, setChoosingProject] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<ArchiveTarget | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const archiveInFlight = useRef(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let active = true;
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
      active = false;
      setReduceMotion(enabled);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    }).catch(() => {});
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const hosts = useHosts().filter((host) => host.status === "online");
  const projects = useProjects({ hosts: hosts.map((host) => host.serverId), orderBy: "displayName" });
  const providerCatalogs = useQueries({
    queries: hosts.map(({ serverId }) => ({
      queryKey: ["sidebar-providers", serverId],
      staleTime: 60_000,
      queryFn: async () => {
        const { entries } = await getPaseoClient(serverId).providers.snapshot();
        return new Map(entries.map((entry) => [entry.provider, entry]));
      },
    })),
  });
  const providersByHost = new Map(hosts.map(({ serverId }, index) => [serverId, providerCatalogs[index]?.data]));
  const activeAgent = props.active.agent?.key;
  const providerByWorkspace = new Map(useAgents({
    where: (agent) => !agent.background && (agent.parentAgentId === null || agent.ref.key === activeAgent),
    orderBy: (left, right) =>
      Number(right.ref.key === activeAgent) - Number(left.ref.key === activeAgent) ||
      right.lastActivityAt.localeCompare(left.lastActivityAt),
    groupBy: (agent) => ({ key: agent.workspace.key, title: agent.provider }),
  }).map((group) => [group.key, group.title]));
  const pullRequests = useQueries({
    queries: hosts.map(({ serverId }) => ({
      queryKey: ["sidebar-pull-requests", serverId],
      staleTime: 30_000,
      refetchInterval: 30_000,
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        const { workspaces } = getPaseoClient(serverId);
        const result = new Map<string, PullRequest>();
        let cursor: string | undefined;
        do {
          const page = await workspaces.list({
            filter: { includeBackground: true },
            page: { limit: 200, cursor },
          });
          for (const workspace of page.entries) {
            const pr = workspace.githubRuntime?.pullRequest;
            if (pr) result.set(workspace.id, pr);
          }
          cursor = page.pageInfo.nextCursor ?? undefined;
        } while (cursor && !signal.aborted);
        return result;
      },
    })),
  });
  const prByHost = new Map(hosts.map(({ serverId }, index) => [serverId, pullRequests[index]?.data]));
  const sections = useWorkspaces({
    orderBy: (left, right) =>
      (right.lastPromptAt ?? right.createdAt ?? "").localeCompare(left.lastPromptAt ?? left.createdAt ?? ""),
    groupBy: (workspace) => workspace.indicator === "done" || workspace.indicator === "attention" ? "Done" : "Working",
  });

  function toggle(key: string) {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function confirmArchive() {
    if (!archiveTarget || archiveInFlight.current) return;
    archiveInFlight.current = true;
    setArchiving(true);
    setArchiveError(null);
    try {
      const result = await paseo.workspaces.ref(archiveTarget.reference).archive();
      if (result.error) throw new Error(result.error);
      setArchiveTarget(null);
    } catch (error) {
      setArchiveError(error instanceof Error ? error.message : "Could not archive the workspace.");
    } finally {
      archiveInFlight.current = false;
      setArchiving(false);
    }
  }

  function dismissArchive() {
    if (!archiveInFlight.current) setArchiveTarget(null);
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={[styles.createSection, { backgroundColor: colors.surface1 }]}>
        <SidebarRow
          colors={colors}
          accessibilityLabel="New workspace, choose a project"
          onPress={() => setChoosingProject(true)}
          style={[styles.createRow, layout.compact && styles.touchRow]}
        >
          <Icon name="Plus" size={16} color={colors.accent} />
          <Text style={[styles.workspaceTitle, { color: colors.foreground }]}>New workspace</Text>
        </SidebarRow>
      </View>
      {(["Working", "Done"] as const).map((title) => {
        const items = sections.find((section) => section.key === title)?.items ?? [];
        const count = items.length;
        const expanded = !collapsed.has(title);
        const working = title === "Working";
        const sectionColor = working ? colors.accent : colors.statusSuccess;
        return (
          <View key={title}>
            <SidebarRow
              colors={colors}
              accessibilityLabel={`${title}, ${count} workspaces`}
              accessibilityState={{ expanded }}
              onPress={() => toggle(title)}
              style={[styles.sectionHeader, layout.compact && styles.touchRow]}
            >
              <View style={[styles.sectionLabel, { backgroundColor: tint(sectionColor, "24") }]}>
                <Text style={[styles.sectionTitle, { color: sectionColor }]}>{title}</Text>
                <Text style={[styles.count, { color: colors.foregroundMuted }]}>{count}</Text>
              </View>
              <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />
              <Icon name={expanded ? "ChevronDown" : "ChevronRight"} size={14} color={colors.foregroundMuted} />
            </SidebarRow>
            {expanded && count === 0 && (
              <Text style={[styles.empty, { color: colors.foregroundMuted }]}>
                {working ? "No workspaces in progress" : "No completed workspaces"}
              </Text>
            )}
            {expanded && items.map((reference) => {
              const providerId = providerByWorkspace.get(reference.key);
              const entry = providerId ? providersByHost.get(reference.hostId)?.get(providerId) : undefined;
              const provider = providerId ? {
                label: entry?.label ?? providerId,
                iconSvg: entry?.iconSvg ?? providerIconFallbacks.get(providerId),
              } : undefined;
              return (
                <WorkspaceRow
                  key={reference.key}
                  reference={reference}
                  pullRequest={prByHost.get(reference.hostId)?.get(reference.id)}
                  provider={provider}
                  animate={!reduceMotion}
                  now={now}
                  onArchive={(target) => {
                    setArchiveError(null);
                    setArchiveTarget(target);
                  }}
                  {...props}
                />
              );
            })}
          </View>
        );
      })}
      {choosingProject && (
        <Modal title="Choose a project" open={choosingProject} onOpenChange={setChoosingProject}>
          <Modal.Content>
            {projects.length === 0 && (
              <Text style={[styles.empty, { color: colors.foregroundMuted }]}>No projects on connected hosts</Text>
            )}
            {projects.map((reference) => (
              <ProjectChoice
                key={reference.key}
                reference={reference}
                hostLabel={hosts.length > 1 ? hosts.find((host) => host.serverId === reference.hostId)?.label : undefined}
                colors={colors}
                onPress={() => {
                  setChoosingProject(false);
                  props.navigation.openProject(reference);
                }}
              />
            ))}
          </Modal.Content>
        </Modal>
      )}
      {archiveTarget && (
        <Modal
          title="Archive workspace"
          open
          onOpenChange={(open) => {
            if (!open) dismissArchive();
          }}
        >
          <Modal.Content>
            <Text style={[styles.workspaceTitle, { color: colors.foreground }]}>{archiveTarget.title}</Text>
            <Text style={{ color: colors.foregroundMuted }}>
              This archives the workspace and its agents, and stops any running agents and terminals.
              {archiveTarget.worktree && " Paseo may remove the worktree and discard uncommitted changes."}
            </Text>
            {archiveError && (
              <Text accessibilityRole="alert" style={{ color: colors.statusDanger }}>{archiveError}</Text>
            )}
            <View style={styles.archiveButtons}>
              <SidebarRow colors={colors} disabled={archiving} onPress={dismissArchive} style={styles.touchRow}>
                <Text style={{ color: colors.foreground }}>Cancel</Text>
              </SidebarRow>
              <SidebarRow
                colors={colors}
                disabled={archiving}
                accessibilityState={{ disabled: archiving, busy: archiving }}
                onPress={() => void confirmArchive()}
                style={styles.touchRow}
              >
                <Text style={{ color: colors.statusDanger }}>{archiving ? "Archiving…" : "Archive"}</Text>
              </SidebarRow>
            </View>
          </Modal.Content>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 8, paddingVertical: 4, gap: 12 },
  createSection: { borderRadius: 6 },
  createRow: { minHeight: 36 },
  row: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  touchRow: { minHeight: 48 },
  sectionHeader: { minHeight: 32, marginBottom: 2 },
  sectionLabel: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 },
  sectionTitle: { fontSize: 12, fontWeight: "700" },
  sectionDivider: { flex: 1, height: StyleSheet.hairlineWidth },
  count: { fontSize: 12, fontVariant: ["tabular-nums"] },
  workspaceActions: { flexDirection: "row", alignItems: "center" },
  workspaceRow: { flex: 1, minWidth: 0, minHeight: 44, paddingVertical: 5, alignItems: "flex-start" },
  archiveAction: { width: 30, justifyContent: "center", paddingHorizontal: 0 },
  touchAction: { width: 48, minHeight: 48 },
  archiveButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  workspaceContent: { flex: 1, minWidth: 0, gap: 2 },
  workspaceTitle: { fontSize: 14, lineHeight: 19, fontWeight: "500" },
  prStatus: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 5, rowGap: 2 },
  prLabel: { fontSize: 11, lineHeight: 15 },
  projectName: { fontSize: 11, lineHeight: 15, flexShrink: 1 },
  trailing: { alignItems: "flex-end", gap: 2 },
  time: { fontSize: 11, lineHeight: 19, fontVariant: ["tabular-nums"] },
  rowIcons: { flexDirection: "row", alignItems: "center", gap: 6 },
  empty: { paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, lineHeight: 16 },
});
