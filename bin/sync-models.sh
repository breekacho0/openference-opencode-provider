#!/usr/bin/env bash
#
# sync-models.sh — Fetch live model list from Openference and generate
#                   an OpenCode-compatible config to stdout or a file.
#
# Usage:
#   export OPENFERENCE_API_KEY=sk-... && ./sync-models.sh
#   ./sync-models.sh sk-...
#   ./sync-models.sh --print                          (default)
#   ./sync-models.sh --write ~/.config/opencode/opencode.json
#
# Requirements: bash, curl, jq

set -euo pipefail

# ── helpers ──────────────────────────────────────────────────────────

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTION]... [KEY]

Options:
  --print              Print generated config to stdout (default)
  --write <path>       Write generated config to <path> (requires confirmation)

Arguments:
  KEY                  Openference API key (can also be set via OPENFERENCE_API_KEY)

Examples:
  export OPENFERENCE_API_KEY=sk-... && $(basename "$0})
  $(basename "$0") sk-...
  $(basename "$0") --write ~/.config/opencode/opencode.json
  $(basename "$0") sk-... --write ./opencode.generated.json
EOF
  exit 0
}

die() {
  printf "Error: %s\n" "$1" >&2
  exit 1
}

# ── dependency check ─────────────────────────────────────────────────

command -v curl >/dev/null 2>&1 || die "curl is required but not installed."
command -v jq   >/dev/null 2>&1 || die "jq is required but not installed (https://stedolan.github.io/jq/download/)."

# ── argument parsing ─────────────────────────────────────────────────

MODE="print"
WRITE_PATH=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --print)
      MODE="print"
      shift
      ;;
    --write)
      MODE="write"
      if [[ -z "${2:-}" ]]; then
        die "--write requires a file path argument."
      fi
      WRITE_PATH="$2"
      shift 2
      ;;
    --help|-h)
      usage
      ;;
    --*)
      die "Unknown option: $1 (run with --help for usage)"
      ;;
    *)
      # First non-option argument is treated as the API key
      KEY="${1}"
      shift
      ;;
  esac
done

# ── resolve API key ──────────────────────────────────────────────────

API_KEY="${KEY:-${OPENFERENCE_API_KEY:-}}"

if [[ -z "$API_KEY" ]]; then
  die "No API key found. Set OPENFERENCE_API_KEY env var or pass key as argument."
fi

BASE_URL="https://api.openference.com/v1"

# ── fetch models ─────────────────────────────────────────────────────

printf "Fetching models from %s/models ... " "$BASE_URL" >&2

RESPONSE="$(
  curl -sS \
    --max-time 15 \
    --request GET \
    --url "${BASE_URL}/models" \
    --header "Authorization: Bearer ${API_KEY}" \
    --header "Content-Type: application/json" \
  || true
)"

# Basic validation
if [[ -z "$RESPONSE" ]]; then
  die "Empty response from API — check your network connection and API key."
fi

# Check for HTTP-level errors (OpenAI-compatible API returns JSON with
# an "error" object on failure).
ERROR_MSG="$(printf '%s' "$RESPONSE" | jq -r '.error.message // empty')"
if [[ -n "$ERROR_MSG" ]]; then
  die "API error: ${ERROR_MSG}"
fi

# Extract model IDs
MODEL_IDS="$(printf '%s' "$RESPONSE" | jq -r '.data[].id // empty')"
if [[ -z "$MODEL_IDS" ]]; then
  die "No models returned by the API (the response might be unexpected). Raw response (first 500 chars): $(printf '%s' "$RESPONSE" | head -c 500)"
fi

printf "found %d model(s).\n" "$(printf '%s' "$MODEL_IDS" | wc -l)" >&2

# ── generate config ──────────────────────────────────────────────────

# We build the models object by mapping each model ID to an entry.
# jq can do this elegantly from a list of IDs.
GENERATED="$(
  printf '%s' "$MODEL_IDS" | jq -Rsc '
    split("\n")
    | map(select(length > 0))
    | reduce .[] as $id ({}; .[$id] = {name: "\($id) (via Openference)"})
  ' --raw-input --raw-output
)"

# Produce the full config JSON via jq.
FULL_CONFIG="$(
  jq -n \
    --argjson models "$GENERATED" \
    '{
      "$schema": "https://opencode.ai/config.json",
      "provider": {
        "openference": {
          "npm": "@ai-sdk/openai-compatible",
          "name": "Openference",
          "options": {
            "baseURL": "https://api.openference.com/v1",
            "apiKey": "{env:OPENFERENCE_API_KEY}"
          },
          "models": $models
        }
      }
    }'
)"

# ── output ───────────────────────────────────────────────────────────

if [[ "$MODE" == "write" ]]; then
  if [[ -f "$WRITE_PATH" ]]; then
    printf "File '%s' already exists. Overwrite? [y/N] " "$WRITE_PATH" >&2
    read -r CONFIRM
    case "$CONFIRM" in
      y|Y|yes|YES) ;;
      *) die "Aborted by user." ;;
    esac
  fi
  printf '%s\n' "$FULL_CONFIG" > "$WRITE_PATH"
  printf "Config written to %s\n" "$WRITE_PATH" >&2
else
  printf '%s\n' "$FULL_CONFIG"
fi

exit 0
