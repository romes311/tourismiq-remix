import { defineConfig, loadEnv } from "vite";
import { vitePlugin as remix } from "@remix-run/dev";
import tsconfigPaths from "vite-tsconfig-paths";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
      {
        name: "socket-io",
        configureServer(server) {
          if (!server.httpServer) return;

          const io = new Server(server.httpServer, {
            cors: {
              origin: "*",
              methods: ["GET", "POST"],
              credentials: true,
            },
            path: "/ws",
            transports: ["websocket"],
          });

          io.on("connection", (socket) => {
            if (process.env.NODE_ENV === "development") {
              console.log("Client connected:", socket.id);
            }

            socket.on("join", (userId) => {
              if (userId) {
                socket.join(`user:${userId}`);
                if (process.env.NODE_ENV === "development") {
                  console.log(`User ${userId} joined their room`);
                }
              }
            });

            socket.on("disconnect", () => {
              const userId = socket.handshake.auth.userId;
              if (userId) {
                socket.leave(`user:${userId}`);
                if (process.env.NODE_ENV === "development") {
                  console.log(`User ${userId} left their room`);
                }
              }
            });
          });
        },
      },
    ],
    server: {
      port: 3000,
    },
    publicDir: "public",
    define: {
      "process.env.GOOGLE_CLIENT_ID": JSON.stringify(env.GOOGLE_CLIENT_ID),
      "process.env.GOOGLE_CLIENT_SECRET": JSON.stringify(
        env.GOOGLE_CLIENT_SECRET
      ),
      "process.env.SESSION_SECRET": JSON.stringify(env.SESSION_SECRET),
      __dirname: JSON.stringify(__dirname),
    },
    resolve: {
      alias: {
        ".prisma/client": "./node_modules/.prisma/client",
      },
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    optimizeDeps: {
      exclude: ["@prisma/client"],
    },
    ssr: {
      external: ["@prisma/client"],
    },
  };
});
