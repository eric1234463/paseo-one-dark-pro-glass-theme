# One Dark Pro Glass for Paseo

Paseo theme plugin ported from `~/.config/otty/themes/one-dark-pro-glass.ottytheme`
(itself a port of bukitoka/one-dark-pro-max `one-dark-pro-glass.json` for Zed).

`index.client.tsx` registers the theme with one `client.addTheme` call —
Paseo expands the 8-color palette into its full dark-theme token set.
`index.server.ts` runs the git commands behind the Compare panel.

It also compacts the agent timeline (`client/tool-line.tsx`): every tool call
except plans collapses to one line with a colored action (Ran, Read, Edited…),
the target (filename highlighted, shell command syntax-colored) and status.
Tap a line to open a box with the full command and output, or a diff with
One Dark Pro syntax colors; failed calls start open. MCP tool calls
(`mcp__<server>__<tool>`) are hidden unless they fail. Plans, permission
prompts and assistant messages keep Paseo's native rendering. Expanded shell
output keeps the last 8000 characters; diffs keep the first 8000.

It also adds a Compare workspace panel (`client/compare-panel.tsx`): pick any
base branch and diff the current branch against it (`base...HEAD`), which
Paseo's native diff view cannot do. The file list stays collapsed until you
tap a file; expanded files render hunks in One Dark Pro syntax colors with
an ignore-whitespace toggle.

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
