# One Dark Pro Glass for Paseo

Paseo theme plugin ported from `~/.config/otty/themes/one-dark-pro-glass.ottytheme`
(itself a port of bukitoka/one-dark-pro-max `one-dark-pro-glass.json` for Zed).

The UI prioritizes supervising the agent's direction: keep actions, targets and
running or failed states visible so you can stop or redirect work early.
Collapse detailed output, rather than hiding tool activity; use color to help
scan tool categories without replacing readable names and status icons.

`index.client.tsx` registers the theme with one `client.addTheme` call —
Paseo expands the 8-color palette into its full dark-theme token set.
`index.server.ts` runs the git commands behind the Compare panel.

It also compacts the agent timeline (`client/tool-line.tsx`): every tool call
except plans collapses to one neutral, subtly bordered line with a tool icon,
the command or filename, status and a trailing expand arrow. Icons and action
labels distinguish tool types: blue shell, green reads, yellow edits/writes,
cyan searches/fetches, purple agents and orange MCP calls. Failures override these with red.
Shell rows omit
the redundant Ran label; syntax colors are reserved for expanded details.
Tap a line to open a box with the full command and output, or a diff with
One Dark Pro syntax colors. All calls start collapsed, including failures,
which retain a visible error icon. File rows can expand to show their full path.
MCP tool calls stay visible while running and after completion, with an MCP
label and server.tool name so you can follow the agent's direction. Both
`mcp__<server>__<tool>` and namespaced `server.tool` calls with plain-text or
unknown detail are recognized. Codex history can expose MCP calls as unknown
detail; these keep their MCP styling rather than falling back to generic tools.
Plans, permission
prompts and assistant messages keep Paseo's native rendering. Expanded shell
output keeps the last 8000 characters; diffs keep the first 8000.

It also adds a Compare tab in the workspace view (`client/compare-panel.tsx`,
view in `client/compare-view.tsx`), beside Paseo's native Diff tab: pick any
base branch and diff the current branch against it (`base...HEAD`), which
the native diff view cannot do. The file list stays collapsed until you tap
a file; expanded files render hunks in One Dark Pro syntax colors with an
ignore-whitespace toggle. Open it from the workspace `+` panel menu, or via
Command Center → Open Compare.

## Known limitation

Paseo themes are opaque hex only, so the glass translucency (alpha window
background, transparent panels, vibrancy) cannot transfer. `background` uses
the opaque base `#080909`.

## Install

```bash
npm run typecheck
paseo plugin install /Users/eric/personal-project/paseo-one-dark-pro-glass-theme
```

Requires Paseo daemon and client 0.10.0 or later. Then pick
**One Dark Pro Glass** under Settings → Appearance. Requires
**Enable plugins** on the target daemon.
