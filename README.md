# Openference Auth Provider for OpenCode

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Made for OpenCode](https://img.shields.io/badge/Made%20for-OpenCode-000?logo=opencode)

First-class OpenCode auth provider for **Openference** — an OpenAI-compatible
inference endpoint. This plugin gives you a dedicated **Openference** entry in
the `/connect` menu (not under "Other"), prompts you for an API key, and
dynamically discovers available models at startup.

## Installation

There are three ways to use this provider. **The plugin method is recommended**
for the best user experience.

### 1. Plugin (recommended) — `/connect` integration

Drop the `src/` folder into your OpenCode plugins directory. Once installed,
the **Openference** provider appears as a first-class entry in the `/connect`
menu.

### 2. Static config (existing)

Copy the `opencode.json` file from this repo and set the environment variable:

```bash
export OPENFERENCE_API_KEY=sk-...
cp opencode.json ~/.config/opencode/opencode.json
```

This gives you the `GLM-5.2` model without any plugin. Use
`bin/sync-models.sh` to discover all available models.

### 3. Hybrid — plugin auth + custom static models

Install the plugin for the `/connect` auth flow, but keep a static model list in
your `opencode.json` if you prefer not to fetch models dynamically:

```
# Install the plugin as above, then manually add models to your opencode.json
# under provider.openference.models
```

## `/connect` flow

1. Run OpenCode.
2. Type `/connect` and press Enter.
3. Select **Openference** from the provider list (listed as a first-class
   entry, not under "Other").
4. Select **Enter Openference API Key**.
5. Paste your Openference API key when prompted.

Your key is stored securely in `~/.local/share/opencode/auth.json`. The plugin
automatically fetches the model list from the API at startup so you can switch
models via `/models` immediately.

## `/logout` flow

There are two ways to log out:

- **CLI**: Run `./bin/logout.sh` from this repository.
- **Manual**: Edit `~/.local/share/opencode/auth.json` and remove the
  `openference` block:

  ```bash
  jq 'del(.openference)' ~/.local/share/opencode/auth.json > tmp && mv tmp ~/.local/share/opencode/auth.json
  ```

After logging out, run `/connect` again to re-authenticate.

## Dynamic model discovery

When the plugin is loaded and you are authenticated, it calls
`GET /v1/models` with your API key on startup and builds a model list
automatically. Each model appears as `<id> (via Openference)` in the
`/models` list.

If the API call fails (network error, 401, timeout), the plugin falls back to a
built-in default model (`GLM-5.2`) so you can still use the provider.

For **static config users** (method 2), the `bin/sync-models.sh` script
provides the same dynamic discovery:

```bash
./bin/sync-models.sh > opencode.generated.json
```

## Requirements

- **OpenCode** ≥ 1.0.0 (for the plugin) or any version (for static config)
- **bash** – the scripts are written for bash (not POSIX sh).
- **curl** – used by `sync-models.sh`.
- **jq** – used by `sync-models.sh` and `logout.sh`. Install from
  [jqlang.github.io/jq](https://jqlang.github.io/jq/) or your package manager
  (`apt install jq`, `brew install jq`, etc.).

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `401 Unauthorized` or `Error: API error` | Invalid or missing API key | Re-run `/connect` and paste a valid key, or check `OPENFERENCE_API_KEY` |
| Plugin not appearing in `/connect` | Plugin not installed / not detected | Ensure the `src/` plugin folder is in your OpenCode plugins directory and OpenCode ≥ 1.0.0 |
| Models not showing in `/models` | Auth not established or API unreachable | Run `/connect` first; check network; the fallback model `GLM-5.2` should still appear |
| `jq: command not found` | `jq` not installed | `apt install jq` / `brew install jq` / download from [jq website](https://jqlang.github.io/jq/) |
| `curl: command not found` | `curl` not installed | `apt install curl` / `brew install curl` |
| `No models returned` | API key may lack model access, or endpoint changed | Verify with `curl -H "Authorization: Bearer $KEY" https://api.openference.com/v1/models` |
| OpenCode doesn't see the provider (static config) | Config not in correct location | Ensure `opencode.json` is at `~/.config/opencode/opencode.json` |

## Scripts

| Script | Purpose |
|---|---|
| `bin/sync-models.sh` | Fetch live model list and generate an OpenCode-compatible config (for static config users) |
| `bin/logout.sh` | Remove the `openference` entry from `auth.json` (power-user CLI logout) |

## Auth storage

When you authenticate via `/connect`, your API key is stored in
`~/.local/share/opencode/auth.json` under the `openference` key. The
environment variable `OPENFERENCE_API_KEY` is also respected by both the
static config and the plugin.

## Config reference

The static `opencode.json` uses provider ID `openference` and references the
API key via `{env:OPENFERENCE_API_KEY}`. The plugin uses the same provider ID
internally and merges with any existing config you have.

## Project structure

```
openference-opencode-provider/
├── src/
│   └── index.ts          # OpenCode plugin (recommended)
├── bin/
│   ├── sync-models.sh    # Model sync script (static config users)
│   └── logout.sh         # CLI logout script
├── opencode.json         # Static config (minimal example)
├── package.json          # npm package definition
├── tsconfig.json         # TypeScript configuration
├── README.md
├── LICENSE
└── .gitignore
```

## License

MIT — see [LICENSE](LICENSE).

Copyright (c) 2026 openference-opencode-provider contributors
