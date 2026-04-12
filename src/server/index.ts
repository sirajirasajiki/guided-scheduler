import { Hono } from "hono";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/api/hello", (c) => {
  return c.json({ message: "Hello from Hono on Workers!" });
});

export default app;
