import express from "express";
import {
  createPurchaseOrder,
  getAllPurchaseOrders,
  increaseStockAtArrival,
} from "../controllers/purchaseController.js";

const router = express.Router();

router.get("/purchase-orders", getAllPurchaseOrders);
router.post("/purchase-orders", createPurchaseOrder);
router.post("/purchase-orders/:id/arrive", increaseStockAtArrival);

export default router;
