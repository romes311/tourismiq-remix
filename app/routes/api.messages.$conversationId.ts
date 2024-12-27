import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticator } from "~/utils/auth.server";
import { prisma } from "~/utils/db.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  const { conversationId } = params;

  if (!conversationId) {
    return json({ error: "Missing conversation ID" }, { status: 400 });
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
    });

    if (!conversation) {
      return json({ error: "Conversation not found" }, { status: 404 });
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            organization: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Update last read timestamp
    await prisma.conversationParticipant.update({
      where: {
        userId_conversationId: {
          userId: user.id,
          conversationId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    return json({ messages });
  } catch (error) {
    console.error("Failed to load messages:", error);
    return json(
      { error: "Failed to load messages" },
      { status: 500 }
    );
  }
}