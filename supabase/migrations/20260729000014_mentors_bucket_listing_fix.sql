-- Security advisor finding: the public `mentors` storage bucket had a broad
-- SELECT policy on storage.objects ("Public read mentor media") that allows
-- clients to LIST every file in the bucket via the storage API, not just
-- fetch a specific known object. Public buckets don't need a SELECT policy
-- for object reads - Supabase serves public bucket objects via the
-- /object/public/ endpoint which bypasses RLS entirely (confirmed the app
-- only ever calls getPublicUrl(), never storage.from('mentors').list()).
-- Dropping this policy removes the unnecessary enumeration surface with zero
-- change to how mentor avatars/media are actually served.

DROP POLICY "Public read mentor media" ON storage.objects;
