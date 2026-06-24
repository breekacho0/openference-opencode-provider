#!/usr/bin/env bash
#
# logout.sh — Remove the openference entry from OpenCode's auth.json.
#
# Usage:
#   ./bin/logout.sh
#   ./bin/logout.sh --auth-file /custom/path/to/auth.json
#   ./bin/logout.sh --help
#
# Default auth.json path: ~/.local/share/opencode/auth.json

set -euo pipefail

AUTH_FILE="${XDG_DATA_HOME:-$HOME/.local/share}/opencode/auth.json"
SCRIPT_NAME="$(basename "$0")"

usage() {
  cat <<EOF
Usage: ${SCRIPT_NAME} [OPTION]...

Remove the "openference" entry from OpenCode's auth.json.

Options:
  --auth-file <path>  Path to OpenCode's auth.json (override default)
  --help, -h          Show this help and exit

Default auth.json location: ~/.local/share/opencode/auth.json
EOF
  exit 0
}

# ── argument parsing ──────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h)
      usage
      ;;
    --auth-file)
      if [[ -z "${2:-}" ]]; then
        printf "Error: --auth-file requires a file path argument.\n" >&2
        exit 1
      fi
      AUTH_FILE="$2"
      shift 2
      ;;
    *)
      printf "Error: Unknown option: %s (run with --help for usage)\n" "$1" >&2
      exit 1
      ;;
  esac
done

# ── dependency check ──────────────────────────────────────────────────

if ! command -v jq &>/dev/null; then
  printf "Error: jq is required but not installed (https://jqlang.github.io/jq/).\n" >&2
  exit 1
fi

# ── check auth.json ───────────────────────────────────────────────────

if [[ ! -f "$AUTH_FILE" ]]; then
  printf "Already logged out.\n"
  exit 0
fi

# Check whether the openference key exists in the JSON.
EXISTS="$(jq 'has("openference")' "$AUTH_FILE" 2>/dev/null || true)"
if [[ "$EXISTS" != "true" ]]; then
  printf "No Openference key found.\n"
  exit 0
fi

# ── back up current auth.json ─────────────────────────────────────────

TIMESTAMP="$(date +%s)"
BACKUP="${AUTH_FILE}.bak.${TIMESTAMP}"
cp "$AUTH_FILE" "$BACKUP"

# ── remove the openference key and write back atomically ──────────────

TMPFILE="$(mktemp "${AUTH_FILE}.tmp.XXXXXX")"
jq 'del(.openference)' "$AUTH_FILE" > "$TMPFILE"
mv "$TMPFILE" "$AUTH_FILE"

printf "Logged out of Openference. Run /connect in OpenCode to re-authenticate.\n"
