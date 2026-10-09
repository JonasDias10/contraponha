ALTER TYPE "public"."media_status" ADD VALUE 'profile';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;