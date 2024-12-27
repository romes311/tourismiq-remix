import type { Prisma } from "@prisma/client";

export type Member = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    avatar: true;
    jobTitle: true;
    organization: true;
    location: true;
    linkedIn: true;
    receivedConnections: {
      select: {
        id: true;
        status: true;
        senderId: true;
        receiverId: true;
      };
      where: {
        senderId: string;
      };
    };
    sentConnections: {
      select: {
        id: true;
        status: true;
        senderId: true;
        receiverId: true;
      };
      where: {
        receiverId: string;
      };
    };
  };
}>;