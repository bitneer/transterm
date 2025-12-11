-- Create schema
CREATE SCHEMA IF NOT EXISTS "extensions";

-- Move extension (it was installed in public by previous migrations)
ALTER EXTENSION "pg_trgm" SET SCHEMA "extensions";

-- Grant usage
GRANT USAGE ON SCHEMA "extensions" TO postgres, anon, authenticated, service_role;

-- Update search_path for roles
ALTER ROLE "postgres" SET search_path = "$user", public, extensions;
ALTER ROLE "anon" SET search_path = "$user", public, extensions;
ALTER ROLE "authenticated" SET search_path = "$user", public, extensions;
ALTER ROLE "service_role" SET search_path = "$user", public, extensions;
