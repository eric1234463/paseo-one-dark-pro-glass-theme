# Repository Guidelines

## Project Structure & Module Organization

This is a theme-only Paseo plugin. `index.client.tsx` exports `contribute`, registers the eight-color dark palette with `client.addTheme`, and returns a cleanup callback. There is no server entry point, application shell, test directory, or asset directory.

`paseo-plugin.json` defines the plugin ID and runtime compatibility. `package.json` and `package-lock.json` define development dependencies; `tsconfig.json` enables strict TypeScript checking. `README.md` documents installation, attribution, and theme limitations.

## Build, Test, and Development Commands

- `npm ci`: install the locked development dependencies.
- `npm run typecheck`: run `tsc --noEmit` to validate TypeScript without generating files.
- `paseo plugin install "$PWD"`: install this repository into Paseo using its absolute path.

There are no build, development-server, lint, or automated-test scripts. Enable plugins on the target daemon, then select **One Dark Pro Glass** under Settings → Appearance. Check `requirements.paseo` in the manifest for runtime compatibility; the SDK version used for typechecking is pinned separately.

## Coding Style & Naming Conventions

Match the existing two-space indentation, double quotes, semicolons, and trailing commas in TypeScript. Use type-only imports for types. Keep JSON formatted with two-space indentation. No formatter or linter is configured.

Preserve the existing plugin and theme IDs. Use the SDK's existing palette keys and uppercase six-digit hex colors. Keep changes focused on theme registration and palette values; avoid introducing helpers or dependencies for simple color edits.

## Testing Guidelines

Run `npm run typecheck` before submitting changes. No testing framework or coverage threshold is configured.

For palette changes, install the plugin and inspect backgrounds, text, inputs, selected rows, borders, and focus indicators in Paseo. Check readability and contrast, and include screenshots of affected surfaces. Themes use opaque colors; do not promise alpha transparency or vibrancy.

## Commit & Pull Request Guidelines

Git history uses short, imperative subjects such as `Add One Dark Pro Glass theme plugin for Paseo` and `Fix input card border ...`. Follow that style and identify the affected color or behavior.

PR descriptions should explain the change, its reason, and validation performed. Link an issue when applicable and include before/after screenshots for visual changes. Update README compatibility or limitation notes when those behaviors change, and retain upstream attribution.
