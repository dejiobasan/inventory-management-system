import { query, pool } from "../database/database.js";
import dotenv from "dotenv";
dotenv.config();
const LEAD_TIME_DAYS = parseInt(process.env.LEAD_TIME_DAYS ?? "3", 10);

export const getAllProducts = async (req, res) => {
  try {
    const q = await query(
      `SELECT p.id as product_id, p.sku, p.name as product_name, p.description, p.reorder_threshold, p.default_supplier_id,
              wp.warehouse_id, wp.quantity
       FROM products p
       LEFT JOIN warehouse_products wp ON wp.product_id = p.id
       ORDER BY p.id`
    );
    res.json(q.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
