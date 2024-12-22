/*
  Warnings:

  - You are about to drop the column `authorId` on the `Post` table. All the data in the column will be lost.
  - Added the required column `userId` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- First, add the new columns
ALTER TABLE "Post" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Post" ADD COLUMN "userId" TEXT;

-- Copy data from authorId to userId
UPDATE "Post" SET "userId" = "authorId";

-- Make userId NOT NULL after copying data
ALTER TABLE "Post" ALTER COLUMN "userId" SET NOT NULL;

-- Drop the old column and constraint
ALTER TABLE "Post" DROP CONSTRAINT "Post_authorId_fkey";
ALTER TABLE "Post" DROP COLUMN "authorId";

-- Add the new foreign key constraint
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
