import { bindings, defineConfig } from "cf/config";

// Secretos de Mercado Pago (NUNCA escribir tokens aquí):
//   Producción: echo "<token>" | cf secret put MP_ACCESS_TOKEN
//   Local:      definir MP_PUBLIC_KEY y MP_ACCESS_TOKEN en .dev.vars (ignorado por Git)
export default defineConfig({
  worker: {
    name: "fitstore-tienda",
    compatibilityDate: "2026-11-10",
    entrypoint: "./src/index.js",
    assets: {
      notFoundHandling: "single-page-application",
      runWorkerFirst: ["/api/*"],
    },
    observability: {
      enabled: true,
    },
    env: {
      ASSETS: bindings.assets(),
      DB: bindings.d1({
        id: "869c496d-14b0-440f-8e4a-5632dacd37e2",
        name: "fitstore-db",
      }),
      AI: bindings.ai(),
    },
  },
});
