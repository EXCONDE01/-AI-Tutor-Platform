ALTER TABLE "classes" ADD COLUMN "join_code" text;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_join_code_unique" UNIQUE("join_code");