CREATE TABLE IF NOT EXISTS "{{TABLE_NAME}}" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
  -- TODO: Add columns
);
