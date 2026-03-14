-- Remove startDate and endDate from leagues table.
-- These dates are derived from the Tournament and do not need to be stored on the league.

ALTER TABLE "leagues" DROP COLUMN IF EXISTS "startDate";
ALTER TABLE "leagues" DROP COLUMN IF EXISTS "endDate";
