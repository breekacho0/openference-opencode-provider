import type { Plugin } from "@opencode-ai/plugin"

const PROVIDER_ID = "openference"
const PROVIDER_NAME = "OpenReference"
const BASE_URL = "https://api.openference.com/v1"
const ENV_VAR = "OPENFERENCE_API_KEY"
const FALLBACK_MODELS = {
  "GLM-5.2": { name: "GLM-5.2 (via OpenReference)" },
} as const

const OpenReferenceAuth: Plugin = async () => {
  return {
    config: async (cfg) => {
      cfg.provider = cfg.provider ?? {}
      const provider = cfg.provider[PROVIDER_ID]

      if (provider) {
        // User already has an openference provider block — merge defaults without
        // overwriting user-set fields.
        provider.name = provider.name ?? PROVIDER_NAME
        provider.options = provider.options ?? {}
        provider.options.baseURL = provider.options.baseURL ?? BASE_URL
        provider.models = provider.models ?? FALLBACK_MODELS
        return
      }

      // No existing provider config — add a fresh one with env-var auth key.
      cfg.provider[PROVIDER_ID] = {
        npm: "@ai-sdk/openai-compatible",
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
          if (!auth) return null
          return { apiKey: auth.key }
        } catch (e) {
          console.warn(`[${PROVIDER_NAME}] Auth loader error:`, e)
          return null
        }
      },
      methods: [
        {
          type: "api",
          label: "Enter OpenReference API Key",
        },
      ],
    },

    provider: {
      id: PROVIDER_ID,
      models: async (_provider, ctx) => {
        try {
          if (!ctx.auth?.apiKey) {
            return FALLBACK_MODELS
          }

          const fetcher =
            typeof Bun !== "undefined" ? Bun.fetch : globalThis.fetch
          const response = await fetcher(`${BASE_URL}/models`, {
            headers: {
              Authorization: `Bearer ${ctx.auth.apiKey}`,
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
                models[m.id] = { name: `${m.id} (via OpenReference)` }
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

export { OpenReferenceAuth }
