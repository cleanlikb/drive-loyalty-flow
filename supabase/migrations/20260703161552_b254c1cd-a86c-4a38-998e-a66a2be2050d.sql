
UPDATE public.dealers
SET slug = lower(regexp_replace(
  lower(coalesce(dealership_name, 'dealer-' || id::text)),
  '[^a-z0-9]+', '-', 'g'
))
WHERE slug IS NULL OR slug = '';

UPDATE public.dealers
SET slug = lower(regexp_replace(trim(both '-' from slug), '-+', '-', 'g'))
WHERE slug IS NOT NULL AND slug <> '';

-- Deduplicate any new collisions.
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
