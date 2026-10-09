ALTER TYPE "public"."moderation_action_type" ADD VALUE 'user_suspended';--> statement-breakpoint
ALTER TYPE "public"."moderation_action_type" ADD VALUE 'suspension_lifted';--> statement-breakpoint
ALTER TYPE "public"."moderation_action_type" ADD VALUE 'avatar_removed';--> statement-breakpoint
ALTER TYPE "public"."moderation_action_type" ADD VALUE 'topic_updated';--> statement-breakpoint
CREATE TABLE "suspensions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"moderator_id" uuid,
	"rule" text NOT NULL,
	"note" text,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lifted_at" timestamp with time zone,
	"lifted_by_id" uuid,
	CONSTRAINT "suspensions_ends_after_start" CHECK ("suspensions"."ends_at" is null or "suspensions"."ends_at" > "suspensions"."created_at")
);
--> statement-breakpoint
ALTER TABLE "suspensions" ADD CONSTRAINT "suspensions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suspensions" ADD CONSTRAINT "suspensions_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suspensions" ADD CONSTRAINT "suspensions_lifted_by_id_users_id_fk" FOREIGN KEY ("lifted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "suspensions_open_user_unique" ON "suspensions" USING btree ("user_id") WHERE "suspensions"."lifted_at" is null;--> statement-breakpoint
CREATE INDEX "suspensions_user_id_created_at_idx" ON "suspensions" USING btree ("user_id","created_at");