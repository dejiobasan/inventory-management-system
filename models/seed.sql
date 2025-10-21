-- These are test mock data for the inventory management system

INSERT INTO suppliers (name, contact_info) VALUES
('ACME Supplies', '{"email":"acme@example.com","phone":"+123456789"}'),
('Global Widgets', '{"email":"widgets@example.com","phone":"+198765432"}');

INSERT INTO warehouses (name, location, capacity) VALUES
('North Warehouse', 'Lagos', 1000),
('South Warehouse', 'Abuja', 500);

INSERT INTO products (sku, name, description, reorder_threshold, default_supplier_id) VALUES
('SKU-1001', 'Widget A', 'Standard Widget', 50, 1),
('SKU-1002', 'Widget B', 'Advanced Widget', 30, 2);

INSERT INTO warehouse_products (warehouse_id, product_id, quantity) VALUES
(1, 1, 120),
(1, 2, 20),
(2, 1, 10),
(2, 2, 40);


-- These are test mock data for the inventory management system
