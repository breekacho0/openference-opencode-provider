import type { Plugin } from "@opencode-ai/plugin"

const PROVIDER_ID = "openference"
const PROVIDER_NAME = "Openference"
const BASE_URL = "https://api.openference.com/v1"
const ENV_VAR = "OPENFERENCE_API_KEY"
const NPM_PACKAGE = "@ai-sdk/openai-compatible"
// Config-style model entries (partial Model objects). OpenCode fills in the
// rest of the Model fields at runtime, so we type these loosely — matching the
// shape used in opencode.json and accepted by the provider.models hook.
const FALLBACK_MODELS: Record<string, Record<string, unknown>> = {
  "GLM-5.2": { name: "GLM-5.2 (via Openference)" },
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

const OpenferenceAuth: Plugin = async () => {
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
        provider.models = provider.models ?? FALLBACK_MODELS
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
        models: FALLBACK_MODELS,
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

    provider: {
      id: PROVIDER_ID,
      models: async (_provider, ctx): Promise<Record<string, any>> => {
        try {
          const apiKey = apiKeyFromAuth(ctx.auth)
          if (!apiKey) {
            return FALLBACK_MODELS
          }

          // Prefer Bun.fetch when available (OpenCode runs on Bun), fall back to
          // the global fetch otherwise. Guarded with `globalThis` so this also
          // type-checks under a pure Node toolchain without @types/bun.
          const g = globalThis as unknown as {
            Bun?: { fetch: typeof fetch }
          }
          const fetcher = g.Bun ? g.Bun.fetch : globalThis.fetch
          const response = await fetcher(`${BASE_URL}/models`, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(5000),
          })

          if (!response.ok) {
            console.warn(
              `[${PROVIDER_NAME}] Models fetch returned ${response.status}`,
            )
            return FALLBACK_MODELS
          }

          const data = await response.json()
          if (data?.data && Array.isArray(data.data)) {
            const models: Record<string, { name: string }> = {}
            for (const m of data.data) {
              if (m.id) {
                models[m.id] = { name: `${m.id} (via Openference)` }
              }
            }
            if (Object.keys(models).length === 0) return FALLBACK_MODELS
            return models
          }

          return FALLBACK_MODELS
        } catch (e) {
          console.warn(`[${PROVIDER_NAME}] Models fetch error:`, e)
          return FALLBACK_MODELS
        }
      },
    },
  }
}

export { OpenferenceAuth }
