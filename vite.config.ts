import { defineConfig, loadEnv } from "vite";
import { vitePlugin as remix } from "@remix-run/dev";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      remix({
        future: {
          v3_fetcherPersist: true,
          v3_lazyRouteDiscovery: true,
          v3_relativeSplatPath: true,
          v3_throwAbortReason: true,
          v3_singleFetch: true,
        },
      }),
      tsconfigPaths(),
    ],
    server: {
      port: 3000,
    },
    define: {
      "process.env.GOOGLE_CLIENT_ID": JSON.stringify(env.GOOGLE_CLIENT_ID),
      "process.env.GOOGLE_CLIENT_SECRET": JSON.stringify(
        env.GOOGLE_CLIENT_SECRET
      ),
      "process.env.SESSION_SECRET": JSON.stringify(env.SESSION_SECRET),
    },
  };
});
