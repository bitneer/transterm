-- Enable pg_trgm extension for partial match search support
create extension if not exists pg_trgm;

-- Create GIN index on aliases array for exact match/containment search
create index if not exists term_aliases_gin_idx on public."Term" using gin (aliases);

-- Create GIN index on name column for partial match search (ilike)
create index if not exists term_name_gin_trgm_idx on public."Term" using gin (name gin_trgm_ops);
