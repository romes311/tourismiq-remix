import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";

let io: Server | null = null;

export interface NotificationPayload {
  type: "connection_request" | "connection_accepted" | "new_message";
  userId: string;
  data: {
    id: string;
    message: string;
    metadata: {
      connectionId?: string;
      conversationId?: string;
      messageId?: string;
    };
  };
}

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
    const userId = socket.handshake.auth.userId;
    if (userId) {
      socket.join(`user:${userId}`);
      if (process.env.NODE_ENV === "development") {
        console.log(`WebSocket: User ${userId} connected (${socket.id})`);
      }
    }

    socket.on("disconnect", () => {
      if (userId) {
        socket.leave(`user:${userId}`);
        if (process.env.NODE_ENV === "development") {
          console.log(`WebSocket: User ${userId} disconnected (${socket.id})`);
        }
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

  if (process.env.NODE_ENV === "development") {
    console.log(`WebSocket: Emitting notification to user:${payload.userId}`);
  }
  io.to(`user:${payload.userId}`).emit("notification", payload.data);
}