CREATE TYPE "public"."data_export_format" AS ENUM('html', 'json');--> statement-breakpoint
CREATE TYPE "public"."data_export_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."legal_document" AS ENUM('terms', 'privacy', 'guidelines');--> statement-breakpoint
CREATE TYPE "public"."report_subject" AS ENUM('me', 'someone_else', 'group');--> statement-breakpoint
CREATE TYPE "public"."reply_policy" AS ENUM('everyone', 'following');--> statement-breakpoint
ALTER TYPE "public"."verification_token_purpose" ADD VALUE 'magic_link';--> statement-breakpoint
ALTER TYPE "public"."moderation_action_type" ADD VALUE 'context_added';--> statement-breakpoint
ALTER TYPE "public"."moderation_action_type" ADD VALUE 'context_removed';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'mentioned';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'comment_highlighted';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'source_requested';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'content_removed';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'report_resolved';--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"document" "legal_document" NOT NULL,
	"version" text NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_exports" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"format" "data_export_format" NOT NULL,
	"sections" text[] NOT NULL,
	"status" "data_export_status" DEFAULT 'pending' NOT NULL,
	"storage_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"user_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_user_id_post_id_pk" PRIMARY KEY("user_id","post_id")
);
--> statement-breakpoint
CREATE TABLE "context_notes" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"post_id" uuid NOT NULL,
	"author_id" uuid,
	"body" text NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"removed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"replies" boolean DEFAULT true NOT NULL,
	"mentions" boolean DEFAULT true NOT NULL,
	"highlights" boolean DEFAULT true NOT NULL,
	"source_requests" boolean DEFAULT true NOT NULL,
	"reactions" boolean DEFAULT false NOT NULL,
	"follows" boolean DEFAULT false NOT NULL,
	"digest_hours" smallint[] DEFAULT '{}'::smallint[] NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_topics" (
	"post_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "post_topics_post_id_topic_id_pk" PRIMARY KEY("post_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "topic_follows" (
	"user_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topic_follows_user_id_topic_id_pk" PRIMARY KEY("user_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"is_curated" boolean DEFAULT false NOT NULL,
	"post_count" integer DEFAULT 0 NOT NULL,
	"follower_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topics_slug_unique" UNIQUE("slug"),
	CONSTRAINT "topics_slug_format" CHECK ("topics"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "topics_counts_nonnegative" CHECK ("topics"."post_count" >= 0 and "topics"."follower_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "comments" DROP CONSTRAINT "comments_reaction_counts_nonnegative";--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "posts_counts_nonnegative";--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "posts_reaction_counts_nonnegative";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_follow_counts_nonnegative";--> statement-breakpoint
ALTER TABLE "reactions" ALTER COLUMN "kind" SET DATA TYPE text;--> statement-breakpoint
DELETE FROM "reactions" WHERE "kind" IN ('agree', 'disagree');--> statement-breakpoint
DROP TYPE "public"."reaction_kind";--> statement-breakpoint
CREATE TYPE "public"."reaction_kind" AS ENUM('good_argument', 'insightful', 'changed_my_mind', 'needs_source');--> statement-breakpoint
ALTER TABLE "reactions" ALTER COLUMN "kind" SET DATA TYPE "public"."reaction_kind" USING "kind"::"public"."reaction_kind";--> statement-breakpoint
DROP INDEX "notifications_recipient_id_id_idx";--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "actor_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "comment_revisions" ADD COLUMN "sources" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "comment_revisions" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "highlighted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "highlight_note" text;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "changed_my_mind_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "needs_source_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "sources" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "removal_rule" text;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce("comments"."body", ''))) STORED;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD COLUMN "rule" text;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "subject" "report_subject";--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "previous_actor_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "actor_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "moderation_action_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "visible_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD COLUMN "sources" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "posts" drop column "search_vector";--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('portuguese', coalesce("posts"."title", '')), 'A') || setweight(to_tsvector('portuguese', coalesce("posts"."body", '')), 'B')) STORED;--> statement-breakpoint
CREATE INDEX "posts_search_vector_idx" ON "posts" USING gin ("search_vector");--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "reply_policy" "reply_policy" DEFAULT 'everyone' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "pinned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "highlighted_comment_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "changed_my_mind_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "needs_source_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "sources" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "removal_rule" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "headline" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pronouns" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "birth_date" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "timezone" text DEFAULT 'America/Sao_Paulo' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "post_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deletion_scheduled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "delete_contributions" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
UPDATE "users" SET "post_count" = (SELECT count(*) FROM "posts" WHERE "posts"."author_id" = "users"."id" AND "posts"."deleted_at" IS NULL);--> statement-breakpoint
UPDATE "notifications" SET "visible_at" = "created_at";--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_exports" ADD CONSTRAINT "data_exports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_notes" ADD CONSTRAINT "context_notes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_notes" ADD CONSTRAINT "context_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_topics" ADD CONSTRAINT "post_topics_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_topics" ADD CONSTRAINT "post_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_follows" ADD CONSTRAINT "topic_follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_follows" ADD CONSTRAINT "topic_follows_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consents_user_id_idx" ON "consents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "data_exports_user_id_id_idx" ON "data_exports" USING btree ("user_id","id");--> statement-breakpoint
CREATE INDEX "data_exports_pending_idx" ON "data_exports" USING btree ("created_at") WHERE "data_exports"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "bookmarks_user_id_created_at_idx" ON "bookmarks" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "context_notes_active_post_unique" ON "context_notes" USING btree ("post_id") WHERE "context_notes"."removed_at" is null;--> statement-breakpoint
CREATE INDEX "post_topics_topic_id_post_id_idx" ON "post_topics" USING btree ("topic_id","post_id");--> statement-breakpoint
CREATE INDEX "topic_follows_topic_id_idx" ON "topic_follows" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "topics_name_trgm_idx" ON "topics" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_previous_actor_id_users_id_fk" FOREIGN KEY ("previous_actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_moderation_action_id_moderation_actions_id_fk" FOREIGN KEY ("moderation_action_id") REFERENCES "public"."moderation_actions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comments_author_id_id_idx" ON "comments" USING btree ("author_id","id");--> statement-breakpoint
CREATE INDEX "comments_search_vector_idx" ON "comments" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "notifications_recipient_visible_at_id_idx" ON "notifications" USING btree ("recipient_id","visible_at","id");--> statement-breakpoint
CREATE INDEX "notifications_unread_group_idx" ON "notifications" USING btree ("recipient_id","type","post_id","comment_id") WHERE "notifications"."read_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "posts_one_pinned_per_author" ON "posts" USING btree ("author_id") WHERE "posts"."pinned_at" is not null;--> statement-breakpoint
CREATE INDEX "users_deletion_scheduled_at_idx" ON "users" USING btree ("deletion_scheduled_at") WHERE "users"."deletion_scheduled_at" is not null and "users"."deleted_at" is null;--> statement-breakpoint
ALTER TABLE "comments" DROP COLUMN "agree_count";--> statement-breakpoint
ALTER TABLE "comments" DROP COLUMN "disagree_count";--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN "agree_count";--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN "disagree_count";--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_highlight_note_requires_highlight" CHECK ("comments"."highlight_note" is null or "comments"."highlighted_at" is not null);--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_reaction_counts_nonnegative" CHECK ("comments"."good_argument_count" >= 0 and "comments"."insightful_count" >= 0 and "comments"."changed_my_mind_count" >= 0 and "comments"."needs_source_count" >= 0);--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_title_length" CHECK ("posts"."title" is null or char_length("posts"."title") between 1 and 150);--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_counts_nonnegative" CHECK ("posts"."comment_count" >= 0 and "posts"."highlighted_comment_count" >= 0);--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_reaction_counts_nonnegative" CHECK ("posts"."good_argument_count" >= 0 and "posts"."insightful_count" >= 0 and "posts"."changed_my_mind_count" >= 0 and "posts"."needs_source_count" >= 0);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_follow_counts_nonnegative" CHECK ("users"."follower_count" >= 0 and "users"."following_count" >= 0 and "users"."post_count" >= 0);--> statement-breakpoint
INSERT INTO "topics" ("slug", "name", "is_curated") VALUES
  ('mobilidade-urbana', 'Mobilidade urbana', true),
  ('politicas-publicas', 'Políticas públicas', true),
  ('economia', 'Economia', true),
  ('dados-abertos', 'Dados abertos', true),
  ('clima-e-amazonia', 'Clima e Amazônia', true),
  ('educacao', 'Educação', true),
  ('saude-publica', 'Saúde pública', true),
  ('ciencia', 'Ciência', true),
  ('literatura', 'Literatura', true),
  ('musica-brasileira', 'Música brasileira', true),
  ('futebol', 'Futebol', true),
  ('tecnologia', 'Tecnologia', true),
  ('cidades', 'Cidades', true),
  ('direito', 'Direito', true),
  ('cinema', 'Cinema', true),
  ('historia-do-brasil', 'História do Brasil', true);