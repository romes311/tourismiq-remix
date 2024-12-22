/*
  Warnings:

  - You are about to drop the column `bio` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "bio",
ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "linkedIn" TEXT,
ADD COLUMN     "location" TEXT,
ALTER COLUMN "organization" DROP NOT NULL;
