/*

Another view on duplicates, using grouping instead of a window function:

SELECT unique_id, service_point_id, date_trunc('day', created_at), COUNT(*)
FROM public.responses
WHERE unique_id IS NOT NULL
GROUP BY unique_id, service_point_id, date_trunc('day', created_at)
HAVING COUNT(*) > 1
ORDER BY date_trunc ASC

Or you can use the sub-queries below.

*/

BEGIN ISOLATION LEVEL REPEATABLE READ;

DELETE FROM public.responses_adjectives
WHERE response_id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (PARTITION BY unique_id ORDER BY created_at, id) AS rn
    FROM public.responses
    WHERE unique_id IS NOT NULL
  ) AS sq
  WHERE rn > 1
  ORDER BY rn
);

DELETE FROM public.gcloud_nl_api_responses
WHERE response_id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (PARTITION BY unique_id ORDER BY created_at, id) AS rn
    FROM public.responses
    WHERE unique_id IS NOT NULL
  ) AS sq
  WHERE rn > 1
  ORDER BY rn
);

DELETE FROM public.responses
WHERE id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (PARTITION BY unique_id ORDER BY created_at, id) AS rn
    FROM public.responses
    WHERE unique_id IS NOT NULL
  ) AS sq
  WHERE rn > 1
  ORDER BY rn
);

DELETE FROM public.service_point_availabilities
WHERE id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (PARTITION BY unique_id ORDER BY created_at, id) AS rn
    FROM public.service_point_availabilities
    WHERE unique_id IS NOT NULL
  ) AS sq
  WHERE rn > 1
  ORDER BY rn
);

COMMIT;
