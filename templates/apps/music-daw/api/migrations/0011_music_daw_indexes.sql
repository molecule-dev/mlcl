-- music-daw: app-specific indexes for common query patterns.

CREATE INDEX IF NOT EXISTS music_projects_owner_created_idx
  ON music_projects (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audio_tracks_project_position_idx
  ON audio_tracks (project_id, position);

CREATE INDEX IF NOT EXISTS audio_effects_track_position_idx
  ON audio_effects (track_id, position);

CREATE INDEX IF NOT EXISTS audio_exports_project_created_idx
  ON audio_exports (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS samples_owner_name_idx
  ON samples (user_id, name);

CREATE INDEX IF NOT EXISTS samples_public_name_idx
  ON samples (is_public, name);

CREATE INDEX IF NOT EXISTS clips_track_start_idx
  ON clips (track_id, start_time);

CREATE INDEX IF NOT EXISTS midi_notes_clip_start_idx
  ON midi_notes (clip_id, start);

CREATE INDEX IF NOT EXISTS collaborators_project_idx
  ON collaborators (project_id, collaborator_user_id);
