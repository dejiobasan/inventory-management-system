import { pool, query } from "../database/database";
import dotenv from 'dotenv';
dotenv.config();

const LEAD_TIME_DAYS = parseInt(process.env.LEAD_TIME_DAYS ?? '3', 10);

async function getWarehouseOccupancy(client, warehouse_id) {
  const res = await client.query(
    `SELECT COALESCE(SUM(quantity),0) as total FROM warehouse_products WHERE warehouse_id = $1`,
    [warehouse_id]
  );
  return parseInt(res.rows[0].total, 10);
}

/**
 * monitorAndReorder(product_id, warehouse_id)
 *
 * - If product quantity at warehouse < reorder_threshold, create PO
 * - Default reorder policy: restock up to reorder_threshold * 2
 * - Respect warehouse capacity, if no space -> create capacity_issue PO with qty 0
 */

export async function monitorAndReorder(product_id, warehouse_id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const prodRes = await client.query(
      `SELECT reorder_threshold, default_supplier_id FROM products WHERE id = $1 FOR UPDATE`,
      [product_id]
    );
    if (prodRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const { reorder_threshold, default_supplier_id } = prodRes.rows[0];

    const wpRes = await client.query(
      `SELECT quantity FROM warehouse_products WHERE product_id = $1 AND warehouse_id = $2 FOR UPDATE`,
      [product_id, warehouse_id]
    );
    const currentQty = wpRes.rowCount > 0 ? parseInt(wpRes.rows[0].quantity, 10) : 0;

    if (currentQty >= reorder_threshold) {
      await client.query('COMMIT');
      return null; // no reorder
    }
    
    const desiredLevel = reorder_threshold * 2;
    const desiredQty = Math.max(0, desiredLevel - currentQty);

    const capRes = await client.query(
      `SELECT capacity FROM warehouses WHERE id = $1 FOR UPDATE`,
      [warehouse_id]
    );
    if (capRes.rowCount === 0) {
      await client.query('ROLLBACK');
      throw new Error('Warehouse not found');
    }
    const capacity = parseInt(capRes.rows[0].capacity, 10);

    const occupancyRes = await client.query(
      `SELECT COALESCE(SUM(quantity),0) as total FROM warehouse_products WHERE warehouse_id = $1 FOR UPDATE`,
      [warehouse_id]
    );
    const currentOccupancy = parseInt(occupancyRes.rows[0].total, 10);

    const availableSpace = capacity - currentOccupancy;
    let finalOrderQty = Math.min(desiredQty, Math.max(0, availableSpace));

    if (!default_supplier_id) {
      await client.query('ROLLBACK');
      throw new Error(`Default supplier not set for product id=${product_id}`);
    }

    if (finalOrderQty <= 0) {
      const poRes = await client.query(
        `INSERT INTO purchase_orders
         (product_id, supplier_id, warehouse_id, quantity_ordered, order_date, expected_arrival_date, status)
         VALUES ($1,$2,$3,$4, now(), (now() + ($5 || ' days')::interval), $6)
         RETURNING *`,
        [product_id, default_supplier_id, warehouse_id, 0, LEAD_TIME_DAYS, 'capacity_issue']
      );
      await client.query('COMMIT');
      return poRes.rows[0];
    }

    const poRes = await client.query(
      `INSERT INTO purchase_orders
       (product_id, supplier_id, warehouse_id, quantity_ordered, order_date, expected_arrival_date, status)
       VALUES ($1,$2,$3,$4, now(), (now() + ($5 || ' days')::interval), $6)
       RETURNING *`,
      [product_id, default_supplier_id, warehouse_id, finalOrderQty, LEAD_TIME_DAYS, 'pending']
    );

    await client.query('COMMIT');
    return poRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}