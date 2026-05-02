exports.getFiveMinutesAgo = async (req, res) => {
  try {
    const logDb = req.app.locals.logDb;
    if (!logDb) {
      return res.status(500).json({ error: "DB not connected" });
    }

    // Look at the last 5 minutes of logs
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const summary = await logDb
      .aggregate([
        { $match: { timestamp: { $gte: fiveMinutesAgo } } },
        {
          $group: {
            _id: "$crowd_level", // e.g., 'low', 'medium', 'high'
            count: { $sum: 1 },
            avg_estimate: { $avg: "$crowd_estimate" },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray();

    res.json({ status: "success", summary });
  } catch (error) {
    console.error("getFiveMinutesAgo error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.postCrowd = async (req, res) => {
  const logDb = req.app.locals.logDb;
  if (!logDb) {
    return res.status(500).json({ error: "DB not connected" });
  }

  const { clients, bt_devices, density, timestamp } = req.body;

  // Tuning factors (calibrate per station later)
  const WIFI_MULTIPLIER = 2; // 1 WiFi MAC ≈ 2 people (radios off ~50%)
  const BT_MULTIPLIER = 3; // 1 BT MAC ≈ 3 people (BT less common)
  const WIFI_WEIGHT = 0.7; // WiFi more reliable than BT
  const BT_WEIGHT = 0.3;

  // Adjusted estimates
  const wifi_estimate = clients * WIFI_MULTIPLIER;
  const bt_estimate = bt_devices * BT_MULTIPLIER;

  // Weighted fusion (WiFi gets 70% influence)
  const crowd_estimate = Math.round(
    wifi_estimate * WIFI_WEIGHT + bt_estimate * BT_WEIGHT,
  );

  // Density labels
  const crowd_level =
    crowd_estimate < 50 ? "low" : crowd_estimate < 150 ? "medium" : "high";

  const log = {
    clients,
    bt_devices,
    density,
    wifi_estimate,
    bt_estimate,
    crowd_estimate,
    crowd_level,
    timestamp: new Date(timestamp),
  };

  // Fire-and-forget insert so scan.sh isn't blocked
  logDb
    .insertOne(log)
    .then(() => {
      console.log(
        `Final Crowd: ~${crowd_estimate} people (${crowd_level}) at ${timestamp}`,
      );
    })
    .catch((err) => console.error("Failed to insert crowd log:", err));

  res.json({
    status: "logged",
    crowd_estimate,
    crowd_level,
  });
};

exports.getLatest = async (req, res) => {
  try {
    const logDb = req.app.locals.logDb;
    if (!logDb) {
      return res.status(500).json({ error: "DB not connected" });
    }

    const latest = await logDb
      .find({})
      .sort({ timestamp: -1 })
      .limit(1)
      .toArray();

    if (!latest.length) {
      return res.json({ status: "success", latest: null });
    }

    return res.json({ status: "success", latest: latest[0] });
  } catch (error) {
    console.error("getLatest error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.appendToGroup = async (req, res, timeToMatch) => {
  try {
    const logDb = req.app.locals.logDb;
    const groupDb = req.app.locals.groupDb;

    if (!logDb || !groupDb) {
      return res.status(500).json({ error: "DB not connected" });
    }

    // Aggregate last hour: e.g., avg crowd_estimate by station/train (adapt fields)
    const lastHourCursor = await logDb.find({
      timestamp: { $gte: timeToMatch },
    });

    const result = await lastHourCursor.toArray();
    console.log(`Hourly summary stored: ${result.length} groups`);

    if (result.length === 0) {
      return res.json({ status: "success", archived: 0 });
    }

    await groupDb.insertMany(result);
    await logDb.deleteMany({});
    return res.json({ status: "success", archived: result.length });
  } catch (error) {
    console.error("Aggregation failed:", error);
  }
};

// controllers/crowdController.js

exports.getQuarterHourAverages = async (req, res) => {
  try {
    const logDb = req.app.locals.logDb; // crowdLogs collection handle
    if (!logDb) {
      return res.status(500).json({ error: "DB not connected" });
    }

    const now = new Date();

    // Start of current hour (e.g., 18:00:00 if time is 18:13)
    const hourStart = new Date(now);
    hourStart.setMinutes(0, 0, 0);

    // End of current hour (next hour)
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

    // For 6:13 pm, this will still calculate the 4 intervals inside 18:00–19:00:
    // [18:00–18:15), [18:15–18:30), [18:30–18:45), [18:45–19:00)

    const pipeline = [
      {
        $match: {
          timestamp: {
            $gte: hourStart,
            $lt: hourEnd,
          },
        },
      },
      {
        // Compute which 15-min chunk each doc belongs to: 0,1,2,3
        $addFields: {
          minute: { $minute: "$timestamp" },
        },
      },
      {
        $addFields: {
          chunkIndex: {
            $floor: { $divide: ["$minute", 15] }, // 0‑14 -> 0, 15‑29 -> 1, etc.
          },
        },
      },
      {
        $group: {
          _id: "$chunkIndex",
          avgCrowd: { $avg: "$crowd_estimate" },
          count: { $sum: 1 },
          from: { $min: "$timestamp" },
          to: { $max: "$timestamp" },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        // Map chunkIndex to human-readable interval labels
        $project: {
          _id: 0,
          chunkIndex: "$_id",
          avgCrowd: { $ifNull: ["$avgCrowd", 0] },
          count: 1,
          label: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id", 0] }, then: "00-15" },
                { case: { $eq: ["$_id", 1] }, then: "15-30" },
                { case: { $eq: ["$_id", 2] }, then: "30-45" },
                { case: { $eq: ["$_id", 3] }, then: "45-60" },
              ],
              default: "unknown",
            },
          },
          from: 1,
          to: 1,
        },
      },
    ];

    const result = await logDb.aggregate(pipeline).toArray();

    // append crowd_level to each quarter
    const quarters = result.map((q) => {
      const avg = q.avgCrowd || 0;
      const crowd_level = avg < 50 ? "low" : avg < 150 ? "medium" : "high";

      return {
        ...q,
        crowd_level,
      };
    });

    res.json({
      status: "success",
      hourStart,
      hourEnd,
      quarters,
    });
  } catch (err) {
    console.error("getQuarterHourAverages error:", err);
    res.status(500).json({ error: err.message });
  }
};
