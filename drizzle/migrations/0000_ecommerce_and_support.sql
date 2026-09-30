create table public.profiles (
  id uuid primary key,
  full_name text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null,
  category text not null,
  price numeric(10,2) not null,
  image_url text not null,
  sizes text[] not null default '{S,M,L,XL}',
  stock int not null default 50,
  created_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "products are public" on public.products for select to anon, authenticated using (true);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null default ('ORD-' || upper(substr(md5(random()::text), 1, 8))),
  user_id uuid not null,
  status text not null default 'confirmed',
  total numeric(10,2) not null,
  shipping_name text not null,
  shipping_address text not null,
  shipping_city text not null,
  shipping_zip text not null,
  phone text,
  tracking_number text default ('TRK' || floor(random()*1000000000)::text),
  estimated_delivery date default (current_date + 5),
  created_at timestamptz not null default now()
);
grant select, insert on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "own orders read" on public.orders for select to authenticated using (auth.uid() = user_id);
create policy "own orders insert" on public.orders for insert to authenticated with check (auth.uid() = user_id and status = 'confirmed');

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text not null,
  size text,
  quantity int not null,
  unit_price numeric(10,2) not null
);
grant select, insert on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "own items read" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "own items insert" on public.order_items for insert to authenticated with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

create table public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  refund_number text unique not null default ('RF-' || upper(substr(md5(random()::text), 1, 6))),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null,
  reason text not null,
  status text not null default 'requested',
  amount numeric(10,2) not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.refund_requests to authenticated;
grant all on public.refund_requests to service_role;
alter table public.refund_requests enable row level security;
create policy "own refunds read" on public.refund_requests for select to authenticated using (auth.uid() = user_id);
create policy "own refunds insert" on public.refund_requests for insert to authenticated with check (auth.uid() = user_id and status = 'requested' and exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

create table public.support_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.support_threads to authenticated;
grant all on public.support_threads to service_role;
alter table public.support_threads enable row level security;
create policy "own threads" on public.support_threads for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads(id) on delete cascade,
  user_id uuid not null,
  message_id text not null,
  role text not null,
  parts jsonb not null,
  created_at timestamptz not null default now(),
  unique (thread_id, message_id)
);
grant select, insert, update, delete on public.support_messages to authenticated;
grant all on public.support_messages to service_role;
alter table public.support_messages enable row level security;
create policy "own messages" on public.support_messages for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into public.products (slug, name, description, category, price, image_url) values
('linen-overshirt','Linen Overshirt','Relaxed-fit overshirt in breathable washed linen. Perfect layer for warm evenings.','Men',49.00,'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800'),
('wool-coat','Camel Wool Coat','Double-faced wool blend coat with a tailored silhouette and deep pockets.','Women',149.00,'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800'),
('denim-jacket','Classic Denim Jacket','Rigid indigo denim jacket that softens and fades beautifully with wear.','Men',59.00,'https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=800'),
('silk-slip-dress','Silk Slip Dress','Bias-cut slip dress in sand-washed silk with adjustable straps.','Women',99.00,'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800'),
('knit-sweater','Chunky Knit Sweater','Hand-feel cable knit in soft merino. A cold-weather essential.','Women',72.00,'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800'),
('white-sneakers','Leather Court Sneakers','Minimal white leather sneakers with a cushioned rubber sole.','Shoes',79.00,'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800'),
('cotton-tee','Heavyweight Cotton Tee','Boxy tee in 240gsm organic cotton. Holds its shape wash after wash.','Men',24.00,'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'),
('leather-tote','Leather Tote Bag','Vegetable-tanned leather tote with an interior zip pocket.','Accessories',109.00,'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800');
update public.products set sizes = '{38,39,40,41,42,43,44}' where slug = 'white-sneakers';
update public.products set sizes = '{One size}' where slug = 'leather-tote';