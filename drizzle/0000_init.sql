CREATE TABLE "access_codes" (
	"hash" text PRIMARY KEY NOT NULL,
	"album_id" text NOT NULL,
	"role" text DEFAULT 'client' NOT NULL,
	"code_enc" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "albums" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"event_type" text DEFAULT 'other' NOT NULL,
	"event_date" date,
	"place" text DEFAULT '' NOT NULL,
	"drive_folder_id" text NOT NULL,
	"drive_folder_name" text DEFAULT '' NOT NULL,
	"cover_photo_id" text,
	"status" text DEFAULT 'processing' NOT NULL,
	"code_version" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"allow_zip" boolean DEFAULT true NOT NULL,
	"reminder" boolean DEFAULT true NOT NULL,
	"email_lang" text DEFAULT 'es' NOT NULL,
	"photo_count" integer DEFAULT 0 NOT NULL,
	"processed_count" integer DEFAULT 0 NOT NULL,
	"publish_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip_key" text NOT NULL,
	"device_key" text NOT NULL,
	"ok" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" text PRIMARY KEY NOT NULL,
	"album_id" text NOT NULL,
	"name" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"drive_folder_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"album_id" text NOT NULL,
	"type" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favourites" (
	"album_id" text NOT NULL,
	"photo_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favourites_album_id_photo_id_pk" PRIMARY KEY("album_id","photo_id")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" text PRIMARY KEY NOT NULL,
	"album_id" text NOT NULL,
	"chapter_id" text,
	"drive_file_id" text NOT NULL,
	"name" text NOT NULL,
	"mime" text DEFAULT 'image/jpeg' NOT NULL,
	"size_bytes" bigint DEFAULT 0 NOT NULL,
	"md5" text,
	"width" integer,
	"height" integer,
	"sort" integer DEFAULT 0 NOT NULL,
	"preview_md5" text,
	"preview_version" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_content" (
	"id" integer PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_codes" ADD CONSTRAINT "access_codes_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favourites" ADD CONSTRAINT "favourites_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favourites" ADD CONSTRAINT "favourites_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_codes_album_idx" ON "access_codes" USING btree ("album_id");--> statement-breakpoint
CREATE INDEX "attempts_time_idx" ON "attempts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "chapters_album_idx" ON "chapters" USING btree ("album_id");--> statement-breakpoint
CREATE INDEX "events_album_idx" ON "events" USING btree ("album_id","created_at");--> statement-breakpoint
CREATE INDEX "photos_album_idx" ON "photos" USING btree ("album_id");