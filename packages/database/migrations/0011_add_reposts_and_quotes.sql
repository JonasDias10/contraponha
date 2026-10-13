ALTER TYPE "public"."notification_type" ADD VALUE 'post_reposted';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'post_quoted';--> statement-breakpoint
CREATE TABLE "reposts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "quoted_post_id" uuid;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "repost_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "quote_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "reposts" ADD CONSTRAINT "reposts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reposts" ADD CONSTRAINT "reposts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reposts_user_post_unique" ON "reposts" USING btree ("user_id","post_id");--> statement-breakpoint
CREATE INDEX "reposts_user_id_id_idx" ON "reposts" USING btree ("user_id","id");--> statement-breakpoint
CREATE INDEX "reposts_post_id_idx" ON "reposts" USING btree ("post_id");--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_quoted_post_id_posts_id_fk" FOREIGN KEY ("quoted_post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "posts_quoted_post_id_idx" ON "posts" USING btree ("quoted_post_id") WHERE "posts"."quoted_post_id" is not null;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_share_counts_nonnegative" CHECK ("posts"."repost_count" >= 0 and "posts"."quote_count" >= 0);