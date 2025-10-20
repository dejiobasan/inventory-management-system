import { query, pool } from "../database/database.js";
import dotenv from "dotenv";
dotenv.config();
const LEAD_TIME_DAYS = parseInt(process.env.LEAD_TIME_DAYS ?? "3", 10);

export const adjustStock = async (req, res) => {
  const warehouseId = Number(req.params.warehouseId);
  const productId = Number(req.params.productId);
  const delta = Number(req.body.delta);
  if (Number.isNaN(delta))
    return res
      .status(400)
      .json({ error: "delta required and must be a number" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const wpRes = await client.query(
      `SELECT id, quantity FROM warehouse_products WHERE warehouse_id = $1 AND product_id = $2 FOR UPDATE`,
      [warehouseId, productId]
    );

    if (wpRes.rowCount === 0) {
      if (delta < 0) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ error: "cannot reduce non-existent stock" });
      }

      const occupancyRes = await client.query(
        `SELECT COALESCE(SUM(quantity),0) as total FROM warehouse_products WHERE warehouse_id = $1 FOR UPDATE`,
        [warehouseId]
      );
      const capacityRes = await client.query(
        `SELECT capacity FROM warehouses WHERE id = $1`,
        [warehouseId]
      );
      if (capacityRes.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "warehouse not found" });
      }
      const currentOccupancy = Number(occupancyRes.rows[0].total);
      const capacity = Number(capacityRes.rows[0].capacity);

      if (currentOccupancy + delta > capacity) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "capacity exceeded" });
      }

      const insertRes = await client.query(
        `INSERT INTO warehouse_products (warehouse_id, product_id, quantity) VALUES ($1,$2,$3) RETURNING *`,
        [warehouseId, productId, delta]
      );

      await client.query("COMMIT");

      // run reorder check now:
      await monitorAndReorder(productId, warehouseId);
      return res.json(insertRes.rows[0]);
    }

    const currentQty = Number(wpRes.rows[0].quantity);
    const newQty = currentQty + delta;
    if (newQty < 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "insufficient stock" });
    }

    if (delta > 0) {
      const occupancyRes = await client.query(
        `SELECT COALESCE(SUM(quantity),0) as total FROM warehouse_products WHERE warehouse_id = $1 FOR UPDATE`,
        [warehouseId]
      );
      const capacityRes = await client.query(
        `SELECT capacity FROM warehouses WHERE id = $1`,
        [warehouseId]
      );
      const currentOccupancy = Number(occupancyRes.rows[0].total);
      const capacity = Number(capacityRes.rows[0].capacity);
      if (currentOccupancy + delta > capacity) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "capacity exceeded" });
      }
    }

    const upd = await client.query(
      `UPDATE warehouse_products SET quantity = $1 WHERE id = $2 RETURNING *`,
      [newQty, wpRes.rows[0].id]
    );

    await client.query("COMMIT");

    await monitorAndReorder(productId, warehouseId);

    res.json(upd.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "internal" });
  } finally {
    client.release();
  }
};
