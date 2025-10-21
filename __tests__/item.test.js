import request from "supertest";
import app from "../server.js";

describe("Purchase Orders API", () => {
  it("should fetch all purchase orders", async () => {
    const res = await request(app).get("/api/purchase-order/purchase-orders");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should create a new purchase order", async () => {
    const po = {
      supplier_id: 1,
      item_id: 1,
      quantity: 5,
    };

    const res = await request(app).post("/api/purchase-order/purchase-orders").send(po);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.status).toBe("pending");
  });
});
