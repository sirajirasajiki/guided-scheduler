import { Hono } from "hono";
import { createDb } from "./db/client";
import { events } from "./db/schema";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/api/hello", async (c) => {
  const db = createDb(c.env.DB);
  const allEvents = await db.select().from(events).all();
  return c.json({
    message: "Hello from Hono on Workers!",
    eventCount: allEvents.length,
  });
});

export default app;
