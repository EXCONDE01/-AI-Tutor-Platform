ALTER TYPE "public"."export_format" ADD VALUE 'google_forms' BEFORE 'canvas';--> statement-breakpoint
ALTER TYPE "public"."export_format" ADD VALUE 'google_slides' BEFORE 'canvas';--> statement-breakpoint
ALTER TABLE "export_jobs" ALTER COLUMN "artifact_id" DROP NOT NULL;