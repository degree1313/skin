-- Enforce case-insensitive unique product names per user

create unique index if not exists products_user_id_name_lower_unique
  on public.products (user_id, lower(name));

