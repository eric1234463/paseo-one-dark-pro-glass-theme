# One Dark Pro Night Flat for Paseo

Paseo theme adapted from [One Dark Pro Night Flat](https://t3themes.com/themes/one-dark-pro-night-flat/)
by pantharshit007. The original Glass palette came from Otty's
`one-dark-pro-glass.ottytheme`, a port of bukitoka/one-dark-pro-max's
`one-dark-pro-glass.json` for Zed.

`index.client.tsx` registers the theme with one `client.addTheme` call —
Paseo fills in the remaining dark-theme tokens.
`index.server.ts` runs the git commands behind the Compare panel.

## Agent timeline

In Paseo, open **Settings → Chat** and set **Chat display** to
**Collapse tool calls**. Consecutive calls share a collapsed disclosure. On a
phone, tap the group to open its activity sheet, then tap a call to inspect its
details. A standalone call keeps its own native row. A sub-agent that
returns a log without a child session has a separate, collapsed **Agent log**
row so you can still inspect that output. Keep **Expand thinking** off to open
raw reasoning on demand.

Assistant messages, including interim explanations, rendered Markdown tables
and final replies, stay in the timeline alongside user messages, plans and
permission prompts. Paseo owns the display setting and remembers the choice
for the client. **Collapse turns** also folds interim messages after a turn
ends, and **Full** shows each tool call separately.

When a Codex reply includes a follow-up, the empty chat input shows it as a
placeholder on clients that support `composerSuggestion`. Focus the input and
press **Tab** to turn the suggestion into a draft you can edit before sending.
Stock Paseo 0.17.4 shows the suggestion in the Codex reply. To enable the
placeholder, apply the [composer patch](patches/paseo-v0.17.4-composer-suggestion.patch)
to a Paseo `v0.17.4` checkout with `git apply` and rebuild the client.
Suggestions require Codex CLI 0.121.0 or later.

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

## Install

```bash
npm run typecheck
paseo plugin install /Users/eric/personal-project/paseo-one-dark-pro-glass-theme
```

Requires Paseo daemon and client 0.17.3 or later. Then pick
**One Dark Pro Night Flat** under Settings → Appearance. Requires
**Enable plugins** on the target daemon.
