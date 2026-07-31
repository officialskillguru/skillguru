
-- UUID generation for all primary keys
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Required by Supabase Auth for UUID v4 generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Full-text search with unaccented matching (course search, blog search)
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Trigram similarity for fuzzy search (typo-tolerant course/mentor search)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
