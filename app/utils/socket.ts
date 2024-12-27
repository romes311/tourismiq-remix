import { io } from "socket.io-client";

// Create a socket instance with configuration
export const socket = io({
  path: "/ws",
  transports: ["websocket"],
  autoConnect: false, // Don't connect automatically
  reconnection: true, // Enable reconnection
  reconnectionDelay: 1000, // Wait 1 second before trying to reconnect
  reconnectionAttempts: 5, // Try to reconnect 5 times
});

// Only log in development
if (process.env.NODE_ENV === "development") {
  socket.on("connect", () => {
    console.log("WebSocket connected");
  });

  socket.on("disconnect", () => {
    console.log("WebSocket disconnected");
  });
}