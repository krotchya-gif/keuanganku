INSERT INTO public.recurring_transactions (user_id, name, direction, category, amount, frequency, day_of_month, next_run_date, is_active)
SELECT user_id, name, direction, category, amount, 'monthly', 1, CURRENT_DATE, is_recurring
FROM public.cashflow_items
WHERE NOT EXISTS (
  SELECT 1 FROM public.recurring_transactions r
  WHERE r.user_id = cashflow_items.user_id
    AND r.name = cashflow_items.name
    AND r.amount = cashflow_items.amount
);
