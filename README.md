# One Dark Pro Glass for Paseo

Paseo theme plugin ported from `~/.config/otty/themes/one-dark-pro-glass.ottytheme`
(itself a port of bukitoka/one-dark-pro-max `one-dark-pro-glass.json` for Zed).

Theme-only plugin: no daemon side, no `index.server.ts`. One `client.addTheme`
call in `index.client.tsx` — Paseo expands the 8-color palette into its full
dark-theme token set.

## Known limitation

Paseo themes are opaque hex only, so the glass translucency (alpha window
background, transparent panels, vibrancy) cannot transfer. `background` uses
the opaque base `#080909`.

## Install

```bash
npm run typecheck
paseo plugin install /Users/eric/personal-project/paseo-one-dark-pro-glass-theme
```

Then pick **One Dark Pro Glass** under Settings → Appearance. Requires
**Enable plugins** on the target daemon.
