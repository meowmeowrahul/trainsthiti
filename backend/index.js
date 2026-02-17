const express = require("express");
const cron = require("node-cron");
const cors = require("cors");
const { connectDB } = require("./db");
const crowdRouter = require("./routes/crowd");
const userRouter = require("./routes/user");

const app = express();
app.use(express.json());
const PORT = 3000;

async function startServer() {
	try {
		app.use(cors());
		const db = await connectDB();
		logDb = db.collection("crowdLogs");
		groupDb = db.collection("groupLogs");
		userDb = db.collection("users");
		app.locals.logDb = logDb;
		app.locals.groupDb = groupDb;
		app.locals.userDb = userDb;

		app.use("/api/crowd", crowdRouter);
		app.use("/user", userRouter);

		app.listen(PORT, () => console.log("SERVER STARTED AT PORT:" + PORT));
	} catch (error) {
		console.error("Failed to Start Server:" + error);
		process.exit(1);
	}
}

// Access DBs via app.locals after connectDB

cron.schedule("0 * * * *", async () => {
	// Every hour at minute 0 [web:39]
	try {
		const logDb = app.locals.logDb;
		const groupDb = app.locals.groupDb;
		const now = new Date();
		const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

		// Aggregate last hour: e.g., avg crowd_estimate by station/train (adapt fields)
		const pipeline = [
			{ $match: { timestamp: { $gte: hourAgo, $lt: now } } },
			{
				$group: {
					_id: { station: "$station", train: "$train" }, // Group by location/train
					avgCrowd: { $avg: "$crowd_estimate" },
					maxCrowd: { $max: "$crowd_estimate" },
					count: { $sum: 1 },
					totalWiFi: { $sum: "$wifi_count" }, // Customize aggregations
				},
			},
			{ $merge: { into: "groupDb" } }, // Upsert into groupDb [web:9]
		];

		const result = await logDb.aggregate(pipeline).toArray();
		console.log(`Hourly summary stored: ${result.length} groups`);
	} catch (error) {
		console.error("Aggregation failed:", error);
	}
});

startServer();
