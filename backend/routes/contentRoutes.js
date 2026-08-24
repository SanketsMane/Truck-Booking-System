const express = require("express");

const router = express.Router();

const postController = require("../controllers/postController");

// No auth — public reads for blog/news/update posts, same as metaRoutes.
// Sits behind the global apiLimiter already applied in app.js.
router.get("/posts", postController.listPublicPosts);
router.get("/posts/:slug", postController.getPublicPost);

module.exports = router;
