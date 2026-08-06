-- ============================================================================
-- Seed production category taxonomy (Category -> Subcategory, two levels).
-- ============================================================================
-- WHY: the live categories table has exactly 9 top-level rows today (IT &
--      Software Development, AI & Data Science, Cloud Computing & DevOps,
--      Cybersecurity, Business & Management, Digital Marketing, Finance &
--      Accounting, UI/UX & Design, Career & Soft Skills - all top-level,
--      zero subcategories, zero courses referencing any of them). This
--      migration is purely additive: it never renames, re-parents, or
--      deletes any existing row.
--
-- RECONCILIATION: several of the requested top-level domains conceptually
-- overlap with categories that already exist and are already live on the
-- public site nav. Rather than create confusing duplicate top-level
-- siblings (e.g. a new "IT & Software" next to the existing "IT & Software
-- Development"), this migration attaches that domain's subcategory list
-- under the EXISTING matching row (looked up by slug at seed time, never a
-- hardcoded id):
--   Business & Management   -> existing "business-management" (exact slug match)
--   IT & Software            -> existing "it-software-development"
--   Data & AI                -> existing "ai-data-science"
--   Commerce & Finance       -> existing "finance-accounting"
--   Personal Development     -> existing "career-soft-skills"
-- The remaining 13 requested domains have no existing counterpart and are
-- inserted as new top-level categories with their subcategories.
--
-- KNOWN LIMITATION (documented, not silently resolved): "Design & Creative"
-- is inserted as a new top-level domain even though the existing "UI/UX &
-- Design" top-level category covers part of the same conceptual space. This
-- is a product-taxonomy judgment call outside this migration's safe/additive
-- scope - the admin can use the new merge-category tool (Phase A UI) to
-- consolidate them later if desired. Not touched here to avoid unilaterally
-- restructuring a category the live public nav already renders.
--
-- Idempotent: every insert is ON CONFLICT (slug) DO NOTHING, safe to re-run.
-- ============================================================================

-- SECTION 1: attach subcategories under existing top-level categories
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    _biz_mgmt uuid;
    _it_software uuid;
    _ai_data uuid;
    _finance uuid;
    _career_skills uuid;
BEGIN
    SELECT id INTO _biz_mgmt FROM public.categories WHERE slug = 'business-management' AND parent_id IS NULL;
    SELECT id INTO _it_software FROM public.categories WHERE slug = 'it-software-development' AND parent_id IS NULL;
    SELECT id INTO _ai_data FROM public.categories WHERE slug = 'ai-data-science' AND parent_id IS NULL;
    SELECT id INTO _finance FROM public.categories WHERE slug = 'finance-accounting' AND parent_id IS NULL;
    SELECT id INTO _career_skills FROM public.categories WHERE slug = 'career-soft-skills' AND parent_id IS NULL;

    IF _biz_mgmt IS NOT NULL THEN
        INSERT INTO public.categories (name, slug, parent_id, sort_order, status) VALUES
            ('Marketing', 'marketing', _biz_mgmt, 10, 'active'),
            ('Human Resources', 'human-resources', _biz_mgmt, 20, 'active'),
            ('Entrepreneurship', 'entrepreneurship', _biz_mgmt, 30, 'active'),
            ('Sales', 'sales', _biz_mgmt, 40, 'active'),
            ('Operations', 'operations', _biz_mgmt, 50, 'active'),
            ('Project Management', 'project-management', _biz_mgmt, 60, 'active')
        ON CONFLICT (slug) DO NOTHING;
    END IF;

    IF _it_software IS NOT NULL THEN
        -- Web/Mobile/Software Eng/Networking/Database only - Cloud Computing,
        -- Cybersecurity, and DevOps are deliberately skipped here since they
        -- already exist as their own live top-level categories.
        INSERT INTO public.categories (name, slug, parent_id, sort_order, status) VALUES
            ('Web Development', 'web-development', _it_software, 10, 'active'),
            ('Mobile Development', 'mobile-development', _it_software, 20, 'active'),
            ('Software Engineering', 'software-engineering', _it_software, 30, 'active'),
            ('Networking', 'networking', _it_software, 40, 'active'),
            ('Database Administration', 'database-administration', _it_software, 50, 'active')
        ON CONFLICT (slug) DO NOTHING;
    END IF;

    IF _ai_data IS NOT NULL THEN
        INSERT INTO public.categories (name, slug, parent_id, sort_order, status) VALUES
            ('Data Science', 'data-science', _ai_data, 10, 'active'),
            ('Artificial Intelligence', 'artificial-intelligence', _ai_data, 20, 'active'),
            ('Machine Learning', 'machine-learning', _ai_data, 30, 'active'),
            ('Generative AI', 'generative-ai', _ai_data, 40, 'active'),
            ('Data Analytics', 'data-analytics', _ai_data, 50, 'active'),
            ('Business Intelligence', 'business-intelligence', _ai_data, 60, 'active'),
            ('Big Data', 'big-data', _ai_data, 70, 'active')
        ON CONFLICT (slug) DO NOTHING;
    END IF;

    IF _finance IS NOT NULL THEN
        INSERT INTO public.categories (name, slug, parent_id, sort_order, status) VALUES
            ('Banking', 'banking', _finance, 10, 'active'),
            ('Taxation', 'taxation', _finance, 20, 'active'),
            ('Investment', 'investment', _finance, 30, 'active'),
            ('Financial Markets', 'financial-markets', _finance, 40, 'active'),
            ('Insurance', 'insurance', _finance, 50, 'active')
        ON CONFLICT (slug) DO NOTHING;
    END IF;

    IF _career_skills IS NOT NULL THEN
        INSERT INTO public.categories (name, slug, parent_id, sort_order, status) VALUES
            ('Communication', 'communication', _career_skills, 10, 'active'),
            ('Leadership', 'leadership', _career_skills, 20, 'active'),
            ('Productivity', 'productivity', _career_skills, 30, 'active'),
            ('Career Development', 'career-development', _career_skills, 40, 'active'),
            ('Interview Preparation', 'interview-preparation', _career_skills, 50, 'active')
        ON CONFLICT (slug) DO NOTHING;
    END IF;
END $$;

-- SECTION 2: new top-level domains with no existing counterpart
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    _parent uuid;
BEGIN
    INSERT INTO public.categories (name, slug, sort_order, status) VALUES ('Engineering', 'engineering', 100, 'active') ON CONFLICT (slug) DO NOTHING;
    SELECT id INTO _parent FROM public.categories WHERE slug = 'engineering';
    IF _parent IS NOT NULL THEN
        INSERT INTO public.categories (name, slug, parent_id, sort_order, status) VALUES
            ('Computer Science', 'computer-science', _parent, 10, 'active'),
            ('Mechanical Engineering', 'mechanical-engineering', _parent, 20, 'active'),
            ('Civil Engineering', 'civil-engineering', _parent, 30, 'active'),
            ('Electrical Engineering', 'electrical-engineering', _parent, 40, 'active'),
            ('Electronics & Communication', 'electronics-communication', _parent, 50, 'active'),
            ('Automobile Engineering', 'automobile-engineering', _parent, 60, 'active'),
            ('Chemical Engineering', 'chemical-engineering', _parent, 70, 'active')
        ON CONFLICT (slug) DO NOTHING;
    END IF;

    INSERT INTO public.categories (name, slug, sort_order, status) VALUES ('Medical & Healthcare', 'medical-healthcare', 110, 'active') ON CONFLICT (slug) DO NOTHING;
    SELECT id INTO _parent FROM public.categories WHERE slug = 'medical-healthcare';
    IF _parent IS NOT NULL THEN
        INSERT INTO public.categories (name, slug, parent_id, sort_order, status) VALUES
            ('Medicine', 'medicine', _parent, 10, 'active'),
            ('Nursing', 'nursing', _parent, 20, 'active'),
            ('Pharmacy', 'pharmacy', _parent, 30, 'active'),
            ('Physiotherapy', 'physiotherapy', _parent, 40, 'active'),
            ('Medical Laboratory Technology', 'medical-laboratory-technology', _parent, 50, 'active'),
            ('Radiology', 'radiology', _parent, 60, 'active'),
            ('Healthcare Management', 'healthcare-management', _parent, 70, 'active')
        ON CONFLICT (slug) DO NOTHING;
    END IF;

    INSERT INTO public.categories (name, slug, sort_order, status) VALUES ('Design & Creative', 'design-creative', 120, 'active') ON CONFLICT (slug) DO NOTHING;
    SELECT id INTO _parent FROM public.categories WHERE slug = 'design-creative';
    IF _parent IS NOT NULL THEN
        INSERT INTO public.categories (name, slug, parent_id, sort_order, status) VALUES
            ('Graphic Design', 'graphic-design', _parent, 10, 'active'),
            ('Animation', 'animation', _parent, 20, 'active'),
            ('Video Editing', 'video-editing', _parent, 30, 'active'),
            ('Photography', 'photography', _parent, 40, 'active'),
            ('Interior Design', 'interior-design', _parent, 50, 'active'),
            ('Fashion Design', 'fashion-design', _parent, 60, 'active')
        ON CONFLICT (slug) DO NOTHING;
    END IF;

    INSERT INTO public.categories (name, slug, sort_order, status) VALUES ('Science', 'science', 130, 'active') ON CONFLICT (slug) DO NOTHING;
    SELECT id INTO _parent FROM public.categories WHERE slug = 'science';
    IF _parent IS NOT NULL THEN
        INSERT INTO public.categories (name, slug, parent_id, sort_order, status) VALUES
            ('Physics', 'physics', _parent, 10, 'active'),
            ('Chemistry', 'chemistry', _parent, 20, 'active'),
            ('Biology', 'biology', _parent, 30, 'active'),
            ('Mathematics', 'mathematics', _parent, 40, 'active'),
            ('Environmental Science', 'environmental-science', _parent, 50, 'active')
        ON CONFLICT (slug) DO NOTHING;
    END IF;

    INSERT INTO public.categories (name, slug, sort_order, status) VALUES ('Arts & Humanities', 'arts-humanities', 140, 'active') ON CONFLICT (slug) DO NOTHING;
    SELECT id INTO _parent FROM public.categories WHERE slug = 'arts-humanities';
    IF _parent IS NOT NULL THEN
        INSERT INTO public.categories (name, slug, parent_id, sort_order, status) VALUES
            ('Languages', 'languages', _parent, 10, 'active'),
            ('Literature', 'literature', _parent, 20, 'active'),
            ('History', 'history', _parent, 30, 'active'),
            ('Psychology', 'psychology', _parent, 40, 'active'),
            ('Sociology', 'sociology', _parent, 50, 'active'),
            ('Philosophy', 'philosophy', _parent, 60, 'active')
        ON CONFLICT (slug) DO NOTHING;
    END IF;

    INSERT INTO public.categories (name, slug, sort_order, status) VALUES ('Law', 'law', 150, 'active') ON CONFLICT (slug) DO NOTHING;
    SELECT id INTO _parent FROM public.categories WHERE slug = 'law';
    IF _parent IS NOT NULL THEN
        INSERT INTO public.categories (name, slug, parent_id, sort_order, status) VALUES
            ('Corporate Law', 'corporate-law', _parent, 10, 'active'),
            ('Criminal Law', 'criminal-law', _parent, 20, 'active'),
            ('Civil Law', 'civil-law', _parent, 30, 'active'),
            ('Cyber Law', 'cyber-law', _parent, 40, 'active'),
            ('Intellectual Property', 'intellectual-property', _parent, 50, 'active')
        ON CONFLICT (slug) DO NOTHING;
    END IF;

    INSERT INTO public.categories (name, slug, sort_order, status) VALUES ('Education', 'education', 160, 'active') ON CONFLICT (slug) DO NOTHING;
    SELECT id INTO _parent FROM public.categories WHERE slug = 'education';
    IF _parent IS NOT NULL THEN
        INSERT INTO public.categories (name, slug, parent_id, sort_order, status) VALUES
            ('Teaching', 'teaching', _parent, 10, 'active'),
            ('Educational Technology', 'educational-technology', _parent, 20, 'active'),
            ('Early Childhood Education', 'early-childhood-education', _parent, 30, 'active'),
            ('Special Education', 'special-education', _parent, 40, 'active')
        ON CONFLICT (slug) DO NOTHING;
    END IF;

    INSERT INTO public.categories (name, slug, sort_order, status) VALUES ('Architecture & Construction', 'architecture-construction', 170, 'active') ON CONFLICT (slug) DO NOTHING;
    SELECT id INTO _parent FROM public.categories WHERE slug = 'architecture-construction';
    IF _parent IS NOT NULL THEN
        INSERT INTO public.categories (name, slug, parent_id, sort_order, status) VALUES
            ('Architecture', 'architecture', _parent, 10, 'active'),
            ('Construction Management', 'construction-management', _parent, 20, 'active'),
            ('CAD', 'cad', _parent, 30, 'active'),
            ('BIM', 'bim', _parent, 40, 'active')
        ON CONFLICT (slug) DO NOTHING;
    END IF;

    INSERT INTO public.categories (name, slug, sort_order, status) VALUES ('Hospitality & Tourism', 'hospitality-tourism', 180, 'active') ON CONFLICT (slug) DO NOTHING;
    SELECT id INTO _parent FROM public.categories WHERE slug = 'hospitality-tourism';
    IF _parent IS NOT NULL THEN
        INSERT INTO public.categories (name, slug, parent_id, sort_order, status) VALUES
            ('Hotel Management', 'hotel-management', _parent, 10, 'active'),
            ('Tourism', 'tourism', _parent, 20, 'active'),
            ('Travel Management', 'travel-management', _parent, 30, 'active'),
            ('Culinary Arts', 'culinary-arts', _parent, 40, 'active')
        ON CONFLICT (slug) DO NOTHING;
    END IF;

    INSERT INTO public.categories (name, slug, sort_order, status) VALUES ('Media & Communication', 'media-communication', 190, 'active') ON CONFLICT (slug) DO NOTHING;
    SELECT id INTO _parent FROM public.categories WHERE slug = 'media-communication';
    IF _parent IS NOT NULL THEN
        INSERT INTO public.categories (name, slug, parent_id, sort_order, status) VALUES
            ('Journalism', 'journalism', _parent, 10, 'active'),
            ('Mass Communication', 'mass-communication', _parent, 20, 'active'),
            ('Content Creation', 'content-creation', _parent, 30, 'active'),
            ('Public Relations', 'public-relations', _parent, 40, 'active'),
            ('Advertising', 'advertising', _parent, 50, 'active')
        ON CONFLICT (slug) DO NOTHING;
    END IF;

    INSERT INTO public.categories (name, slug, sort_order, status) VALUES ('Agriculture', 'agriculture', 200, 'active') ON CONFLICT (slug) DO NOTHING;
    SELECT id INTO _parent FROM public.categories WHERE slug = 'agriculture';
    IF _parent IS NOT NULL THEN
        INSERT INTO public.categories (name, slug, parent_id, sort_order, status) VALUES
            ('Horticulture', 'horticulture', _parent, 10, 'active'),
            ('Agribusiness', 'agribusiness', _parent, 20, 'active'),
            ('Food Technology', 'food-technology', _parent, 30, 'active')
        ON CONFLICT (slug) DO NOTHING;
    END IF;

    INSERT INTO public.categories (name, slug, sort_order, status) VALUES ('Government & Competitive Exams', 'government-competitive-exams', 210, 'active') ON CONFLICT (slug) DO NOTHING;
    SELECT id INTO _parent FROM public.categories WHERE slug = 'government-competitive-exams';
    IF _parent IS NOT NULL THEN
        INSERT INTO public.categories (name, slug, parent_id, sort_order, status) VALUES
            ('UPSC', 'upsc', _parent, 10, 'active'),
            ('MPSC / State PSC', 'mpsc-state-psc', _parent, 20, 'active'),
            ('SSC', 'ssc', _parent, 30, 'active'),
            ('Banking Exams', 'banking-exams', _parent, 40, 'active'),
            ('Railway Exams', 'railway-exams', _parent, 50, 'active'),
            ('Defence Exams', 'defence-exams', _parent, 60, 'active')
        ON CONFLICT (slug) DO NOTHING;
    END IF;

    INSERT INTO public.categories (name, slug, sort_order, status) VALUES ('Vocational & Skilled Trades', 'vocational-skilled-trades', 220, 'active') ON CONFLICT (slug) DO NOTHING;
    SELECT id INTO _parent FROM public.categories WHERE slug = 'vocational-skilled-trades';
    IF _parent IS NOT NULL THEN
        INSERT INTO public.categories (name, slug, parent_id, sort_order, status) VALUES
            ('Electrician', 'electrician', _parent, 10, 'active'),
            ('Plumbing', 'plumbing', _parent, 20, 'active'),
            ('Welding', 'welding', _parent, 30, 'active'),
            ('Automotive', 'automotive', _parent, 40, 'active'),
            ('CNC', 'cnc', _parent, 50, 'active'),
            ('HVAC', 'hvac', _parent, 60, 'active')
        ON CONFLICT (slug) DO NOTHING;
    END IF;
END $$;
