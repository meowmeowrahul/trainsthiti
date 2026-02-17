const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.get("/", userController.getUser);
router.post("/register", userController.postUser);
//router.put("/update",userController.putUser)
router.post("/login", userController.login);

module.exports = router;
