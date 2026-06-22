-- Onyx: initial schema, indexes, triggers, and Row Level Security.
-- Users are managed by Supabase Auth (auth.users).

-- Core training tables -------------------------------------------------------

CREATE TABLE routines (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT routines_name_length CHECK (char_length(name) <= 200)
);

CREATE TABLE exercises (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    muscle_group  TEXT,
    is_default    BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT exercises_default_no_user CHECK (
        (is_default = true AND user_id IS NULL) OR
        (is_default = false AND user_id IS NOT NULL)
    ),
    CONSTRAINT exercises_name_length CHECK (char_length(name) <= 200),
    CONSTRAINT exercises_muscle_group_length CHECK (
        muscle_group IS NULL OR char_length(muscle_group) <= 100
    )
);

CREATE TABLE routine_exercises (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id    UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    exercise_id   UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    order_index   INTEGER NOT NULL,
    default_sets  INTEGER NOT NULL DEFAULT 3,
    CONSTRAINT routine_exercises_order_positive CHECK (order_index >= 0),
    CONSTRAINT routine_exercises_sets_positive CHECK (default_sets > 0),
    CONSTRAINT routine_exercises_unique_exercise UNIQUE (routine_id, exercise_id)
);

CREATE TABLE workout_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    routine_id    UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at  TIMESTAMPTZ
);

CREATE TABLE workout_sets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    set_number  INTEGER NOT NULL,
    reps        INTEGER NOT NULL,
    weight      DECIMAL NOT NULL,
    rir         INTEGER NOT NULL,
    logged_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT workout_sets_reps_positive CHECK (reps > 0),
    CONSTRAINT workout_sets_weight_non_negative CHECK (weight >= 0),
    CONSTRAINT workout_sets_rir_range CHECK (rir >= 0 AND rir <= 5),
    CONSTRAINT workout_sets_set_number_positive CHECK (set_number > 0)
);

-- Settings and push ----------------------------------------------------------

CREATE TABLE user_settings (
    user_id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    theme              TEXT NOT NULL DEFAULT 'cobalt'
        CHECK (theme IN ('cobalt','magenta','emerald','crimson','rose')),
    rest_timer_seconds INTEGER NOT NULL DEFAULT 120
        CHECK (rest_timer_seconds > 0 AND rest_timer_seconds <= 3600),
    notif_master       BOOLEAN NOT NULL DEFAULT false,
    notif_rest_timer   BOOLEAN NOT NULL DEFAULT true,
    notif_reminder     BOOLEAN NOT NULL DEFAULT false,
    reminder_days      TEXT,
    reminder_time      TIME,
    notif_streak       BOOLEAN NOT NULL DEFAULT true,
    notif_pr           BOOLEAN NOT NULL DEFAULT true,
    notif_weekly       BOOLEAN NOT NULL DEFAULT true,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE push_subscriptions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint    TEXT NOT NULL,
    p256dh      TEXT NOT NULL,
    auth        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT push_subscriptions_unique_endpoint UNIQUE (user_id, endpoint)
);

-- Indexes --------------------------------------------------------------------

CREATE INDEX idx_routines_user_id ON routines(user_id);
CREATE INDEX idx_exercises_user_id ON exercises(user_id);
CREATE INDEX idx_routine_exercises_routine_id ON routine_exercises(routine_id);
CREATE INDEX idx_routine_exercises_exercise_id ON routine_exercises(exercise_id);
CREATE INDEX idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX idx_workout_sessions_routine_id ON workout_sessions(routine_id);
CREATE INDEX idx_workout_sets_session_id ON workout_sets(session_id);
CREATE INDEX idx_workout_sets_exercise_id ON workout_sets(exercise_id);
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Triggers -------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_routines_updated_at
    BEFORE UPDATE ON routines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION prevent_user_id_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION 'Changing user_id is not allowed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_routines_no_user_id_change
    BEFORE UPDATE ON routines
    FOR EACH ROW EXECUTE FUNCTION prevent_user_id_change();
CREATE TRIGGER trg_exercises_no_user_id_change
    BEFORE UPDATE ON exercises
    FOR EACH ROW EXECUTE FUNCTION prevent_user_id_change();
CREATE TRIGGER trg_workout_sessions_no_user_id_change
    BEFORE UPDATE ON workout_sessions
    FOR EACH ROW EXECUTE FUNCTION prevent_user_id_change();

-- Row Level Security ---------------------------------------------------------

ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- routines
CREATE POLICY routines_select ON routines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY routines_insert ON routines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY routines_update ON routines FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY routines_delete ON routines FOR DELETE USING (auth.uid() = user_id);

-- exercises (own rows; default rows readable by any authenticated user)
CREATE POLICY exercises_select ON exercises FOR SELECT USING (
    auth.uid() IS NOT NULL AND (auth.uid() = user_id OR (is_default = true AND user_id IS NULL))
);
CREATE POLICY exercises_insert ON exercises FOR INSERT WITH CHECK (auth.uid() = user_id AND is_default = false);
CREATE POLICY exercises_update ON exercises FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY exercises_delete ON exercises FOR DELETE USING (auth.uid() = user_id);

-- routine_exercises (ownership via routines join)
CREATE POLICY routine_exercises_select ON routine_exercises FOR SELECT USING (
    EXISTS (SELECT 1 FROM routines WHERE routines.id = routine_exercises.routine_id AND routines.user_id = auth.uid())
);
CREATE POLICY routine_exercises_insert ON routine_exercises FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM routines WHERE routines.id = routine_exercises.routine_id AND routines.user_id = auth.uid())
);
CREATE POLICY routine_exercises_update ON routine_exercises FOR UPDATE USING (
    EXISTS (SELECT 1 FROM routines WHERE routines.id = routine_exercises.routine_id AND routines.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM routines WHERE routines.id = routine_exercises.routine_id AND routines.user_id = auth.uid())
);
CREATE POLICY routine_exercises_delete ON routine_exercises FOR DELETE USING (
    EXISTS (SELECT 1 FROM routines WHERE routines.id = routine_exercises.routine_id AND routines.user_id = auth.uid())
);

-- workout_sessions
CREATE POLICY workout_sessions_select ON workout_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY workout_sessions_insert ON workout_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY workout_sessions_update ON workout_sessions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY workout_sessions_delete ON workout_sessions FOR DELETE USING (auth.uid() = user_id);

-- workout_sets (ownership via session join)
CREATE POLICY workout_sets_select ON workout_sets FOR SELECT USING (
    EXISTS (SELECT 1 FROM workout_sessions WHERE workout_sessions.id = workout_sets.session_id AND workout_sessions.user_id = auth.uid())
);
CREATE POLICY workout_sets_insert ON workout_sets FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM workout_sessions WHERE workout_sessions.id = workout_sets.session_id AND workout_sessions.user_id = auth.uid())
);
CREATE POLICY workout_sets_update ON workout_sets FOR UPDATE USING (
    EXISTS (SELECT 1 FROM workout_sessions WHERE workout_sessions.id = workout_sets.session_id AND workout_sessions.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM workout_sessions WHERE workout_sessions.id = workout_sets.session_id AND workout_sessions.user_id = auth.uid())
);
CREATE POLICY workout_sets_delete ON workout_sets FOR DELETE USING (
    EXISTS (SELECT 1 FROM workout_sessions WHERE workout_sessions.id = workout_sets.session_id AND workout_sessions.user_id = auth.uid())
);

-- user_settings (one row per user)
CREATE POLICY user_settings_select ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_settings_insert ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_settings_update ON user_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_settings_delete ON user_settings FOR DELETE USING (auth.uid() = user_id);

-- push_subscriptions
CREATE POLICY push_subscriptions_select ON push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY push_subscriptions_insert ON push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY push_subscriptions_update ON push_subscriptions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY push_subscriptions_delete ON push_subscriptions FOR DELETE USING (auth.uid() = user_id);
