-- PostgreSQL partial uniqueness keeps concurrent plan creation from leaving
-- more than one ACTIVE plan for the same user.
CREATE UNIQUE INDEX "StudyPlan_one_active_per_user_idx"
ON "StudyPlan"("userId")
WHERE "status" = 'ACTIVE';
