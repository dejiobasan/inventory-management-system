import { query, pool } from "../database/database.js";
import dotenv from "dotenv";
dotenv.config();
const LEAD_TIME_DAYS = parseInt(process.env.LEAD_TIME_DAYS ?? "3", 10);

export const getAllPurchaseOrders = async (req, res) => {
  try {
    const q = await query(
      `SELECT * FROM purchase_orders ORDER BY created_at DESC`
    );
    res.json(q.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal" });
  }
};

export const createPurchaseOrder = async (req, res) => {
  try {
    const { product_id, warehouse_id, quantity } = req.body;
    if (!product_id || !warehouse_id || !quantity)
      return res.status(400).json({ error: "missing fields" });

    const prodRes = await query(
      `SELECT default_supplier_id FROM products WHERE id = $1`,
      [product_id]
    );
    if (prodRes.rowCount === 0)
      return res.status(404).json({ error: "product not found" });
    const supplier_id = prodRes.rows[0].default_supplier_id;
    if (!supplier_id)
      return res.status(400).json({ error: "default supplier not set" });

    const occupancyRes = await query(
      `SELECT COALESCE(SUM(quantity),0) as total FROM warehouse_products WHERE warehouse_id = $1`,
      [warehouse_id]
    );
    const capacityRes = await query(
      `SELECT capacity FROM warehouses WHERE id = $1`,
      [warehouse_id]
    );
    if (capacityRes.rowCount === 0)
      return res.status(404).json({ error: "warehouse not found" });

    const currentOccupancy = Number(occupancyRes.rows[0].total);
    const capacity = Number(capacityRes.rows[0].capacity);
    const availableSpace = capacity - currentOccupancy;
    const finalQty = Math.min(quantity, Math.max(0, availableSpace));
    const status = finalQty > 0 ? "pending" : "capacity_issue";

    const po = await query(
      `INSERT INTO purchase_orders (product_id, supplier_id, warehouse_id, quantity_ordered, order_date, expected_arrival_date, status)
       VALUES ($1,$2,$3,$4, now(), (now() + ($5 || ' days')::interval), $6) RETURNING *`,
      [product_id, supplier_id, warehouse_id, finalQty, LEAD_TIME_DAYS, status]
    );

    res.json(po.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal" });
  }
};

export const increaseStockAtArrival = async (req, res) => {
  const poId = Number(req.params.id);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const poRes = await client.query(
      `SELECT * FROM purchase_orders WHERE id = $1 FOR UPDATE`,
      [poId]
    );
    if (poRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "po not found" });
    }
    const po = poRes.rows[0];
    if (po.status === "completed") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "already completed" });
    }

    const wpRes = await client.query(
      `SELECT id, quantity FROM warehouse_products WHERE warehouse_id = $1 AND product_id = $2 FOR UPDATE`,
      [po.warehouse_id, po.product_id]
    );
    if (wpRes.rowCount === 0) {
      await client.query(
        `INSERT INTO warehouse_products (warehouse_id, product_id, quantity) VALUES ($1,$2,$3)`,
        [po.warehouse_id, po.product_id, po.quantity_ordered]
      );
    } else {
      await client.query(
        `UPDATE warehouse_products SET quantity = quantity + $1 WHERE id = $2`,
        [po.quantity_ordered, wpRes.rows[0].id]
      );
    }

    await client.query(
      `UPDATE purchase_orders SET status = 'completed' WHERE id = $1`,
      [poId]
    );

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "internal" });
  } finally {
    client.release();
  }
};
