ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS "phone_number" text;

ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS "phone_number_verified" boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  ALTER TABLE "user" ADD CONSTRAINT "user_phone_number_unique" UNIQUE ("phone_number");
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;
