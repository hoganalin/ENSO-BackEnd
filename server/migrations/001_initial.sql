CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE admins (
  id uuid PRIMARY KEY, email text NOT NULL UNIQUE,
  password_hash text NOT NULL, active boolean NOT NULL DEFAULT true
);
CREATE TABLE sessions (
  token_hash text PRIMARY KEY, admin_id uuid NOT NULL REFERENCES admins(id),
  expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE products (
  id uuid PRIMARY KEY, title text NOT NULL, category text NOT NULL,
  price_cents bigint NOT NULL CHECK (price_cents BETWEEN 0 AND 100000000),
  origin_price_cents bigint NOT NULL CHECK (origin_price_cents BETWEEN 0 AND 100000000),
  inventory integer NOT NULL CHECK (inventory BETWEEN 0 AND 1000000),
  is_enabled boolean NOT NULL DEFAULT false,
  details jsonb NOT NULL DEFAULT '{}', version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE TABLE inventory_logs (
  id uuid PRIMARY KEY, product_id uuid NOT NULL REFERENCES products(id),
  actor_id uuid NOT NULL REFERENCES admins(id), delta integer NOT NULL,
  before_stock integer NOT NULL, after_stock integer NOT NULL,
  reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE coupons (
  id uuid PRIMARY KEY, title text NOT NULL, code text NOT NULL UNIQUE,
  percent integer NOT NULL CHECK (percent BETWEEN 1 AND 100),
  due_date bigint NOT NULL, is_enabled boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE orders (
  id uuid PRIMARY KEY, customer jsonb NOT NULL, items jsonb NOT NULL,
  discount_percent integer NOT NULL DEFAULT 100 CHECK (discount_percent BETWEEN 1 AND 100),
  total_cents bigint NOT NULL CHECK (total_cents >= 0),
  is_paid boolean NOT NULL DEFAULT false, message text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz
);
CREATE TABLE uploads (
  id uuid PRIMARY KEY, content bytea NOT NULL, mime text NOT NULL,
  actor_id uuid NOT NULL REFERENCES admins(id), created_at timestamptz NOT NULL DEFAULT now()
);
