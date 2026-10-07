ALTER TABLE "bundles" ADD COLUMN IF NOT EXISTS "image_file_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bundles_image_file_id_fkey'
  ) THEN
    ALTER TABLE "bundles"
      ADD CONSTRAINT "bundles_image_file_id_fkey"
      FOREIGN KEY ("image_file_id") REFERENCES "files"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
