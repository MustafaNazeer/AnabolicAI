-- 0004: session scoped exercise swaps, and the unfinished workout nudge.
-- Additive only. Creates one table and adds two boolean columns with defaults,
-- so existing rows backfill automatically and current production keeps working.

CREATE TABLE session_exercise_swaps (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id              UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    original_exercise_id    UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    replacement_exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT session_exercise_swaps_unique_slot
        UNIQUE (session_id, original_exercise_id),
    CONSTRAINT session_exercise_swaps_distinct
        CHECK (original_exercise_id <> replacement_exercise_id)
);

-- No standalone index on session_id: the unique constraint above creates a
-- composite index whose leading column is session_id, which serves that lookup.

ALTER TABLE session_exercise_swaps ENABLE ROW LEVEL SECURITY;

-- Ownership is proved by joining up to the session, the same way workout_sets
-- and routine_exercises do, so there is no denormalized user_id to protect.
CREATE POLICY session_exercise_swaps_select ON session_exercise_swaps FOR SELECT USING (
    EXISTS (SELECT 1 FROM workout_sessions WHERE workout_sessions.id = session_exercise_swaps.session_id AND workout_sessions.user_id = auth.uid())
);
CREATE POLICY session_exercise_swaps_insert ON session_exercise_swaps FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM workout_sessions WHERE workout_sessions.id = session_exercise_swaps.session_id AND workout_sessions.user_id = auth.uid())
);
CREATE POLICY session_exercise_swaps_update ON session_exercise_swaps FOR UPDATE USING (
    EXISTS (SELECT 1 FROM workout_sessions WHERE workout_sessions.id = session_exercise_swaps.session_id AND workout_sessions.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM workout_sessions WHERE workout_sessions.id = session_exercise_swaps.session_id AND workout_sessions.user_id = auth.uid())
);
CREATE POLICY session_exercise_swaps_delete ON session_exercise_swaps FOR DELETE USING (
    EXISTS (SELECT 1 FROM workout_sessions WHERE workout_sessions.id = session_exercise_swaps.session_id AND workout_sessions.user_id = auth.uid())
);

ALTER TABLE user_settings
    ADD COLUMN notif_unfinished BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE workout_sessions
    ADD COLUMN unfinished_notified BOOLEAN NOT NULL DEFAULT false;
