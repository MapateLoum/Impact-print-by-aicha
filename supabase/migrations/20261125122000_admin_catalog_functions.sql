create or replace function public.admin_create_product(
  p_product_id uuid,
  p_category_id uuid,
  p_name text,
  p_slug text,
  p_sku text,
  p_brand text,
  p_description text,
  p_price_xof integer,
  p_compare_at_price_xof integer,
  p_stock integer,
  p_is_published boolean
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_name is null or length(trim(p_name)) = 0
    or p_slug is null or length(trim(p_slug)) = 0
    or p_sku is null or length(trim(p_sku)) = 0 then
    raise exception 'Name, slug and SKU are required' using errcode = '22023';
  end if;

  if p_price_xof is null or p_price_xof < 0
    or p_stock is null or p_stock < 0
    or (p_compare_at_price_xof is not null and p_compare_at_price_xof <= p_price_xof) then
    raise exception 'Invalid price or stock values' using errcode = '22023';
  end if;

  if p_is_published and p_price_xof = 0 then
    raise exception 'A published product must have a price' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.categories
    where id = p_category_id and is_active
  ) then
    raise exception 'Select an active category' using errcode = '22023';
  end if;

  insert into public.products (
    id, category_id, name, slug, sku, brand, description,
    price_xof, compare_at_price_xof, stock, is_published
  ) values (
    p_product_id, p_category_id, p_name, p_slug, p_sku, p_brand, p_description,
    p_price_xof, p_compare_at_price_xof, p_stock, p_is_published
  );

  if p_stock > 0 then
    insert into public.inventory_movements (
      product_id, movement_type, on_hand_delta, reason, created_by
    ) values (
      p_product_id, 'received', p_stock, 'Stock initial', auth.uid()
    );
  end if;

  return p_product_id;
end;
$$;

revoke all on function public.admin_create_product(
  uuid, uuid, text, text, text, text, text, integer, integer, integer, boolean
) from public;
grant execute on function public.admin_create_product(
  uuid, uuid, text, text, text, text, text, integer, integer, integer, boolean
) to authenticated;

create or replace function public.admin_adjust_product_stock(
  p_product_id uuid,
  p_delta integer,
  p_reason text
)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  updated_stock integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_delta is null or p_delta = 0 or p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A non-zero adjustment and a reason are required' using errcode = '22023';
  end if;

  update public.products
  set stock = stock + p_delta
  where id = p_product_id
    and stock + p_delta >= reserved_stock
  returning stock into updated_stock;

  if not found then
    raise exception 'Product not found or adjustment would consume reserved stock'
      using errcode = '23514';
  end if;

  insert into public.inventory_movements (
    product_id, movement_type, on_hand_delta, reason, created_by
  ) values (
    p_product_id,
    case when p_delta > 0 then 'received' else 'adjustment' end,
    p_delta,
    trim(p_reason),
    auth.uid()
  );

  return updated_stock;
end;
$$;

revoke all on function public.admin_adjust_product_stock(uuid, integer, text) from public;
grant execute on function public.admin_adjust_product_stock(uuid, integer, text) to authenticated;
