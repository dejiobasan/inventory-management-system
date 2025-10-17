import express from "express";




const router = express.Router();

router.get("/purchase-orders");
router.post("/purchase-orders");
router.post("/purchase-orders/:id/arrive");






export default router;