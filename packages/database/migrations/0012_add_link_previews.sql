CREATE TYPE "public"."link_preview_status" AS ENUM('ready', 'failed');--> statement-breakpoint
CREATE TABLE "link_previews" (
	"url" text PRIMARY KEY NOT NULL,
	"status" "link_preview_status" NOT NULL,
	"title" text,
	"description" text,
	"site_name" text,
	"image_key" text,
	"image_width" integer,
	"image_height" integer,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
