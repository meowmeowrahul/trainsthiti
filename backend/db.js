const { MongoClient } = require("mongodb");
require("dotenv").config();
const uri = process.env.DB_URI;

const client = new MongoClient(uri);

let db;

async function connectDB() {
	try {
		await client.connect();
		db = client.db("trainCrowdDB");
		console.log("MongoDB connected!");
		return db;
	} catch (error) {
		console.error("DB connection failed:", error);
		throw error;
	}
}

module.exports = { connectDB, client, db };
