import type { PluginButtonContentProps, PluginButtonRegistration, PluginClientContext } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { subagentDetailsRpc } from "../shared/subagent-details";

const label = "Subagent Details";

function SubagentDetails(props: PluginButtonContentProps) {
  if (props.context !== "agent") return null;
  return <CodexChildren {...props} />;
}

function CodexChildren({ agentId, host, theme }: Extract<PluginButtonContentProps, { context: "agent" }>) {
  const getDetails = useRpc(subagentDetailsRpc);
  const { data, isPending, isError } = useQuery({
    queryKey: ["subagent-details", host.id, agentId],
    queryFn: () => getDetails({ agentId }),
    refetchOnWindowFocus: false,
    retry: false,
  });
  const { foreground, foregroundMuted, statusDanger, border } = theme.colors;
  const message = isPending ? "Loading subagents…" : "No Codex subagents recorded for this session.";

  if (isError) {
    return <Text accessibilityLiveRegion="polite" style={{ color: statusDanger, fontSize: 14 }}>Could not read Codex subagents.</Text>;
  }
  if (!data?.children.length) {
    return <Text accessibilityLiveRegion="polite" style={{ color: foregroundMuted, fontSize: 14 }}>{message}</Text>;
  }
  return (
    <View testID="subagent-details-list">
      {data.children.map(({ id, name, role, model, effort }, index) => (
        <View key={id} style={{ gap: 4, paddingVertical: 8, borderTopWidth: index ? 1 : 0, borderColor: border }}>
          <Text selectable style={{ color: foreground, fontSize: 14, fontWeight: "600" }}>
            {name && role && name !== role ? `${name} · ${role}` : name || role || id.slice(0, 13)}
          </Text>
          <Text selectable style={{ color: foregroundMuted, fontSize: 14 }}>{model ?? "Model unavailable"} · {effort ?? "Effort unavailable"}</Text>
        </View>
      ))}
    </View>
  );
}

export function contributeSubagentDetails(client: PluginClientContext) {
  const pills = new Map<string, { workspaceId: string; registration: PluginButtonRegistration }>();
  const lifetime = new AbortController();
  const remove = (agentId: string) => {
    pills.get(agentId)?.registration.remove();
    pills.delete(agentId);
  };
  const register = ({ id, workspaceId, provider }: { id: string; workspaceId?: string | null; provider: string }) => {
    if (lifetime.signal.aborted) return;
    if (provider !== "codex" || !workspaceId) return remove(id);
    if (pills.get(id)?.workspaceId === workspaceId) return;
    remove(id);
    pills.set(id, {
      workspaceId,
      registration: client.addComposerPill({
        id: "subagent-details",
        workspaceId,
        agentId: id,
        button: { title: label, icon: "ListTree", behavior: { kind: "popover", Content: SubagentDetails } },
      }),
    });
  };

  void client.paseo.agents.list({
    scope: "active",
    includeBackground: true,
    sync: {},
    subscribe: {},
    signal: lifetime.signal,
  }).then(({ subscription }) => {
    if (lifetime.signal.aborted) return subscription.release();
    subscription.subscribe({
      snapshot({ entries }) {
        const ids = new Set(entries.map(({ agent }) => agent.id));
        for (const id of pills.keys()) {
          if (!ids.has(id)) remove(id);
        }
        for (const { agent } of entries) register(agent);
      },
      update(message) {
        if (message.type !== "agent_update") return;
        if (message.payload.kind === "remove") remove(message.payload.agentId);
        else register(message.payload.agent);
      },
    });
    return undefined;
  }).catch(() => {
    if (!lifetime.signal.aborted) console.error("Subagent Details could not observe the agent directory.");
  });

  return () => {
    lifetime.abort();
    for (const id of pills.keys()) remove(id);
  };
}
