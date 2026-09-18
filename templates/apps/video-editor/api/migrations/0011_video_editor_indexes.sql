-- video-editor: query-shape indexes for the per-app tables created in
-- 0010_video_editor_tables.sql.

CREATE INDEX IF NOT EXISTS video_projects_owner_updated_idx
  ON video_projects (owner_id, updated_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS video_projects_owner_created_idx
  ON video_projects (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS tracks_project_position_idx
  ON tracks (project_id, position);
CREATE INDEX IF NOT EXISTS tracks_owner_idx ON tracks (owner_id);

CREATE INDEX IF NOT EXISTS clips_project_position_idx
  ON clips (project_id, position);
CREATE INDEX IF NOT EXISTS clips_track_position_idx
  ON clips (track_id, position);
CREATE INDEX IF NOT EXISTS clips_owner_idx ON clips (owner_id);

CREATE INDEX IF NOT EXISTS transitions_project_position_idx
  ON transitions (project_id, position);
CREATE INDEX IF NOT EXISTS transitions_owner_idx ON transitions (owner_id);

CREATE INDEX IF NOT EXISTS video_exports_project_status_idx
  ON video_exports (project_id, status);
CREATE INDEX IF NOT EXISTS video_exports_owner_created_idx
  ON video_exports (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS assets_owner_kind_idx
  ON assets (owner_id, kind);
CREATE INDEX IF NOT EXISTS assets_owner_created_idx
  ON assets (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS templates_category_idx
  ON templates (category);

CREATE INDEX IF NOT EXISTS effects_clip_position_idx
  ON effects (clip_id, position);
CREATE INDEX IF NOT EXISTS effects_owner_idx ON effects (owner_id);
