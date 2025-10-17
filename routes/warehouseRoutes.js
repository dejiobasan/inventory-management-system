import express from "express";




const router = express.Router();

router.post("/warehouses/:warehouseId/products/:productId/adjust-stock");






export default router;