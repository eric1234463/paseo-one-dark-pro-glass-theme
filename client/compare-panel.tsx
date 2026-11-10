import type { PluginClientContext, PluginWorkspacePanelProps } from "@getpaseo/plugin/client";
import { CompareView } from "./compare-view";

// Compare tab in the workspace view, beside Paseo's native Diff tab.
// Same view as the reviewers asked to sit at the original diff tab position:
// pick any base branch and diff the current branch against it
// (`base...HEAD`), which the native diff view cannot do.

function CompareWorkspacePanel({ workspaceId, theme }: PluginWorkspacePanelProps) {
  return <CompareView workspaceId={workspaceId} theme={theme} />;
}

export function contributeComparePanel(client: PluginClientContext) {
  const removePanel = client.addWorkspacePanel({
    id: "compare-diff",
    title: "Compare",
    icon: "GitBranch",
    locations: ["workspace"],
    Component: CompareWorkspacePanel,
  });
  // Fallback opener in case the host's `+` panel menu only lists built-ins.
  const removeCommand = client.addCommandCenterItem({
    id: "open-compare",
    title: "Open Compare",
    icon: "GitBranch",
    keywords: ["diff", "branch", "compare"],
    context: "workspace",
    onSelect: (ctx) => {
      ctx.openPanel("compare-diff");
    },
  });
  return () => {
    removePanel();
    removeCommand();
  };
}
