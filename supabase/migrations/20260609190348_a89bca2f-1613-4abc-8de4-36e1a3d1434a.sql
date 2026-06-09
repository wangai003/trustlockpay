UPDATE public.transactions
SET status = 'delivered',
    released_date = NULL,
    updated_at = now()
WHERE id = '72a6f199-a81f-4453-9724-2eb60cd37b12'
  AND status = 'released';