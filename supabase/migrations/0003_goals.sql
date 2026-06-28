-- supabase/migrations/0003_goals.sql
-- Onyx v2: per-lift goals (weight x reps targets) and the goal notification toggle.

CREATE TABLE goals (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id        UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    target_weight      DECIMAL NOT NULL CHECK (target_weight >= 0),
    target_reps        INTEGER NOT NULL CHECK (target_reps > 0),
    status             TEXT NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','achieved')),
    proximity_notified BOOLEAN NOT NULL DEFAULT false,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    achieved_at        TIMESTAMPTZ
);

-- One active goal per (user, exercise); achieved rows are unconstrained history.
CREATE UNIQUE INDEX idx_goals_one_active_per_exercise
    ON goals(user_id, exercise_id) WHERE status = 'active';
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_exercise_id ON goals(exercise_id);

CREATE TRIGGER trg_goals_no_user_id_change
    BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION prevent_user_id_change();

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY goals_select ON goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY goals_insert ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY goals_update ON goals FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY goals_delete ON goals FOR DELETE USING (auth.uid() = user_id);

-- Goal notification toggle, consistent with the other notif_* columns.
ALTER TABLE user_settings
    ADD COLUMN notif_goal BOOLEAN NOT NULL DEFAULT true;
