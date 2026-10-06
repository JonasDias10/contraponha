CREATE TYPE "public"."content_removal" AS ENUM('author', 'moderation');--> statement-breakpoint
CREATE TYPE "public"."media_status" AS ENUM('pending', 'attached');--> statement-breakpoint
CREATE TYPE "public"."moderation_action_type" AS ENUM('content_removed', 'report_resolved', 'report_dismissed', 'role_changed');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('spam', 'harassment', 'hate', 'misinformation', 'violence', 'sexual_content', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."report_target_type" AS ENUM('post', 'comment', 'user');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('post_commented', 'comment_replied', 'post_reacted', 'comment_reacted', 'user_followed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('member', 'moderator', 'admin');--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"owner_id" uuid NOT NULL,
	"post_id" uuid,
	"position" smallint,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"status" "media_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attached_at" timestamp with time zone,
	CONSTRAINT "media_assets_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "media_assets_attachment_matches_status" CHECK (("media_assets"."status" = 'attached') = ("media_assets"."post_id" is not null and "media_assets"."position" is not null)),
	CONSTRAINT "media_assets_size_positive" CHECK ("media_assets"."size_bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "moderation_actions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"moderator_id" uuid,
	"type" "moderation_action_type" NOT NULL,
	"report_id" uuid,
	"post_id" uuid,
	"comment_id" uuid,
	"target_user_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"reporter_id" uuid NOT NULL,
	"target_type" "report_target_type" NOT NULL,
	"post_id" uuid,
	"comment_id" uuid,
	"target_user_id" uuid,
	"reason" "report_reason" NOT NULL,
	"details" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by_id" uuid,
	CONSTRAINT "reports_target_matches_type" CHECK (num_nonnulls("reports"."post_id", "reports"."comment_id", "reports"."target_user_id") = 1
        and ("reports"."target_type" <> 'post' or "reports"."post_id" is not null)
        and ("reports"."target_type" <> 'comment' or "reports"."comment_id" is not null)
        and ("reports"."target_type" <> 'user' or "reports"."target_user_id" is not null)),
	CONSTRAINT "reports_resolution_matches_status" CHECK (("reports"."status" = 'open') = ("reports"."resolved_at" is null))
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"post_id" uuid,
	"comment_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "removed_by" "content_removal";--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "removed_by" "content_removal";--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce("posts"."body", ''))) STORED;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_id_users_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_assets_post_id_position_idx" ON "media_assets" USING btree ("post_id","position");--> statement-breakpoint
CREATE INDEX "media_assets_owner_id_status_idx" ON "media_assets" USING btree ("owner_id","status");--> statement-breakpoint
CREATE INDEX "reports_status_id_idx" ON "reports" USING btree ("status","id");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_open_post_unique" ON "reports" USING btree ("reporter_id","post_id") WHERE "reports"."status" = 'open' and "reports"."post_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "reports_open_comment_unique" ON "reports" USING btree ("reporter_id","comment_id") WHERE "reports"."status" = 'open' and "reports"."comment_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "reports_open_user_unique" ON "reports" USING btree ("reporter_id","target_user_id") WHERE "reports"."status" = 'open' and "reports"."target_user_id" is not null;--> statement-breakpoint
CREATE INDEX "notifications_recipient_id_id_idx" ON "notifications" USING btree ("recipient_id","id");--> statement-breakpoint
CREATE INDEX "notifications_unread_recipient_id_idx" ON "notifications" USING btree ("recipient_id") WHERE "notifications"."read_at" is null;--> statement-breakpoint
CREATE INDEX "posts_active_created_at_idx" ON "posts" USING btree ("created_at") WHERE "posts"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "posts_search_vector_idx" ON "posts" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "users_handle_trgm_idx" ON "users" USING gin ("handle" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "users_display_name_trgm_idx" ON "users" USING gin ("display_name" gin_trgm_ops);--> statement-breakpoint
UPDATE "comments" SET "removed_by" = 'author' WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
UPDATE "posts" SET "removed_by" = 'author' WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_removal_matches_state" CHECK (("comments"."deleted_at" is null) = ("comments"."removed_by" is null));--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_removal_matches_state" CHECK (("posts"."deleted_at" is null) = ("posts"."removed_by" is null));