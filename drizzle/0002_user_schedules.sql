CREATE TABLE IF NOT EXISTS "user_schedules" (
  "user_id" text NOT NULL,
  "schedule_id" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "user_schedules_pk" PRIMARY KEY ("user_id", "schedule_id"),
  CONSTRAINT "user_schedules_user_id_user_id_fk"
    FOREIGN KEY ("user_id")
    REFERENCES "user"("id")
    ON DELETE cascade,
  CONSTRAINT "user_schedules_schedule_id_schedules_id_fk"
    FOREIGN KEY ("schedule_id")
    REFERENCES "schedules"("id")
    ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "user_schedules_user_id_idx"
  ON "user_schedules" ("user_id");

CREATE INDEX IF NOT EXISTS "user_schedules_schedule_id_idx"
  ON "user_schedules" ("schedule_id");
