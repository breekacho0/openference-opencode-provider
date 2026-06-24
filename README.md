# Openference Auth Provider for OpenCode

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Made for OpenCode](https://img.shields.io/badge/Made%20for-OpenCode-000?logo=opencode)

Minimal configuration and tooling to use [Openference](https://openference.com/docs)
(an OpenAI-compatible inference endpoint) as a provider inside the
[OpenCode](https://opencode.ai) CLI.

## What is this?

This repository contains a ready-to-use `opencode.json` config file and a small
shell script that dynamically discovers all available models from the Openference
API. It saves you from manually copying model IDs into your config and helps you
get started with OpenCode + Openference in under a minute.

## Quick start

1. **Set your API key**

   ```bash
   export OPENFERENCE_API_KEY=sk-...
   ```

   You can also store it permanently via `opencode auth login -p openference`.

2. **Copy the config**

   ```bash
   cp opencode.json ~/.config/opencode/opencode.json
   ```

   If you already have an existing config, merge the `provider.openference` block
   into your own `opencode.json`.

3. **Run OpenCode**

   ```bash
   opencode
   ```

   Use `/models` inside the CLI to select `openference/GLM-5.2` (or any model
   you added via the sync script).

## Dynamic model sync

The provided `opencode.json` ships with a single example model (`GLM-5.2`).
To generate a config **with every model available on your Openference account**,
run the sync script:

```bash
./bin/sync-models.sh > opencode.generated.json
```

Or write directly to your config directory (requires confirmation):

```bash
./bin/sync-models.sh --write ~/.config/opencode/opencode.json
```

You can then copy, merge, or commit the generated file as needed.

## Auth options

| Method | Command / Variable |
|---|---|
| **Environment variable** | `export OPENFERENCE_API_KEY=sk-...` |
| **OpenCode auth store** | `opencode auth login -p openference` (stores key in `~/.local/share/opencode/auth.json`) |
| **Script argument** | `./bin/sync-models.sh sk-...` |

The config file references the key via `{env:OPENFERENCE_API_KEY}`, so OpenCode
will pick it up from your environment or its built-in auth store.

## Requirements

- **bash** – the sync script is written for bash (not POSIX sh).
- **curl** – used for the HTTP request to the Openference API.
- **jq** – used to parse the JSON response. Install from
  [stedolan.github.io/jq](https://stedolan.github.io/jq/download/) or your
  package manager (`apt install jq`, `brew install jq`, etc.).
- **opencode CLI** – [opencode.ai](https://opencode.ai) to actually use the config.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `401 Unauthorized` or `Error: API error` | Invalid or missing API key | Check `OPENFERENCE_API_KEY` is set and correct |
| `jq: command not found` | `jq` not installed | `apt install jq` / `brew install jq` / download from [jq website](https://stedolan.github.io/jq/) |
| `curl: command not found` | `curl` not installed | `apt install curl` / `brew install curl` |
| `No models returned` | API key may lack model access, or endpoint changed | Verify with `curl -H "Authorization: Bearer $KEY" https://api.openference.com/v1/models` |
| OpenCode doesn't see the provider | Config not in correct location | Ensure `opencode.json` is at `~/.config/opencode/opencode.json` |

## License

MIT — see [LICENSE](LICENSE).

Copyright (c) 2026 openreference-opencode-provider contributors
