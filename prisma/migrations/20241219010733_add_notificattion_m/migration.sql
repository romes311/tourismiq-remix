/*
  Warnings:

  - Added the required column `message` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- First add the column as nullable
ALTER TABLE "Notification" ADD COLUMN "message" TEXT;

-- Update existing records with a default message based on their type
UPDATE "Notification"
SET message = CASE
  WHEN type = 'LIKE' THEN 'Liked your post'
  WHEN type = 'COMMENT' THEN 'Commented on your post'
  WHEN type = 'FOLLOW' THEN 'Started following you'
  WHEN type = 'MENTION' THEN 'Mentioned you in a post'
  WHEN type = 'REPLY' THEN 'Replied to your comment'
  ELSE 'New notification'
END;

-- Now make the column required
ALTER TABLE "Notification" ALTER COLUMN "message" SET NOT NULL;
