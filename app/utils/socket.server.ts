import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";

let io: Server | null = null;

export type NotificationPayload = {
  type: "connection_request" | "connection_accepted";
  userId: string;
  data: {
    id: string;
    message: string;
    metadata?: {
      connectionId?: string;
      [key: string]: unknown;
    };
  };
};

export function initializeSocketIO(httpServer: HTTPServer) {
  if (io) return io;

  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/ws",
    transports: ["websocket"],
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

  return io;
}

export function getSocketIO() {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }
  return io;
}

export function emitNotification(payload: NotificationPayload) {
  if (!io) {
    console.warn("Socket.IO is not initialized, skipping notification");
    return;
  }

  console.log(`Emitting notification to user:${payload.userId}`, payload.data);
  io.to(`user:${payload.userId}`).emit("notification", payload.data);
}