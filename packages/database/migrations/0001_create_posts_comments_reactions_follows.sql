CREATE TYPE "public"."reaction_kind" AS ENUM('good_argument', 'insightful', 'agree', 'disagree');--> statement-breakpoint
CREATE TABLE "comment_revisions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"comment_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"post_id" uuid NOT NULL,
	"parent_id" uuid,
	"author_id" uuid NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"body" text,
	"good_argument_count" integer DEFAULT 0 NOT NULL,
	"insightful_count" integer DEFAULT 0 NOT NULL,
	"agree_count" integer DEFAULT 0 NOT NULL,
	"disagree_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "comments_body_matches_state" CHECK (("comments"."deleted_at" is null and char_length("comments"."body") between 1 and 2000) or ("comments"."deleted_at" is not null and "comments"."body" is null)),
	CONSTRAINT "comments_counts_nonnegative" CHECK ("comments"."reply_count" >= 0),
	CONSTRAINT "comments_reaction_counts_nonnegative" CHECK ("comments"."good_argument_count" >= 0 and "comments"."insightful_count" >= 0 and "comments"."agree_count" >= 0 and "comments"."disagree_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"follower_id" uuid NOT NULL,
	"followee_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_id_followee_id_pk" PRIMARY KEY("follower_id","followee_id"),
	CONSTRAINT "follows_not_self" CHECK ("follows"."follower_id" <> "follows"."followee_id")
);
--> statement-breakpoint
CREATE TABLE "post_revisions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"post_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"author_id" uuid NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"body" text,
	"good_argument_count" integer DEFAULT 0 NOT NULL,
	"insightful_count" integer DEFAULT 0 NOT NULL,
	"agree_count" integer DEFAULT 0 NOT NULL,
	"disagree_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "posts_body_matches_state" CHECK (("posts"."deleted_at" is null and char_length("posts"."body") between 1 and 5000) or ("posts"."deleted_at" is not null and "posts"."body" is null)),
	CONSTRAINT "posts_counts_nonnegative" CHECK ("posts"."comment_count" >= 0),
	CONSTRAINT "posts_reaction_counts_nonnegative" CHECK ("posts"."good_argument_count" >= 0 and "posts"."insightful_count" >= 0 and "posts"."agree_count" >= 0 and "posts"."disagree_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"post_id" uuid,
	"comment_id" uuid,
	"kind" "reaction_kind" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reactions_single_target" CHECK (num_nonnulls("reactions"."post_id", "reactions"."comment_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "follower_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "following_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "comment_revisions" ADD CONSTRAINT "comment_revisions_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_followee_id_users_id_fk" FOREIGN KEY ("followee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD CONSTRAINT "post_revisions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comment_revisions_comment_id_idx" ON "comment_revisions" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "comments_post_id_id_idx" ON "comments" USING btree ("post_id","id");--> statement-breakpoint
CREATE INDEX "comments_parent_id_id_idx" ON "comments" USING btree ("parent_id","id");--> statement-breakpoint
CREATE INDEX "follows_followee_id_created_at_idx" ON "follows" USING btree ("followee_id","created_at");--> statement-breakpoint
CREATE INDEX "follows_follower_id_created_at_idx" ON "follows" USING btree ("follower_id","created_at");--> statement-breakpoint
CREATE INDEX "post_revisions_post_id_idx" ON "post_revisions" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "posts_author_id_id_idx" ON "posts" USING btree ("author_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_post_user_kind_unique" ON "reactions" USING btree ("post_id","user_id","kind") WHERE "reactions"."post_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_comment_user_kind_unique" ON "reactions" USING btree ("comment_id","user_id","kind") WHERE "reactions"."comment_id" is not null;--> statement-breakpoint
CREATE INDEX "reactions_user_id_idx" ON "reactions" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_follow_counts_nonnegative" CHECK ("users"."follower_count" >= 0 and "users"."following_count" >= 0);