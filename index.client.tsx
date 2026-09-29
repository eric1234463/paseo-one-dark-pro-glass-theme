import type { PluginClientContext } from "@getpaseo/plugin/client";

// One Dark Pro Glass — follows upstream bukitoka/one-dark-pro-max
// `themes/one-dark-pro-glass.json` (Zed, glass author BoyeDarat),
// via ~/.config/otty/themes/one-dark-pro-glass.ottytheme.
//
// Paseo themes are opaque hex only: no alpha channel, no vibrancy/material.
// So the glass translucency (window #080909DD, transparent panels) cannot
// transfer — `background` uses the opaque base #080909 and panels derive
// from it. Everything else is verbatim source values; mapping per color below.
export default function contribute(client: PluginClientContext) {
  client.addTheme({
    id: "one-dark-pro-glass",
    name: "One Dark Pro Glass",
    appearance: "dark",
    colors: {
      background: "#080909", // [window] background, alpha stripped (#080909DD)
      foreground: "#D7DAE0", // [token] foreground (mono0, primary text)
      raised: "#101214", // near-black, NOT source surface #2C313A — census showed option rows render raised, user wants black rows edged by border (D7 supersedes D2 raised)
      control: "#2C313A", // upstream element.background verbatim — paints inputs, secondary fills, selected rows (D9; border stays #3E4452 per D6)
      border: "#3E4452", // [terminal] selection-background, NOT source [panel] border #212121 — pixel scan proved #212121 invisible on #080909, card floated with no edge (D6)
      accent: "#61AFEF", // [token] accent (syntax.function, active-tab indicator)
      mutedForeground: "#ABB2BF", // [token] secondary (mono1, secondary text)
      ring: "#4E5666", // scrollbar.thumb, alpha stripped (#4E566680)
    },
  });
  return () => {};
}
