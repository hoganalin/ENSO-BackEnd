CREATE TABLE guest_sessions (
  id uuid PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  cart_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX guest_sessions_expiry ON guest_sessions(expires_at);
CREATE TABLE cart_items (
  id uuid PRIMARY KEY,
  guest_id uuid NOT NULL REFERENCES guest_sessions(id),
  product_id uuid NOT NULL REFERENCES products(id),
  qty integer NOT NULL CHECK (qty BETWEEN 1 AND 1000),
  UNIQUE (guest_id, product_id)
);
ALTER TABLE orders ADD COLUMN guest_id uuid REFERENCES guest_sessions(id);
ALTER TABLE inventory_logs ALTER COLUMN actor_id DROP NOT NULL;
ALTER TABLE inventory_logs ADD COLUMN guest_id uuid REFERENCES guest_sessions(id);
ALTER TABLE inventory_logs ADD CONSTRAINT stock_actor_required CHECK (num_nonnulls(actor_id, guest_id) = 1);
CREATE TABLE checkout_requests (
  guest_id uuid NOT NULL REFERENCES guest_sessions(id),
  request_key uuid NOT NULL,
  request_hash text NOT NULL,
  order_id uuid NOT NULL REFERENCES orders(id),
  total_cents bigint NOT NULL CHECK (total_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (guest_id, request_key)
);
