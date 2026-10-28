# One Dark Pro Glass for Paseo

Paseo theme plugin ported from `~/.config/otty/themes/one-dark-pro-glass.ottytheme`
(itself a port of bukitoka/one-dark-pro-max `one-dark-pro-glass.json` for Zed).

Client-only plugin: no daemon side, no `index.server.ts`. `index.client.tsx`
registers the theme with one `client.addTheme` call — Paseo expands the 8-color
palette into its full dark-theme token set.

It also compacts the agent timeline (`client/tool-line.tsx`): every tool call
except plans renders as one line with an icon, tool name, summary and status.
Tap a line to expand its output; failed calls start expanded. Plans, permission
prompts and assistant messages keep Paseo's native rendering. Expanded output
keeps only the last 8000 characters.

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
