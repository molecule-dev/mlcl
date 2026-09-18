-- Adds in-row artifact storage for synchronous renders.
--
-- For lottie / svg / css formats the export handler renders the
-- artifact synchronously from the project's keyframes/layers and stores
-- the bytes here, then serves them via GET /api/exports/:id/download.
-- This avoids a runtime dependency on a separate render worker for the
-- simple text-based formats and avoids the S3 SVG MIME-type block
-- (svg uploads are denied at the bond level for XSS reasons).
--
-- Larger binary formats (gif, mp4) need a real video render bond
-- (e.g. @molecule/api-video-render-ffmpeg) which is not yet wired.
-- Until that ships, the UI hides those formats and only the
-- synchronously-renderable ones are exposed.
ALTER TABLE public.animation_exports
    ADD COLUMN IF NOT EXISTS artifact_data text,
    ADD COLUMN IF NOT EXISTS content_type text;
