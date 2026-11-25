create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  avatar_path text,
  role text not null default 'customer' check (role in ('admin', 'staff', 'customer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_path text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  slug text not null unique,
  sku text not null unique,
  brand text,
  description text,
  price_xof integer not null default 0 check (price_xof >= 0),
  compare_at_price_xof integer check (compare_at_price_xof is null or compare_at_price_xof >= 0),
  stock integer not null default 0 check (stock >= 0),
  reserved_stock integer not null default 0 check (reserved_stock >= 0 and reserved_stock <= stock),
  low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),
  attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object'),
  is_published boolean not null default false,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (compare_at_price_xof is null or compare_at_price_xof > price_xof),
  check (not is_published or price_xof > 0)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index product_images_one_primary_per_product
  on public.product_images (product_id)
  where is_primary;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  phone text not null,
  phone_normalized text not null unique,
  email text,
  city text,
  neighborhood text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references public.customers (id) on delete restrict,
  customer_name text not null,
  phone text not null,
  phone_normalized text not null,
  city text not null,
  neighborhood text,
  address text,
  customer_notes text,
  admin_notes text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled')),
  payment_method text not null default 'to_be_agreed'
    check (payment_method in ('to_be_agreed', 'cash_to_seller', 'cash_on_pickup')),
  delivery_method text not null default 'to_be_agreed'
    check (delivery_method in ('to_be_agreed', 'pickup')),
  subtotal_xof integer not null default 0 check (subtotal_xof >= 0),
  delivery_fee_xof integer not null default 0 check (delivery_fee_xof >= 0),
  total_xof integer not null default 0 check (total_xof = subtotal_xof + delivery_fee_xof),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  product_name text not null,
  sku text not null,
  unit_price_xof integer not null check (unit_price_xof >= 0),
  quantity integer not null check (quantity > 0),
  line_total_xof integer not null check (line_total_xof >= 0),
  created_at timestamptz not null default now(),
  check (line_total_xof = unit_price_xof * quantity)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  order_id uuid references public.orders (id) on delete set null,
  movement_type text not null check (movement_type in ('received', 'adjustment', 'reserved', 'released', 'sold')),
  on_hand_delta integer not null default 0,
  reserved_delta integer not null default 0,
  reason text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (on_hand_delta <> 0 or reserved_delta <> 0)
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  old_status text,
  new_status text not null,
  note text,
  changed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  product_id uuid references public.products (id) on delete cascade,
  category_id uuid references public.categories (id) on delete cascade,
  discount_percent numeric(5, 2) check (discount_percent is null or discount_percent between 0 and 100),
  discount_amount_xof integer check (discount_amount_xof is null or discount_amount_xof >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (num_nonnulls(discount_percent, discount_amount_xof) = 1)
);

create table public.store_settings (
  id boolean primary key default true check (id),
  store_name text not null,
  tagline text,
  phone text,
  whatsapp text,
  email text,
  address text,
  city text,
  delivery_zones text[] not null default '{}',
  delivery_policy text,
  opening_hours jsonb not null default '{}'::jsonb check (jsonb_typeof(opening_hours) = 'object'),
  theme jsonb not null default '{}'::jsonb check (jsonb_typeof(theme) = 'object'),
  footer jsonb not null default '{}'::jsonb check (jsonb_typeof(footer) = 'object'),
  updated_at timestamptz not null default now()
);

create table public.store_banners (
  id uuid primary key default gen_random_uuid(),
  placement text not null check (placement in ('hero', 'promotion', 'service')),
  title text,
  subtitle text,
  image_path text not null,
  button_text text,
  button_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index products_public_catalog_idx
  on public.products (category_id, is_published, created_at desc);
create index products_featured_idx
  on public.products (is_featured, created_at desc)
  where is_published and is_featured;
create index product_images_product_order_idx
  on public.product_images (product_id, sort_order);
create index orders_status_created_idx
  on public.orders (status, created_at desc);
create index orders_phone_created_idx
  on public.orders (phone_normalized, created_at desc);
create index order_items_order_idx
  on public.order_items (order_id);
create index inventory_movements_product_created_idx
  on public.inventory_movements (product_id, created_at desc);
create index promotions_active_dates_idx
  on public.promotions (is_active, starts_at, ends_at);
create index store_banners_active_dates_idx
  on public.store_banners (is_active, starts_at, ends_at, sort_order);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();
create trigger promotions_set_updated_at
  before update on public.promotions
  for each row execute function public.set_updated_at();
create trigger store_settings_set_updated_at
  before update on public.store_settings
  for each row execute function public.set_updated_at();
create trigger store_banners_set_updated_at
  before update on public.store_banners
  for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'staff')
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item record;
begin
  if new.status = old.status then
    return new;
  end if;

  if not (
    (old.status = 'pending' and new.status in ('confirmed', 'cancelled'))
    or (old.status = 'confirmed' and new.status in ('preparing', 'cancelled'))
    or (old.status = 'preparing' and new.status in ('shipped', 'cancelled'))
    or (old.status = 'shipped' and new.status = 'delivered')
  ) then
    raise exception 'Invalid order status transition: % -> %', old.status, new.status
      using errcode = '22023';
  end if;

  if new.status in ('cancelled', 'shipped') then
    for item in
      select product_id, quantity
      from public.order_items
      where order_id = new.id
      order by product_id
    loop
      if new.status = 'cancelled' then
        update public.products
        set reserved_stock = reserved_stock - item.quantity
        where id = item.product_id
          and reserved_stock >= item.quantity;

        if not found then
          raise exception 'Unable to release reserved stock for product %', item.product_id
            using errcode = '23514';
        end if;

        insert into public.inventory_movements (
          product_id, order_id, movement_type, reserved_delta, reason, created_by
        ) values (
          item.product_id, new.id, 'released', -item.quantity, 'Order cancelled', auth.uid()
        );
      else
        update public.products
        set stock = stock - item.quantity,
            reserved_stock = reserved_stock - item.quantity
        where id = item.product_id
          and stock >= item.quantity
          and reserved_stock >= item.quantity;

        if not found then
          raise exception 'Unable to fulfill reserved stock for product %', item.product_id
            using errcode = '23514';
        end if;

        insert into public.inventory_movements (
          product_id, order_id, movement_type, on_hand_delta, reserved_delta, reason, created_by
        ) values (
          item.product_id, new.id, 'sold', -item.quantity, -item.quantity, 'Order shipped', auth.uid()
        );
      end if;
    end loop;
  end if;

  insert into public.order_status_history (order_id, old_status, new_status, changed_by)
  values (new.id, old.status, new.status, auth.uid());

  return new;
end;
$$;

create trigger orders_handle_status_change
  after update of status on public.orders
  for each row execute function public.handle_order_status_change();

create or replace function public.create_customer_order(
  p_full_name text,
  p_phone text,
  p_city text,
  p_neighborhood text,
  p_address text,
  p_items jsonb,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item record;
  product_row public.products%rowtype;
  promotion_row public.promotions%rowtype;
  customer_id uuid;
  order_id uuid := gen_random_uuid();
  order_number text := 'IPA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 20));
  normalized_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  subtotal integer := 0;
  unit_price integer;
  line_total integer;
begin
  if length(trim(coalesce(p_full_name, ''))) < 2 then
    raise exception 'A valid customer name is required' using errcode = '22023';
  end if;
  if length(normalized_phone) < 7 or length(normalized_phone) > 15 then
    raise exception 'A valid phone number is required' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_city, ''))) < 2 then
    raise exception 'A city is required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Order products must be sent as an array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'Order must contain between 1 and 20 products' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as requested(product_id uuid, quantity integer)
    where requested.product_id is null
       or requested.quantity is null
       or requested.quantity not between 1 and 50
  ) then
    raise exception 'Each product needs a valid ID and a quantity between 1 and 50'
      using errcode = '22023';
  end if;
  if exists (
    select requested.product_id
    from jsonb_to_recordset(p_items) as requested(product_id uuid, quantity integer)
    group by requested.product_id
    having sum(requested.quantity) > 50
  ) then
    raise exception 'The total quantity of a product cannot exceed 50'
      using errcode = '22023';
  end if;

  insert into public.customers (full_name, phone, phone_normalized, city, neighborhood, address)
  values (
    trim(p_full_name), trim(p_phone), normalized_phone, trim(p_city),
    nullif(trim(coalesce(p_neighborhood, '')), ''),
    nullif(trim(coalesce(p_address, '')), '')
  )
  on conflict (phone_normalized) do update
  set full_name = excluded.full_name,
      phone = excluded.phone,
      city = excluded.city,
      neighborhood = excluded.neighborhood,
      address = excluded.address
  returning id into customer_id;

  insert into public.orders (
    id, order_number, customer_id, customer_name, phone, phone_normalized,
    city, neighborhood, address, customer_notes
  ) values (
    order_id, order_number, customer_id, trim(p_full_name), trim(p_phone), normalized_phone,
    trim(p_city), nullif(trim(coalesce(p_neighborhood, '')), ''),
    nullif(trim(coalesce(p_address, '')), ''),
    nullif(trim(coalesce(p_notes, '')), '')
  );

  for item in
    select requested.product_id, sum(requested.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as requested(product_id uuid, quantity integer)
    group by requested.product_id
    order by requested.product_id
  loop
    select *
    into product_row
    from public.products
    where id = item.product_id
    for update;

    if not found
       or not product_row.is_published
       or product_row.category_id is null
       or not exists (
         select 1
         from public.categories
         where id = product_row.category_id and is_active
       ) then
      raise exception 'One of the requested products is unavailable' using errcode = '22023';
    end if;
    if product_row.price_xof <= 0 then
      raise exception 'One of the requested products has no configured price' using errcode = '22023';
    end if;
    if product_row.stock - product_row.reserved_stock < item.quantity then
      raise exception 'Insufficient stock for product %', product_row.name using errcode = '23514';
    end if;

    unit_price := product_row.price_xof;
    select *
    into promotion_row
    from public.promotions
    where is_active
      and starts_at <= now()
      and ends_at > now()
      and (
        product_id = product_row.id
        or category_id = product_row.category_id
        or (product_id is null and category_id is null)
      )
    order by
      case
        when product_id = product_row.id then 0
        when category_id = product_row.category_id then 1
        else 2
      end,
      starts_at desc
    limit 1;

    if found then
      if promotion_row.discount_percent is not null then
        unit_price := floor(
          product_row.price_xof * (100 - promotion_row.discount_percent) / 100
        )::integer;
      else
        unit_price := greatest(product_row.price_xof - promotion_row.discount_amount_xof, 0);
      end if;
    end if;

    line_total := unit_price * item.quantity;
    subtotal := subtotal + line_total;

    update public.products
    set reserved_stock = reserved_stock + item.quantity
    where id = product_row.id;

    insert into public.order_items (
      order_id, product_id, product_name, sku, unit_price_xof, quantity, line_total_xof
    ) values (
      order_id, product_row.id, product_row.name, product_row.sku,
      unit_price, item.quantity, line_total
    );

    insert into public.inventory_movements (
      product_id, order_id, movement_type, reserved_delta, reason
    ) values (
      product_row.id, order_id, 'reserved', item.quantity, 'Customer order placed'
    );
  end loop;

  update public.orders
  set subtotal_xof = subtotal,
      total_xof = subtotal
  where id = order_id;

  insert into public.order_status_history (order_id, new_status, note)
  values (order_id, 'pending', 'Order submitted by customer');

  return jsonb_build_object(
    'id', order_id,
    'reference', order_number,
    'total_xof', subtotal
  );
end;
$$;

revoke all on function public.create_customer_order(text, text, text, text, text, jsonb, text) from public;
grant execute on function public.create_customer_order(text, text, text, text, text, jsonb, text) to anon, authenticated;

create or replace function public.track_customer_order(p_reference text, p_phone text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'reference', orders.order_number,
    'status', orders.status,
    'created_at', orders.created_at,
    'total_xof', orders.total_xof,
    'items', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'name', order_items.product_name,
          'quantity', order_items.quantity,
          'unit_price_xof', order_items.unit_price_xof
        ) order by order_items.created_at
      ) filter (where order_items.id is not null),
      '[]'::jsonb
    )
  )
  from public.orders
  left join public.order_items on order_items.order_id = orders.id
  where orders.order_number = upper(trim(coalesce(p_reference, '')))
    and orders.phone_normalized = regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')
  group by orders.id;
$$;

revoke all on function public.track_customer_order(text, text) from public;
grant execute on function public.track_customer_order(text, text) to anon, authenticated;

insert into public.store_settings (
  id, store_name, tagline, phone, whatsapp, email, city, delivery_zones, delivery_policy
) values (
  true,
  'Impact print by Aicha',
  'Imprimez vos idées, faites la différence — découvrez nos produits personnalisés et notre sélection du quotidien',
  '772203048',
  '221772203048',
  'bbkdjo@icloud.com',
  'Dakar',
  array['Sénégal'],
  'La livraison et le paiement sont à convenir directement entre le client et la vendeuse.'
)
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.order_status_history enable row level security;
alter table public.promotions enable row level security;
alter table public.store_settings enable row level security;
alter table public.store_banners enable row level security;

create policy "Profiles can be read by their owner"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "Admins can manage profiles"
  on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Active categories are public"
  on public.categories for select to anon, authenticated
  using (is_active);
create policy "Admins can manage categories"
  on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Published products are public"
  on public.products for select to anon, authenticated
  using (
    is_published
    and exists (
      select 1 from public.categories
      where categories.id = products.category_id and categories.is_active
    )
  );
create policy "Admins can manage products"
  on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Images of published products are public"
  on public.product_images for select to anon, authenticated
  using (
    exists (
      select 1
      from public.products
      left join public.categories on categories.id = products.category_id
      where products.id = product_images.product_id
        and products.is_published
        and coalesce(categories.is_active, false)
    )
  );
create policy "Admins can manage product images"
  on public.product_images for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Admins can manage customers"
  on public.customers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage orders"
  on public.orders for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage order items"
  on public.order_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage inventory movements"
  on public.inventory_movements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage order history"
  on public.order_status_history for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Current promotions are public"
  on public.promotions for select to anon, authenticated
  using (is_active and starts_at <= now() and ends_at > now());
create policy "Admins can manage promotions"
  on public.promotions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Store settings are public"
  on public.store_settings for select to anon, authenticated
  using (id);
create policy "Admins can manage store settings"
  on public.store_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Current banners are public"
  on public.store_banners for select to anon, authenticated
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );
create policy "Admins can manage store banners"
  on public.store_banners for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('store-media', 'store-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can read store images"
  on storage.objects for select to anon, authenticated
  using (bucket_id in ('product-images', 'store-media'));
create policy "Admins can upload store images"
  on storage.objects for insert to authenticated
  with check (bucket_id in ('product-images', 'store-media') and public.is_admin());
create policy "Admins can update store images"
  on storage.objects for update to authenticated
  using (bucket_id in ('product-images', 'store-media') and public.is_admin())
  with check (bucket_id in ('product-images', 'store-media') and public.is_admin());
create policy "Admins can delete store images"
  on storage.objects for delete to authenticated
  using (bucket_id in ('product-images', 'store-media') and public.is_admin());

grant select on
  public.categories,
  public.products,
  public.product_images,
  public.promotions,
  public.store_settings,
  public.store_banners
to anon, authenticated;

grant select, insert, update, delete on
  public.profiles,
  public.categories,
  public.products,
  public.product_images,
  public.customers,
  public.orders,
  public.order_items,
  public.inventory_movements,
  public.order_status_history,
  public.promotions,
  public.store_settings,
  public.store_banners
to authenticated;
