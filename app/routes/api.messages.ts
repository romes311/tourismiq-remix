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

  const { conversationId, content } = await request.json();

  if (!conversationId || !content) {
    return json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    // Verify user is part of the conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: {
          some: {
            userId: user.id,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!conversation) {
      return json({ error: "Conversation not found" }, { status: 404 });
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        content,
        senderId: user.id,
        conversationId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Update conversation's lastMessageAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // Notify other participants
    const otherParticipants = conversation.participants.filter(
      (p) => p.userId !== user.id
    );

    for (const participant of otherParticipants) {
      // Create notification
      const notification = await prisma.notification.create({
        data: {
          type: "new_message",
          message: `New message from ${user.name}`,
          userId: participant.userId,
          metadata: {
            conversationId,
            messageId: message.id,
          },
        },
      });

      // Emit real-time notification
      emitNotification({
        type: "new_message",
        userId: participant.userId,
        data: {
          id: notification.id,
          message: notification.message,
          metadata: {
            conversationId,
            messageId: message.id,
          },
        },
      });
    }

    return json({ success: true, message });
  } catch (error) {
    console.error("Failed to send message:", error);
    return json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}