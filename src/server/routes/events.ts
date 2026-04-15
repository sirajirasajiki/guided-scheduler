import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../db/client";
import { events, participants, restaurants } from "../db/schema";
import type {
  CreateEventRequest,
  CreateEventResponse,
  GetEventAdminResponse,
  GetEventShareResponse,
  SubmitParticipantRequest,
  SubmitParticipantResponse,
  ConfirmDateRequest,
  ResponseValue,
  AddRestaurantRequest,
  AddRestaurantResponse,
} from "../../shared/types";

type Bindings = {
  DB: D1Database;
};

const eventsRoute = new Hono<{ Bindings: Bindings }>();

// POST /api/events — イベント作成
eventsRoute.post("/", async (c) => {
  const body = await c.req.json<CreateEventRequest>();

  if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
    return c.json({ error: "name は必須です" }, 400);
  }
  if (
    !Array.isArray(body.candidateDates) ||
    body.candidateDates.length < 3 ||
    body.candidateDates.length > 5
  ) {
    return c.json({ error: "候補日は 3〜5 個で指定してください" }, 400);
  }

  const db = createDb(c.env.DB);
  const now = Math.floor(Date.now() / 1000);

  const newEvent = {
    id: crypto.randomUUID(),
    name: body.name.trim(),
    adminToken: crypto.randomUUID(),
    shareToken: crypto.randomUUID(),
    candidateDates: JSON.stringify(body.candidateDates),
    confirmedDate: null,
    createdAt: now,
  };

  await db.insert(events).values(newEvent);

  const res: CreateEventResponse = {
    eventId: newEvent.id,
    adminToken: newEvent.adminToken,
    shareToken: newEvent.shareToken,
  };
  return c.json(res, 201);
});

// GET /api/events/admin/:adminToken — 管理用取得
eventsRoute.get("/admin/:adminToken", async (c) => {
  const { adminToken } = c.req.param();
  const db = createDb(c.env.DB);

  const event = await db
    .select()
    .from(events)
    .where(eq(events.adminToken, adminToken))
    .get();

  if (!event) {
    return c.json({ error: "イベントが見つかりません" }, 404);
  }

  const rows = await db
    .select()
    .from(participants)
    .where(eq(participants.eventId, event.id))
    .all();

  const restaurantRows = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.eventId, event.id))
    .all();

  const res: GetEventAdminResponse = {
    eventId: event.id,
    name: event.name,
    candidateDates: JSON.parse(event.candidateDates) as string[],
    confirmedDate: event.confirmedDate,
    participants: rows.map((p) => ({
      id: p.id,
      name: p.name,
      responses: JSON.parse(p.responses) as Record<string, ResponseValue>,
      createdAt: p.createdAt,
    })),
    restaurants: restaurantRows.map((r) => ({
      id: r.id,
      name: r.name,
      url: r.url,
      memo: r.memo,
      createdAt: r.createdAt,
    })),
    createdAt: event.createdAt,
  };
  return c.json(res);
});

// GET /api/events/share/:shareToken — 共有用取得
eventsRoute.get("/share/:shareToken", async (c) => {
  const { shareToken } = c.req.param();
  const db = createDb(c.env.DB);

  const event = await db
    .select()
    .from(events)
    .where(eq(events.shareToken, shareToken))
    .get();

  if (!event) {
    return c.json({ error: "イベントが見つかりません" }, 404);
  }

  const restaurantRows = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.eventId, event.id))
    .all();

  const res: GetEventShareResponse = {
    eventId: event.id,
    name: event.name,
    candidateDates: JSON.parse(event.candidateDates) as string[],
    confirmedDate: event.confirmedDate,
    restaurants: restaurantRows.map((r) => ({
      id: r.id,
      name: r.name,
      url: r.url,
      memo: r.memo,
      createdAt: r.createdAt,
    })),
  };
  return c.json(res);
});

// POST /api/events/share/:shareToken/participants — 回答送信
eventsRoute.post("/share/:shareToken/participants", async (c) => {
  const { shareToken } = c.req.param();
  const body = await c.req.json<SubmitParticipantRequest>();
  const db = createDb(c.env.DB);

  const event = await db
    .select()
    .from(events)
    .where(eq(events.shareToken, shareToken))
    .get();

  if (!event) {
    return c.json({ error: "イベントが見つかりません" }, 404);
  }

  if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
    return c.json({ error: "name は必須です" }, 400);
  }
  if (!body.responses || typeof body.responses !== "object") {
    return c.json({ error: "responses は必須です" }, 400);
  }

  const now = Math.floor(Date.now() / 1000);

  // 同名参加者が既にいる場合は回答を上書き
  const existing = await db
    .select()
    .from(participants)
    .where(eq(participants.eventId, event.id))
    .all();

  const duplicate = existing.find(
    (p) => p.name === body.name.trim()
  );

  if (duplicate) {
    await db
      .update(participants)
      .set({ responses: JSON.stringify(body.responses) })
      .where(eq(participants.id, duplicate.id));

    const res: SubmitParticipantResponse = { participantId: duplicate.id };
    return c.json(res);
  }

  const newParticipant = {
    id: crypto.randomUUID(),
    eventId: event.id,
    name: body.name.trim(),
    responses: JSON.stringify(body.responses),
    createdAt: now,
  };

  await db.insert(participants).values(newParticipant);

  const res: SubmitParticipantResponse = { participantId: newParticipant.id };
  return c.json(res, 201);
});

// PATCH /api/events/admin/:adminToken/confirm — 確定日決定
eventsRoute.patch("/admin/:adminToken/confirm", async (c) => {
  const { adminToken } = c.req.param();
  const body = await c.req.json<ConfirmDateRequest>();
  const db = createDb(c.env.DB);

  const event = await db
    .select()
    .from(events)
    .where(eq(events.adminToken, adminToken))
    .get();

  if (!event) {
    return c.json({ error: "イベントが見つかりません" }, 404);
  }

  const candidateDates = JSON.parse(event.candidateDates) as string[];
  if (!body.date || !candidateDates.includes(body.date)) {
    return c.json({ error: "date は候補日のいずれかを指定してください" }, 400);
  }

  await db
    .update(events)
    .set({ confirmedDate: body.date })
    .where(eq(events.adminToken, adminToken));

  return c.json({ confirmedDate: body.date });
});

// POST /api/events/admin/:adminToken/restaurants — 店候補追加
eventsRoute.post("/admin/:adminToken/restaurants", async (c) => {
  const { adminToken } = c.req.param();
  const body = await c.req.json<AddRestaurantRequest>();
  const db = createDb(c.env.DB);

  const event = await db
    .select()
    .from(events)
    .where(eq(events.adminToken, adminToken))
    .get();

  if (!event) {
    return c.json({ error: "イベントが見つかりません" }, 404);
  }

  if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
    return c.json({ error: "name は必須です" }, 400);
  }

  const now = Math.floor(Date.now() / 1000);

  const newRestaurant = {
    id: crypto.randomUUID(),
    eventId: event.id,
    name: body.name.trim(),
    url: body.url?.trim() || null,
    memo: body.memo?.trim() || null,
    createdAt: now,
  };

  await db.insert(restaurants).values(newRestaurant);

  const res: AddRestaurantResponse = { restaurantId: newRestaurant.id };
  return c.json(res, 201);
});

export default eventsRoute;
