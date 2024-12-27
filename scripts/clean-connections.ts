import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanupDuplicateConnections() {
  try {
    // Get all connections
    const connections = await prisma.connection.findMany({
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Track unique pairs
    const seen = new Set<string>();
    const duplicates: string[] = [];

    // Find duplicates
    for (const conn of connections) {
      const pair = [conn.senderId, conn.receiverId].sort().join('-');
      if (seen.has(pair)) {
        duplicates.push(conn.id);
      } else {
        seen.add(pair);
      }
    }

    // Delete duplicates
    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} duplicate connections. Deleting...`);
      await prisma.connection.deleteMany({
        where: {
          id: {
            in: duplicates
          }
        }
      });
      console.log('Duplicates deleted successfully.');
    } else {
      console.log('No duplicate connections found.');
    }

  } catch (error) {
    console.error('Error cleaning up connections:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicateConnections();