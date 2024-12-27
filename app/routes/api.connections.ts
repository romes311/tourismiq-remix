import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticator } from "~/utils/auth.server";
import { prisma } from "~/utils/db.server";
import { emitNotification } from "~/utils/socket.server";

export async function action({ request }: ActionFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const userId = formData.get("userId")?.toString();

    console.log("[API Connections] Received request:", {
      currentUserId: user.id,
      targetUserId: userId,
    });

    if (!userId) {
      return json({ error: "User ID is required" }, { status: 400 });
    }

    // Check if connection already exists
    const existingConnection = await prisma.connection.findFirst({
      where: {
        OR: [
          {
            senderId: user.id,
            receiverId: userId,
          },
          {
            senderId: userId,
            receiverId: user.id,
          },
        ],
      },
    });

    if (existingConnection) {
      console.log("[API Connections] Connection already exists:", existingConnection);

      // If the connection was rejected, delete it and allow a new request
      if (existingConnection.status === "rejected") {
        await prisma.connection.delete({
          where: { id: existingConnection.id },
        });
      } else {
        return json(
          { error: "Connection request already exists" },
          { status: 400 }
        );
      }
    }

    // Create connection request
    const connection = await prisma.connection.create({
      data: {
        senderId: user.id,
        receiverId: userId,
        status: "pending",
      },
      include: {
        sender: true,
        receiver: true,
      },
    });

    console.log("[API Connections] Created connection:", connection);

    // Create notification for the receiver
    const notification = await prisma.notification.create({
      data: {
        userId: userId,
        type: "connection_request",
        message: `${user.name} sent you a connection request`,
        metadata: { connectionId: connection.id },
      },
    });

    console.log("[API Connections] Created notification:", notification);

    // Emit real-time notification
    emitNotification({
      type: "connection_request",
      userId: userId,
      data: {
        id: notification.id,
        message: notification.message,
        metadata: notification.metadata as { connectionId?: string },
      },
    });

    console.log("[API Connections] Emitted notification");

    return json({ success: true, connection });
  } catch (error) {
    console.error("[API Connections] Error:", error);
    return json(
      { error: "Failed to send connection request" },
      { status: 500 }
    );
  }
}