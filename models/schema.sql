-- suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact_info JSONB
);

-- warehouses
CREATE TABLE IF NOT EXISTS warehouses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  capacity INTEGER NOT NULL CHECK (capacity >= 0)
);

-- products
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  reorder_threshold INTEGER NOT NULL CHECK (reorder_threshold >= 0),
  default_supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL
);

-- warehouse_products
CREATE TABLE IF NOT EXISTS warehouse_products (
  id SERIAL PRIMARY KEY,
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  UNIQUE (warehouse_id, product_id)
);

-- purchase_orders
DO $$ BEGIN
  CREATE TYPE IF NOT EXISTS po_status AS ENUM ('pending','completed','capacity_issue','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered >= 0),
  order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expected_arrival_date TIMESTAMP WITH TIME ZONE,
  status po_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_po_updated_at ON purchase_orders;
CREATE TRIGGER trg_po_updated_at
BEFORE UPDATE ON purchase_orders
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
