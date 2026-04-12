import { Hono } from "hono";
import eventsRoute from "./routes/events";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.route("/api/events", eventsRoute);

export default app;
