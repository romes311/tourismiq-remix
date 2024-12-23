-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "commentCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");
