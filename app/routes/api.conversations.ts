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

  const { participantId, message } = await request.json();

  if (!participantId) {
    return json({ error: "Missing participant ID" }, { status: 400 });
  }

  if (!message) {
    return json({ error: "Missing message" }, { status: 400 });
  }

  try {
    // Check if conversation already exists
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          {
            participants: {
              some: {
                userId: user.id,
              },
            },
          },
          {
            participants: {
              some: {
                userId: participantId,
              },
            },
          },
        ],
      },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
      },
    });

    let conversation;

    if (existingConversation) {
      // Use existing conversation
      conversation = existingConversation;
    } else {
      // Create new conversation
      conversation = await prisma.conversation.create({
        data: {
          participants: {
            create: [
              { userId: user.id },
              { userId: participantId },
            ],
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
    }

    // Create the message
    const newMessage = await prisma.message.create({
      data: {
        content: message,
        conversationId: conversation.id,
        senderId: user.id,
      },
      include: {
        sender: true,
      },
    });

    // Update conversation's lastMessageAt
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    // Create notification for the recipient
    const notification = await prisma.notification.create({
      data: {
        userId: participantId,
        type: "new_message",
        message: `${user.name} sent you a message`,
        metadata: {
          conversationId: conversation.id,
          messageId: newMessage.id,
        },
      },
    });

    // Emit real-time notification
    emitNotification({
      type: "new_message",
      userId: participantId,
      data: {
        id: notification.id,
        message: notification.message,
        metadata: notification.metadata as { conversationId: string; messageId: string },
      },
    });

    return json({ conversation });
  } catch (error) {
    console.error("Failed to create conversation:", error);
    return json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}