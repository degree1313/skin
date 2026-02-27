-- Explicit delete policy for product_usage_logs so users can delete only their own logs.
-- Select/insert are already covered by the existing "Users can CRUD own product usage logs" (for all) in 001_barrier_autopilot.sql.

create policy "Users can delete own logs"
  on public.product_usage_logs
  for delete
  using (auth.uid() = user_id);
