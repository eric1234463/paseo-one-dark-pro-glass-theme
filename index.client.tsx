import type { PluginClientContext } from "@getpaseo/plugin/client";
import { contributeAgentLog } from "./client/agent-log";
import { contributeComparePanel } from "./client/compare-panel";
import { contributeNextPrompt } from "./client/next-prompt";
import { contributeSubagentDetails } from "./client/subagent-details";
import { WorkspaceSidebar } from "./client/workspace-sidebar";

// T3 Soft by octanethegenio, adapted to Paseo's theme roles.
export default function contribute(client: PluginClientContext) {
  client.addTheme({
    id: "one-dark-pro-glass",
    name: "T3 Soft",
    appearance: "dark",
    colors: {
      background: "#141414",
      foreground: "#F5F5F5",
      raised: "#1B1B1B",
      control: "#2A3A4C", // Shared by Markdown code, table headers, and controls.
      border: "#242424",
      accent: "#51A2FF", // Upstream update foreground for contrast with Paseo's dark button text.
      mutedForeground: "#A3A3A3",
      ring: "#346BF1",
      sidebar: "#1C1C1C",
      sidebarHover: "#2C2C2C",
      sidebarSelected: "#2A2A2A",
      surface3: "#1E1E1E",
      surface4: "#343434",
      foregroundExtraMuted: "#949494",
    },
  });
  const removeAgentLog = contributeAgentLog(client);
  const removeComparePanel = contributeComparePanel(client);
  const removeNextPrompt = contributeNextPrompt(client);
  const removeSubagentDetails = contributeSubagentDetails(client);
  const removeWorkspaceSidebar = client.addSidebarView({
    id: "working-done",
    title: "Working / Done",
    Component: WorkspaceSidebar,
  });
  return () => {
    removeAgentLog();
    removeComparePanel();
    removeNextPrompt();
    removeSubagentDetails();
    removeWorkspaceSidebar();
  };
}
