DELETE FROM "verification_tokens" WHERE "purpose" = 'magic_link';--> statement-breakpoint
ALTER TABLE "verification_tokens" ALTER COLUMN "purpose" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."verification_token_purpose";--> statement-breakpoint
CREATE TYPE "public"."verification_token_purpose" AS ENUM('email_verification', 'password_reset');--> statement-breakpoint
ALTER TABLE "verification_tokens" ALTER COLUMN "purpose" SET DATA TYPE "public"."verification_token_purpose" USING "purpose"::"public"."verification_token_purpose";