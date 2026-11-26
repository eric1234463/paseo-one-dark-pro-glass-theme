import type { PluginClientContext } from "@getpaseo/plugin/client";
import { contributeAgentLog } from "./client/agent-log";
import { contributeComparePanel } from "./client/compare-panel";
import { contributeNextPrompt } from "./client/next-prompt";
import { WorkspaceSidebar } from "./client/workspace-sidebar";

// One Dark Pro Night Flat by pantharshit007, adapted to Paseo's theme roles.
export default function contribute(client: PluginClientContext) {
  client.addTheme({
    id: "one-dark-pro-glass",
    name: "One Dark Pro Night Flat",
    appearance: "dark",
    colors: {
      background: "#16191D",
      foreground: "#ABB2BF",
      raised: "#1E2227",
      control: "#1D1F23",
      border: "#3E4452",
      accent: "#528BFF", // Upstream terminal cursor blue for contrast with Paseo's dark button text.
      mutedForeground: "#A0A8B6",
      ring: "#4D78CC",
      sidebarHover: "#2C313A",
      sidebarSelected: "#363A41", // Upstream active row fill distinguishes selection from hover.
      surface3: "#23272E",
      surface4: "#30333D",
      foregroundExtraMuted: "#9BA4B3", // Keeps sidebar timestamps readable on selected rows.
    },
  });
  const removeAgentLog = contributeAgentLog(client);
  const removeComparePanel = contributeComparePanel(client);
  const removeNextPrompt = contributeNextPrompt(client);
  const removeWorkspaceSidebar = client.addSidebarView({
    id: "working-done",
    title: "Working / Done",
    Component: WorkspaceSidebar,
  });
  return () => {
    removeAgentLog();
    removeComparePanel();
    removeNextPrompt();
    removeWorkspaceSidebar();
  };
}
