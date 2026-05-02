const crowdController = require("../controllers/crowdController");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createReq = (body, logDb) => ({
  body,
  app: { locals: { logDb } },
});

describe("crowdController.postCrowd unit", () => {
  test("computes wifi_estimate and bt_estimate", async () => {
    const logDb = { insertOne: jest.fn().mockResolvedValue({}) };
    const req = createReq(
      {
        clients: 12,
        bt_devices: 4,
        density: "medium",
        timestamp: new Date().toISOString(),
      },
      logDb,
    );
    const res = createRes();

    await crowdController.postCrowd(req, res);

    expect(logDb.insertOne).toHaveBeenCalledTimes(1);
    const inserted = logDb.insertOne.mock.calls[0][0];
    expect(inserted.wifi_estimate).toBe(24);
    expect(inserted.bt_estimate).toBe(12);
  });

  test("computes fusion formula and crowd level boundaries", async () => {
    const logDb = { insertOne: jest.fn().mockResolvedValue({}) };

    const cases = [
      {
        label: "low boundary (<50)",
        body: { clients: 35, bt_devices: 0 },
        expectedEstimate: 49,
        expectedLevel: "low",
      },
      {
        label: "medium lower bound (50)",
        body: { clients: 36, bt_devices: 0 },
        expectedEstimate: 50,
        expectedLevel: "medium",
      },
      {
        label: "medium upper bound (149)",
        body: { clients: 105, bt_devices: 2 },
        expectedEstimate: 149,
        expectedLevel: "medium",
      },
      {
        label: "high lower bound (150)",
        body: { clients: 105, bt_devices: 3 },
        expectedEstimate: 150,
        expectedLevel: "high",
      },
    ];

    for (const testCase of cases) {
      const req = createReq(
        {
          ...testCase.body,
          density: "low",
          timestamp: new Date().toISOString(),
        },
        logDb,
      );
      const res = createRes();

      await crowdController.postCrowd(req, res);

      const inserted = logDb.insertOne.mock.calls.pop()[0];
      expect(inserted.crowd_estimate).toBe(testCase.expectedEstimate);
      expect(inserted.crowd_level).toBe(testCase.expectedLevel);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "logged",
          crowd_estimate: testCase.expectedEstimate,
          crowd_level: testCase.expectedLevel,
        }),
      );
    }
  });
});
