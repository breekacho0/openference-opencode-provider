import type { Plugin } from "@opencode-ai/plugin"

const PROVIDER_ID = "openference"
const PROVIDER_NAME = "Openference"
const BASE_URL = "https://api.openference.com/v1"
const ENV_VAR = "OPENFERENCE_API_KEY"
const NPM_PACKAGE = "@ai-sdk/openai-compatible"

// Static model catalogue. The full list returned by GET /v1/models at the time
// of writing. OpenCode only invokes a plugin's provider.models hook for
// providers registered in the models.dev registry; `openference` is a custom
// provider that isn't there yet, so that hook would never run. We therefore
// expose the catalogue statically via the config() hook instead, and document
// `bin/sync-models.sh` as the way to refresh it when Openference adds models.
//
// Keys MUST match exactly the IDs returned by the API (see
// https://openference.com/models).
const MODELS: Record<string, Record<string, unknown>> = {
  "GLM-5.2": { name: "GLM-5.2 (via Openference)" },
  "GLM-5.1": { name: "GLM-5.1 (via Openference)" },
  "Kimi K2.6": { name: "Kimi K2.6 (via Openference)" },
  "DeepSeek-V4-Pro": { name: "DeepSeek-V4-Pro (via Openference)" },
  "Kimi K2.7 Code": { name: "Kimi K2.7 Code (via Openference)" },
  "Qwen3.7 Plus": { name: "Qwen3.7 Plus (via Openference)" },
  "DeepSeek-V4-Flash": { name: "DeepSeek-V4-Flash (via Openference)" },
  "MiMo-V2.5": { name: "MiMo-V2.5 (via Openference)" },
  "Nemotron 3 Ultra": { name: "Nemotron 3 Ultra (via Openference)" },
}

// `Auth` is a discriminated union (OAuth | ApiAuth | WellKnownAuth); only the
// `api` and `wellknown` variants carry a `key`. The `/connect` flow stores an
// API key via the `api` method, so this is the field we forward to the provider
// options as `apiKey`.
function apiKeyFromAuth(auth: unknown): string | undefined {
  if (typeof auth !== "object" || auth === null) return undefined
  const a = auth as { type?: string; key?: string }
  if ((a.type === "api" || a.type === "wellknown") && a.key) return a.key
  return undefined
}

// OpenCode's plugin loader expects a `default` export shaped as PluginModule
// ({ id, server }). Path plugins MUST provide `id`; npm plugins derive it from
// package.json instead. `server` is the actual plugin entry point.
const PLUGIN_ID = "openference"

const server: Plugin = async () => {
  return {
    config: async (cfg) => {
      cfg.provider = cfg.provider ?? {}
      const provider = cfg.provider[PROVIDER_ID]

      if (provider) {
        // User already has an openference provider block — merge defaults without
        // overwriting user-set fields.
        provider.npm = provider.npm ?? NPM_PACKAGE
        provider.name = provider.name ?? PROVIDER_NAME
        provider.options = provider.options ?? {}
        provider.options.baseURL = provider.options.baseURL ?? BASE_URL
        provider.options.apiKey =
          provider.options.apiKey ?? `{env:${ENV_VAR}}`
        provider.models = provider.models ?? MODELS
        return
      }

      // No existing provider config — add a fresh one with env-var auth key.
      cfg.provider[PROVIDER_ID] = {
        npm: NPM_PACKAGE,
        name: PROVIDER_NAME,
        options: {
          baseURL: BASE_URL,
          apiKey: `{env:${ENV_VAR}}`,
        },
        models: MODELS,
      }
    },

    auth: {
      provider: PROVIDER_ID,
      loader: async (getAuth) => {
        try {
          const auth = await getAuth()
          const key = apiKeyFromAuth(auth)
          if (!key) return {}
          return { apiKey: key }
        } catch (e) {
          console.warn(`[${PROVIDER_NAME}] Auth loader error:`, e)
          return {}
        }
      },
      methods: [
        {
          type: "api",
          label: "Enter Openference API Key",
        },
      ],
    },
  }
}

// Primary export consumed by the OpenCode plugin loader (V1 PluginModule shape).
// `id` is required for path plugins; `server` is the plugin function itself.
export default { id: PLUGIN_ID, server }

// Named export retained for direct imports and tests.
export { server as OpenferenceAuth }
