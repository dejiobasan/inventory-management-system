import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import productsRoutes from "./routes/productsRoutes.js";
import warehouseRoutes from "./routes/warehouseRoutes.js";
import purchaseRoutes from "./routes/purchaseRoutes.js";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT;
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(YAML.load("./swagger.yaml"))
);

app.get("/", (req, res) => res.json({ ok: true }));
app.use("/api/products", productsRoutes);
app.use("/api/warehouse", warehouseRoutes);
app.use("/api/purchase-order", purchaseRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
});

export default app;