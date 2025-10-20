import express from "express";
import { getAllProducts } from "../controllers/productsController.js";



const router = express.Router();

router.get("/all-products", getAllProducts);






export default router;