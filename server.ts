import { createRequestHandler } from "@remix-run/express";
import { broadcastDevReady, installGlobals } from "@remix-run/node";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

installGlobals();

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? undefined
    : await import("vite").then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        })
      );

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  path: "/ws",
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  const userId = socket.handshake.auth.userId;
  if (userId) {
    socket.join(`user:${userId}`);
    console.log(`User ${userId} joined their room`);
  }

  socket.on("disconnect", () => {
    if (userId) {
      socket.leave(`user:${userId}`);
      console.log(`User ${userId} left their room`);
    }
  });
});

// handle asset requests
if (viteDevServer) {
  app.use(viteDevServer.middlewares);
} else {
  app.use(
    "/assets",
    express.static("build/client/assets", { immutable: true, maxAge: "1y" })
  );
}
app.use(express.static("build/client", { maxAge: "1h" }));

// handle SSR requests
app.all(
  "*",
  createRequestHandler({
    build: viteDevServer
      ? () => viteDevServer.ssrLoadModule("virtual:remix/server-build")
      : await import("./build/server/index.js"),
  })
);

const port = process.env.PORT || 3000;
httpServer.listen(port, async () => {
  console.log(`Express server listening on port ${port}`);
  if (process.env.NODE_ENV === "development") {
    broadcastDevReady(await import("@remix-run/dev/server-build"));
  }
});