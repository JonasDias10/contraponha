CREATE TYPE "public"."verification_category" AS ENUM('public_figure', 'journalist', 'expert', 'institution');--> statement-breakpoint
ALTER TYPE "public"."moderation_action_type" ADD VALUE 'verification_granted';--> statement-breakpoint
ALTER TYPE "public"."moderation_action_type" ADD VALUE 'verification_revoked';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verification_category" "verification_category";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_verification_complete" CHECK (("users"."verification_category" is null) = ("users"."verified_at" is null));