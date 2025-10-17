import express from "express";
import cors from "cors";
import dotenv from 'dotenv';
import productsRoutes from "./routes/productsRoutes.js";
import warehouseRoutes from "./routes/warehouseRoutes.js";
import purchaseRoutes from "./routes/purchaseRoutes.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 8000;


app.get('/', (req, res) => res.json({ ok: true }));
app.use('/api/product', productsRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use("/api/purchase-order", purchaseRoutes);








app.listen(PORT, () => console.log(`Server running on port ${PORT}`));