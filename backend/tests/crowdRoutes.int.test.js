const express = require("express");
const request = require("supertest");
const { MongoClient } = require("mongodb");
const { MongoMemoryServer } = require("mongodb-memory-server");
const crowdRouter = require("../routes/crowd");

let mongoServer;
let client;
let db;
let app;

const seedLog = (overrides = {}) => ({
  clients: 10,
  bt_devices: 2,
  density: "low",
  wifi_estimate: 20,
  bt_estimate: 6,
  crowd_estimate: 16,
  crowd_level: "low",
  timestamp: new Date(),
  ...overrides,
});

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  client = new MongoClient(mongoServer.getUri());
  await client.connect();
  db = client.db("trainCrowdTestDB");

  app = express();
  app.use(express.json());
  app.locals.logDb = db.collection("crowdLogs");
  app.locals.groupDb = db.collection("groupLogs");
  app.use("/api/crowd", crowdRouter);
});

afterAll(async () => {
  await client.close();
  await mongoServer.stop();
});

afterEach(async () => {
  await db.collection("crowdLogs").deleteMany({});
});

describe("/api/crowd integration", () => {
  test("POST /api/crowd computes and logs payload", async () => {
    const payload = {
      clients: 12,
      bt_devices: 4,
      density: "medium",
      timestamp: new Date().toISOString(),
    };

    const res = await request(app).post("/api/crowd").send(payload);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("logged");
    expect(res.body.crowd_estimate).toBe(20);
    expect(res.body.crowd_level).toBe("low");

    await new Promise((resolve) => setTimeout(resolve, 50));

    const saved = await db.collection("crowdLogs").findOne({
      timestamp: new Date(payload.timestamp),
    });
    expect(saved).not.toBeNull();
    expect(saved.clients).toBe(12);
    expect(saved.bt_devices).toBe(4);
  });

  test("GET /api/crowd/latest returns most recent", async () => {
    const older = seedLog({ timestamp: new Date(Date.now() - 60000) });
    const newer = seedLog({ timestamp: new Date(), crowd_estimate: 120 });
    await db.collection("crowdLogs").insertMany([older, newer]);

    const res = await request(app).get("/api/crowd/latest");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.latest.crowd_estimate).toBe(120);
  });

  test("GET /api/crowd returns 5-minute summary", async () => {
    const recent = seedLog({ crowd_level: "medium" });
    const stale = seedLog({
      crowd_level: "high",
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
    });

    await db.collection("crowdLogs").insertMany([recent, stale]);

    const res = await request(app).get("/api/crowd");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.summary.length).toBeGreaterThan(0);
    expect(res.body.summary[0]._id).toBe("medium");
  });

  test("GET /api/crowd/past returns quarter-hour averages", async () => {
    const now = new Date();
    const inWindow = seedLog({
      crowd_estimate: 110,
      crowd_level: "medium",
      timestamp: new Date(now.getTime() - 5 * 60 * 1000),
    });

    await db.collection("crowdLogs").insertOne(inWindow);

    const res = await request(app).get("/api/crowd/past");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(Array.isArray(res.body.quarters)).toBe(true);
    expect(res.body.quarters.length).toBeGreaterThan(0);
    expect(res.body.quarters[0]).toEqual(
      expect.objectContaining({
        label: expect.any(String),
        avgCrowd: expect.any(Number),
        crowd_level: expect.any(String),
      }),
    );
  });
});
