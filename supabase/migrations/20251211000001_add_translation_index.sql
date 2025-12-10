-- Enable pg_trgm extension for GIN index
create extension if not exists pg_trgm;

-- Index for searching translations text (partial match)
create index if not exists idx_translation_text_gin 
  on "Translation" using gin (text gin_trgm_ops);

-- Index for joining with Term table (performance optimization)
create index if not exists idx_translation_term_id 
  on "Translation" (term_id);
