const bcrypt = require("bcryptjs");
exports.getUser = async (req, res) => {
	try {
		const userDb = req.app.locals.userDb;
		if (!userDb) {
			return res.status(500).json({ error: "userDB not connected" });
		}

		const { username } = req.body;

		const user = await userDb.find({ username: username }).toArray();

		res.json({ status: "success", user });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

exports.login = async (req, res) => {
	try {
		const userDb = req.app.locals.userDb;
		if (!userDb) {
			return res.status(500).json({ error: "userDB not connected" });
		}
		const { username, password } = req.body;
		if (!username || !password) {
			res.status(404).json({ message: "Username/password not given" });
		}
		//const hashed = await bcrypt.hash(password, 10);
		const existing = await userDb.findOne({ username });
		if (!existing) {
			return res.status(404).json({ error: "username not found" });
		}
		if (bcrypt.compare(password, existing.password)) {
			return res.status(200).json({ status: "User Logged Successfully" });
		} else {
			return res.status(403).json({ staus: "Incorrect Password" });
		}
	} catch (error) {
		res.status(500).json({ Login: error.message });
	}
};

exports.postUser = async (req, res) => {
	try {
		const userDb = req.app.locals.userDb;
		if (!userDb) {
			return res.status(500).json({ error: "userDB not connected" });
		}

		const { username, email, password } = req.body;
		if (!username || !email || !password) {
			res.status(404).json({ message: "Username/password/email not given" });
		}
		const hashed = await bcrypt.hash(password, 10);
		const existing = await userDb.findOne({ $or: [{ email }, { username }] });
		if (existing) {
			return res
				.status(409)
				.json({ error: "email or username already in use" });
		}
		const user = await userDb.insertOne({
			username,
			email,
			password: hashed,
		});

		res.status(201).json({ status: "OK", user: user });
	} catch (err) {
		console.error("Register error:", err);
		res.status(500).json({ error: "server error" });
	}
};
