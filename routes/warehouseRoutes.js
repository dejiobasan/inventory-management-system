import express from "express";
import { adjustStock } from "../controllers/warehouseController.js";

const router = express.Router();

router.post("/warehouses/:warehouseId/products/:productId/adjust-stock", adjustStock);

export default router;
