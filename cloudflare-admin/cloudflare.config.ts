import { bindings, defineConfig } from "cf/config";

// Secretos y variables sensibles se gestionan vía `cf secret put` o `.dev.vars` (nunca en código).
export default defineConfig({
  worker: {
    name: "fitstore-admin",
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
    },
  },
});
