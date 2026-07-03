
ALTER TABLE public.dealers ADD COLUMN IF NOT EXISTS slug TEXT;

DROP INDEX IF EXISTS dealers_slug_key;

-- Backfill slugs from dealership names for existing dealers.
UPDATE public.dealers
SET slug = lower(regexp_replace(
  coalesce(dealership_name, 'dealer-' || id::text),
  '[^a-z0-9]+', '-', 'g'
))
WHERE slug IS NULL;

-- Trim leading/trailing dashes and collapse multiple dashes.
UPDATE public.dealers
SET slug = lower(regexp_replace(trim(both '-' from slug), '-+', '-', 'g'))
WHERE slug IS NOT NULL;

-- Deduplicate slugs by appending a per-group counter.
WITH ranked AS (
  SELECT id, slug,
    row_number() OVER (PARTITION BY slug ORDER BY created_at, id) AS n
  FROM public.dealers
  WHERE slug IN (
    SELECT slug FROM public.dealers GROUP BY slug HAVING count(*) > 1
  )
)
UPDATE public.dealers d
SET slug = r.slug || '-' || r.n
FROM ranked r
WHERE d.id = r.id;

CREATE UNIQUE INDEX dealers_slug_key
  ON public.dealers (slug) WHERE slug IS NOT NULL;
