const express = require("express");
const router = express.Router();
const crowdController = require("../controllers/crowdController");

router.get("/", crowdController.getFiveMinutesAgo);
router.post("/", crowdController.postCrowd);

module.exports = router;
