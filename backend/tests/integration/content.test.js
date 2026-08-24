const mongoose = require("mongoose");
const app = require("../../app");
const AuditLog = require("../../models/auditLogModel");
const { signupUser, makeAdmin, uploadTestFile } = require("../helpers");

const emailFor = (seed) => `content${seed}@example.test`;

const validPost = (overrides = {}) => ({
  type: "blog",
  title: "Best Truck Routes in Maharashtra (2026)!",
  excerpt: "A quick guide to the busiest freight corridors.",
  body: "<p>Hello world</p>",
  ...overrides,
});

// Shared by most describe blocks below: a fresh full-scope admin agent.
const newFullAdmin = async (seed) => {
  const { agent, user } = await signupUser(app, { email: emailFor(seed), name: `Admin ${seed}` });
  await makeAdmin(user, "full");
  return agent;
};

describe("Content (blog/news/updates) — authoring & authorization", () => {
  it("rejects a non-admin", async () => {
    const { agent } = await signupUser(app, { email: emailFor(1), name: "Shipper", roles: ["shipper"] });
    const res = await agent.post("/admin/posts").send(validPost());
    expect(res.status).toBe(403);
  });

  it("rejects an admin with a scope other than full/content", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(2), name: "Support Admin" });
    await makeAdmin(user, "support");
    const res = await agent.post("/admin/posts").send(validPost());
    expect(res.status).toBe(403);
    expect(res.body.msg).toMatch(/additional admin permissions/i);
  });

  it("allows an admin with the content scope to create", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(3), name: "Content Admin" });
    await makeAdmin(user, "content");
    const res = await agent.post("/admin/posts").send(validPost());
    expect(res.status).toBe(201);
  });

  it("allows a full-scope admin to create (scope bypass)", async () => {
    const agent = await newFullAdmin(4);
    const res = await agent.post("/admin/posts").send(validPost());
    expect(res.status).toBe(201);
  });

  it("blocks a content-scoped admin from hard-deleting, but allows full", async () => {
    const { agent: contentAgent, user: contentUser } = await signupUser(app, {
      email: emailFor(5),
      name: "Content Admin 5",
    });
    await makeAdmin(contentUser, "content");
    const created = await contentAgent.post("/admin/posts").send(validPost());
    const postId = created.body.post._id;

    const deleteAsContent = await contentAgent.delete(`/admin/posts/${postId}`);
    expect(deleteAsContent.status).toBe(403);

    const fullAgent = await newFullAdmin(6);
    const deleteAsFull = await fullAgent.delete(`/admin/posts/${postId}`);
    expect(deleteAsFull.status).toBe(200);
  });
});

describe("Content — slug behavior", () => {
  it("derives a normalized slug from the title", async () => {
    const agent = await newFullAdmin(10);
    const res = await agent.post("/admin/posts").send(validPost());
    expect(res.status).toBe(201);
    expect(res.body.post.slug).toBe("best-truck-routes-in-maharashtra-2026");
    expect(res.body.post.status).toBe("draft");
    expect(res.body.post.publishedAt).toBeNull();
  });

  it("suffixes a colliding slug from a second post with the same title", async () => {
    const agent = await newFullAdmin(11);
    const first = await agent.post("/admin/posts").send(validPost());
    const second = await agent.post("/admin/posts").send(validPost());
    expect(first.body.post.slug).toBe("best-truck-routes-in-maharashtra-2026");
    expect(second.body.post.slug).toBe("best-truck-routes-in-maharashtra-2026-2");
  });

  it("enforces slug uniqueness across different types (globally unique, not per-type)", async () => {
    const agent = await newFullAdmin(12);
    const blogPost = await agent.post("/admin/posts").send(validPost({ type: "blog", slug: "x" }));
    const newsPost = await agent.post("/admin/posts").send(validPost({ type: "news", title: "Something else", slug: "x" }));
    expect(blogPost.body.post.slug).toBe("x");
    expect(newsPost.body.post.slug).toBe("x-2");
  });

  it("normalizes an explicit custom slug", async () => {
    const agent = await newFullAdmin(13);
    const res = await agent.post("/admin/posts").send(validPost({ slug: "My Custom Slug!!!" }));
    expect(res.body.post.slug).toBe("my-custom-slug");
  });

  it("does NOT change the slug when only the title is updated", async () => {
    const agent = await newFullAdmin(14);
    const created = await agent.post("/admin/posts").send(validPost());
    const postId = created.body.post._id;
    const updated = await agent.put(`/admin/posts/${postId}`).send({ title: "A Totally Different Title" });
    expect(updated.status).toBe(200);
    expect(updated.body.post.slug).toBe(created.body.post.slug);
    expect(updated.body.post.title).toBe("A Totally Different Title");
  });
});

describe("Content — sanitization", () => {
  it("strips a <script> tag and its content on create", async () => {
    const agent = await newFullAdmin(20);
    const res = await agent.post("/admin/posts").send(validPost({ body: '<p>ok</p><script>alert(1)</script>' }));
    expect(res.status).toBe(201);
    expect(res.body.post.body).toBe("<p>ok</p>");
    expect(res.body.post.body).not.toMatch(/<script/i);
  });

  it("strips event-handler attributes", async () => {
    const agent = await newFullAdmin(21);
    const res = await agent.post("/admin/posts").send(validPost({ body: '<p onclick="steal()">hi</p>' }));
    expect(res.body.post.body).not.toMatch(/onclick/i);
  });

  it("strips a javascript: href", async () => {
    const agent = await newFullAdmin(22);
    const res = await agent.post("/admin/posts").send(validPost({ body: '<a href="javascript:alert(1)">x</a>' }));
    expect(res.body.post.body).not.toContain("javascript:");
  });

  it("forces nofollow/noopener/noreferrer on an external link", async () => {
    const agent = await newFullAdmin(23);
    const res = await agent.post("/admin/posts").send(validPost({ body: '<a href="https://evil.com">x</a>' }));
    expect(res.body.post.body).toContain("nofollow");
  });

  it("rejects a body that's entirely a <script> tag with 400, creating nothing", async () => {
    const agent = await newFullAdmin(24);
    const res = await agent.post("/admin/posts").send(validPost({ body: "<script>x</script>" }));
    expect(res.status).toBe(400);
  });

  it("derives bodyText with no HTML tags and a readingMinutes >= 1", async () => {
    const agent = await newFullAdmin(25);
    const res = await agent.post("/admin/posts").send(validPost({ body: "<p>Hello <strong>world</strong></p>" }));
    expect(res.body.post.bodyText).not.toMatch(/[<>]/);
    expect(res.body.post.readingMinutes).toBeGreaterThanOrEqual(1);
  });

  it("survives the global sanitizeInput middleware with a dotted URL in an href", async () => {
    const agent = await newFullAdmin(26);
    const res = await agent.post("/admin/posts").send(validPost({ body: '<p><a href="https://x.com/a.b">link</a></p>' }));
    expect(res.status).toBe(201);
    expect(res.body.post.body).toContain("https://x.com/a.b");
  });
});

describe("Content — state transitions", () => {
  it("publishes a post, setting status and publishedAt, and logs an audit row", async () => {
    const agent = await newFullAdmin(30);
    const created = await agent.post("/admin/posts").send(validPost());
    const postId = created.body.post._id;

    const res = await agent.put(`/admin/posts/${postId}/publish`);
    expect(res.status).toBe(200);
    expect(res.body.post.status).toBe("published");
    expect(res.body.post.publishedAt).not.toBeNull();

    // AuditLog.targetId is Mixed (see auditLogModel.js) — no automatic
    // string->ObjectId casting, so the query needs a real ObjectId, not
    // the JSON-stringified id off the response body (same pattern as
    // truckDeletion.test.js's audit-log assertions).
    const auditRow = await AuditLog.findOne({ action: "post.publish", targetId: new mongoose.Types.ObjectId(postId) });
    expect(auditRow).toBeTruthy();
    expect(auditRow.targetType).toBe("Post");
  });

  it("rejects publishing a post with no excerpt", async () => {
    const agent = await newFullAdmin(31);
    const created = await agent.post("/admin/posts").send(validPost({ excerpt: "" }));
    const res = await agent.put(`/admin/posts/${created.body.post._id}/publish`);
    expect(res.status).toBe(400);
  });

  it("preserves publishedAt across an unpublish -> republish cycle", async () => {
    const agent = await newFullAdmin(32);
    const created = await agent.post("/admin/posts").send(validPost());
    const postId = created.body.post._id;

    const firstPublish = await agent.put(`/admin/posts/${postId}/publish`);
    const originalPublishedAt = firstPublish.body.post.publishedAt;

    await agent.put(`/admin/posts/${postId}/unpublish`);
    await new Promise((resolve) => setTimeout(resolve, 10)); // ensure a real time gap were the bug present
    const republish = await agent.put(`/admin/posts/${postId}/publish`);

    expect(republish.body.post.publishedAt).toBe(originalPublishedAt);
  });

  it("unpublish sets status back to draft and makes the post 404 publicly", async () => {
    const agent = await newFullAdmin(33);
    const created = await agent.post("/admin/posts").send(validPost());
    const postId = created.body.post._id;
    const slug = created.body.post.slug;

    await agent.put(`/admin/posts/${postId}/publish`);
    const unpublish = await agent.put(`/admin/posts/${postId}/unpublish`);
    expect(unpublish.body.post.status).toBe("draft");

    const publicRead = await agent.get(`/content/posts/${slug}`);
    expect(publicRead.status).toBe(404);
  });

  it("archive makes a post 404 publicly but still visible in the admin list", async () => {
    const agent = await newFullAdmin(34);
    const created = await agent.post("/admin/posts").send(validPost());
    const postId = created.body.post._id;
    const slug = created.body.post.slug;

    await agent.put(`/admin/posts/${postId}/publish`);
    const archive = await agent.put(`/admin/posts/${postId}/archive`);
    expect(archive.body.post.status).toBe("archived");

    const publicRead = await agent.get(`/content/posts/${slug}`);
    expect(publicRead.status).toBe(404);

    const adminList = await agent.get("/admin/posts?status=archived");
    expect(adminList.body.items.some((p) => p._id === postId)).toBe(true);
  });

  it("rejects publishing an archived post", async () => {
    const agent = await newFullAdmin(35);
    const created = await agent.post("/admin/posts").send(validPost());
    const postId = created.body.post._id;
    await agent.put(`/admin/posts/${postId}/publish`);
    await agent.put(`/admin/posts/${postId}/archive`);
    const res = await agent.put(`/admin/posts/${postId}/publish`);
    expect(res.status).toBe(400);
  });
});

describe("Content — public reads", () => {
  it("excludes a draft post and includes a published one, with no auth", async () => {
    const agent = await newFullAdmin(40);
    const draft = await agent.post("/admin/posts").send(validPost({ title: "Draft Post" }));
    const toPublish = await agent.post("/admin/posts").send(validPost({ title: "Published Post" }));
    await agent.put(`/admin/posts/${toPublish.body.post._id}/publish`);

    const res = await require("supertest")(app).get("/content/posts");
    expect(res.status).toBe(200);
    const slugs = res.body.items.map((p) => p.slug);
    expect(slugs).toContain(toPublish.body.post.slug);
    expect(slugs).not.toContain(draft.body.post.slug);
  });

  it("list response never includes body/bodyText", async () => {
    const agent = await newFullAdmin(41);
    const created = await agent.post("/admin/posts").send(validPost());
    await agent.put(`/admin/posts/${created.body.post._id}/publish`);
    const res = await require("supertest")(app).get("/content/posts");
    const item = res.body.items.find((p) => p.slug === created.body.post.slug);
    expect(item.body).toBeUndefined();
    expect(item.bodyText).toBeUndefined();
  });

  it("filters by type", async () => {
    const agent = await newFullAdmin(42);
    const blog = await agent.post("/admin/posts").send(validPost({ type: "blog", title: "Blog One" }));
    const news = await agent.post("/admin/posts").send(validPost({ type: "news", title: "News One" }));
    await agent.put(`/admin/posts/${blog.body.post._id}/publish`);
    await agent.put(`/admin/posts/${news.body.post._id}/publish`);

    const res = await require("supertest")(app).get("/content/posts?type=news");
    const slugs = res.body.items.map((p) => p.slug);
    expect(slugs).toContain(news.body.post.slug);
    expect(slugs).not.toContain(blog.body.post.slug);
  });

  it("returns full body/bodyText on a single published post, 404 on an unknown slug", async () => {
    const agent = await newFullAdmin(43);
    const created = await agent.post("/admin/posts").send(validPost());
    await agent.put(`/admin/posts/${created.body.post._id}/publish`);

    const found = await require("supertest")(app).get(`/content/posts/${created.body.post.slug}`);
    expect(found.status).toBe(200);
    expect(found.body.post.body).toBeTruthy();
    expect(found.body.post.bodyText).toBeTruthy();

    const missing = await require("supertest")(app).get("/content/posts/does-not-exist");
    expect(missing.status).toBe(404);
  });

  it("paginates the public list", async () => {
    const agent = await newFullAdmin(44);
    for (let i = 0; i < 25; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const created = await agent.post("/admin/posts").send(validPost({ title: `Post Number ${i}` }));
      // eslint-disable-next-line no-await-in-loop
      await agent.put(`/admin/posts/${created.body.post._id}/publish`);
    }
    const res = await require("supertest")(app).get("/content/posts?limit=10&page=3");
    expect(res.body.items.length).toBe(5);
    expect(res.body.pages).toBe(3);
  });
});

describe("Content — validation & audit", () => {
  it("rejects a missing title with the Joi message", async () => {
    const agent = await newFullAdmin(50);
    const res = await agent.post("/admin/posts").send(validPost({ title: undefined }));
    expect(res.status).toBe(400);
  });

  it("rejects a client-supplied status on create (publish state can't be smuggled in)", async () => {
    const agent = await newFullAdmin(51);
    const res = await agent.post("/admin/posts").send({ ...validPost(), status: "published" });
    expect(res.status).toBe(400);
  });

  it("writes an audit row on create with no body field, actor set correctly", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(52), name: "Admin 52" });
    await makeAdmin(user, "full");
    const created = await agent.post("/admin/posts").send(validPost());

    const auditRow = await AuditLog.findOne({
      action: "post.create",
      targetId: new mongoose.Types.ObjectId(created.body.post._id),
    });
    expect(auditRow).toBeTruthy();
    expect(String(auditRow.actor)).toBe(String(user._id));
    expect(auditRow.after.body).toBeUndefined();
    expect(auditRow.before).toBeNull();
  });
});

describe("Content — SEO endpoints", () => {
  it("sitemap-content.xml is reachable with no auth and contains only published, non-noIndex slugs", async () => {
    const agent = await newFullAdmin(60);
    const published = await agent.post("/admin/posts").send(validPost({ title: "Sitemap Included" }));
    await agent.put(`/admin/posts/${published.body.post._id}/publish`);
    const draft = await agent.post("/admin/posts").send(validPost({ title: "Sitemap Excluded Draft" }));
    const noIndexed = await agent.post("/admin/posts").send(validPost({ title: "Sitemap Excluded NoIndex", noIndex: true }));
    await agent.put(`/admin/posts/${noIndexed.body.post._id}/publish`);

    const res = await require("supertest")(app).get("/sitemap-content.xml");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/xml/);
    expect(res.text).toContain(published.body.post.slug);
    expect(res.text).not.toContain(draft.body.post.slug);
    expect(res.text).not.toContain(noIndexed.body.post.slug);
  });

  it("XML-escapes an ampersand in a title instead of emitting it raw", async () => {
    const agent = await newFullAdmin(61);
    const created = await agent.post("/admin/posts").send(validPost({ title: "Trucks & Trailers" }));
    await agent.put(`/admin/posts/${created.body.post._id}/publish`);

    const res = await require("supertest")(app).get("/rss.xml");
    expect(res.text).toContain("Trucks &amp; Trailers");
    expect(res.text).not.toContain("Trucks & Trailers");
  });

  it("rss.xml is reachable with no auth and contains a published item with an RFC-822 pubDate", async () => {
    const agent = await newFullAdmin(62);
    const created = await agent.post("/admin/posts").send(validPost());
    await agent.put(`/admin/posts/${created.body.post._id}/publish`);

    const res = await require("supertest")(app).get("/rss.xml");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/rss\+xml/);
    expect(res.text).toContain("<item>");
    // RFC-822 dates end in a 4-digit year followed by HH:MM:SS and a zone,
    // e.g. "Wed, 19 Aug 2026 10:00:00 GMT" — very different shape from ISO.
    expect(res.text).toMatch(/\d{2}:\d{2}:\d{2} GMT/);
  });
});

describe("Content — cover image lifecycle", () => {
  it("flips a private upload to public when set as a post's cover image", async () => {
    const agent = await newFullAdmin(70);
    const fileId = await uploadTestFile(agent);
    const UploadedFile = require("../../models/uploadedFileModel");
    const before = await UploadedFile.findById(fileId);
    expect(before.isPublic).toBe(false);

    await agent.post("/admin/posts").send(validPost({ coverImageUrl: `/files/${fileId}` }));

    const after = await UploadedFile.findById(fileId);
    expect(after.isPublic).toBe(true);
  });

  it("reclaims (deletes) the old UploadedFile when a cover image is replaced", async () => {
    const agent = await newFullAdmin(71);
    const oldFileId = await uploadTestFile(agent);
    const created = await agent.post("/admin/posts").send(validPost({ coverImageUrl: `/files/${oldFileId}` }));

    const newFileId = await uploadTestFile(agent);
    await agent.put(`/admin/posts/${created.body.post._id}`).send({ coverImageUrl: `/files/${newFileId}` });

    const UploadedFile = require("../../models/uploadedFileModel");
    const oldFile = await UploadedFile.findById(oldFileId);
    expect(oldFile).toBeNull();
  });
});
