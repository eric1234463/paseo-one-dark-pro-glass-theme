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
Every row uses the same icon, colored category prefix and target layout:
Shell, Read, Edit, Write, Search, Fetch, Worktree, Agent, MCP or Tool.
Prefixes share the same typography; shell targets retain a monospace font.
Syntax colors are reserved for expanded details.
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

Choose **Working / Done** under Settings → Sidebar → Sidebar view. Both sections
can be collapsed independently. Each row shows its project and the age of its
latest prompt, or creation time for a new workspace. Each section sorts newest first.
Working includes running, needs input, and failed states. Completed workspaces
move to Done as soon as they are ready to review.
Use **New workspace** above Working to choose a project and open Paseo's
workspace creation flow.
Use the archive button on a row to archive that workspace and its agents after
confirmation. Paseo may remove its worktree.
Workspace rows show the pull request state and CI checks when Paseo has that
data. Running workspaces and pending checks use an animated icon that respects
the device's reduced-motion setting.
Provider icons come from the connected host when available. The bundled fallback
icons are sourced from [Paseo v0.17.4](https://github.com/getpaseo/paseo/tree/v0.17.4/packages/app/src/assets/acp-provider-icons).
See the [upstream license notice](client/PROVIDER-ICONS-LICENSE.txt).

## Known limitation

Paseo themes are opaque hex only, so the glass translucency (alpha window
background, transparent panels, vibrancy) cannot transfer. `background` uses
the opaque base `#080909`.

## Install

```bash
npm run typecheck
paseo plugin install /Users/eric/personal-project/paseo-one-dark-pro-glass-theme
```

Requires Paseo daemon and client 0.16.0 or later. Then pick
**One Dark Pro Glass** under Settings → Appearance. Requires
**Enable plugins** on the target daemon.
