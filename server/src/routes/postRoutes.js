import { Router } from "express";
import { Post } from "../models/Post.js";

const router = Router();

/**
 * GET /api/posts
 * Query: q (search), page, limit, tag
 */
router.get("/", async (req, res, next) => {
    try {
        const { q, tag, page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        let filter = {};
        let projection = {};
        let sort = { createdAt: -1 };

        if (tag) filter.tags = tag;

        if (q && q.trim()) {
            // cari pakai text index
            filter.$text = { $search: q.trim() };
            projection = { score: { $meta: "textScore" } };
            sort = { score: { $meta: "textScore" } };
        }

        // query utama
        let query = Post.find(filter, projection).sort(sort).skip(skip).limit(Number(limit));
        let [items, total] = await Promise.all([
            query,
            Post.countDocuments(filter)
        ]);

        // fallback: jika pakai $text tapi hasil 0, coba regex (case-insensitive)
        if (q && q.trim() && items.length === 0) {
            const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            const rxFilter = {
                ...(tag ? { tags: tag } : {}),
                $or: [{ title: rx }, { content: rx }, { tags: rx }]
            };
            items = await Post.find(rxFilter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit));
            total = await Post.countDocuments(rxFilter);
        }

        res.json({
            items,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)) || 1,
            total
        });
    } catch (e) {
        next(e);
    }
});


// server/src/routes/postRoutes.js
router.get("/:id", async (req, res, next) => {
    try {
        const id = req.params.id;
        let doc;

        // Check if id is numeric (sequential) or ObjectID
        if (/^\d+$/.test(id)) {
            doc = await Post.findOne({ postId: parseInt(id) });
        } else {
            doc = await Post.findById(id);
        }

        if (!doc) return res.status(404).json({ error: "Post not found" });
        res.json(doc);
    } catch (e) {
        next(e);
    }
});

/** POST /api/posts */
router.post("/", async (req, res, next) => {
    try {
        // Debug: Log received data
        console.log("📝 Received data:", req.body);
        console.log("📝 Content-Type:", req.get('Content-Type'));
        console.log("📝 Raw body:", req.body);

        const { title, content, author, tags, published } = req.body;

        // Debug individual fields
        console.log("📝 Parsed fields:", { title, content, author, tags, published });

        if (!title || !content) {
            console.log("❌ Missing required fields:", { title, content });
            return res.status(400).json({ error: "title and content are required" });
        }

        // Handle published field conversion from string to boolean
        let publishedValue = published;
        if (typeof published === "string") {
            publishedValue = published.toLowerCase() === "true";
        }

        console.log("📝 Creating post with:", {
            title, content, author,
            tags: Array.isArray(tags) ? tags : (typeof tags === "string" ? tags.split(",").map(s => s.trim()).filter(Boolean) : []),
            published: publishedValue
        });

        const doc = await Post.create({
            title,
            content,
            author,
            tags: Array.isArray(tags)
                ? tags
                : (typeof tags === "string" ? tags.split(",").map(s => s.trim()).filter(Boolean) : []),
            published: publishedValue
        });

        console.log("✅ Created post:", doc);
        res.status(201).json(doc);
    } catch (e) {
        console.error("❌ Error creating post:", e);
        next(e);
    }
});

// server/src/routes/postRoutes.js
router.put("/:id", async (req, res, next) => {
    try {
        const id = req.params.id;
        let doc;

        // Check if id is numeric (sequential) or ObjectID
        if (/^\d+$/.test(id)) {
            doc = await Post.findOne({ postId: parseInt(id) });
        } else {
            doc = await Post.findById(id);
        }

        if (!doc) return res.status(404).json({ error: "Post not found" });

        const { title, content, author, tags, published } = req.body;

        // Handle published field conversion
        let publishedValue = published;
        if (typeof published === "string") {
            publishedValue = published.toLowerCase() === "true";
        }

        if (title !== undefined) doc.title = title;
        if (content !== undefined) doc.content = content;
        if (author !== undefined) doc.author = author;
        if (published !== undefined) doc.published = publishedValue;
        if (tags !== undefined) {
            doc.tags = Array.isArray(tags)
                ? tags
                : (typeof tags === "string"
                    ? tags.split(",").map(s => s.trim()).filter(Boolean)
                    : []);
        }

        const saved = await doc.save();
        res.json(saved);
    } catch (e) {
        next(e);
    }
});

/** DELETE /api/posts/:id */
router.delete("/:id", async (req, res, next) => {
    try {
        const id = req.params.id;
        let doc;

        // Check if id is numeric (sequential) or ObjectID
        if (/^\d+$/.test(id)) {
            doc = await Post.findOneAndDelete({ postId: parseInt(id) });
        } else {
            doc = await Post.findByIdAndDelete(id);
        }

        if (!doc) return res.status(404).json({ error: "Post not found" });
        res.json({ ok: true });
    } catch (e) {
        next(e);
    }
});

export default router;
