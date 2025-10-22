// server/src/models/Post.js
import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  postId: { type: Number, unique: true },
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  author: { type: String, default: "Anonymous", trim: true },
  tags: [{ type: String, trim: true }],
  published: { type: Boolean, default: true },
  slug: { type: String, trim: true }
}, { timestamps: true });

// Perbaiki auto-increment logic
postSchema.pre('save', async function (next) {
  if (this.isNew && !this.postId) {
    try {
      // Cari post dengan postId tertinggi
      const lastPost = await this.constructor.findOne({}, {}, { sort: { postId: -1 } });
      this.postId = lastPost ? lastPost.postId + 1 : 1;
      console.log("🔢 Generated postId:", this.postId);
    } catch (error) {
      console.error("❌ Error generating postId:", error);
      this.postId = 1; // fallback
    }
  }
  next();
});

// index untuk search dan filter
postSchema.index({ title: "text", content: "text" });
postSchema.index({ tags: 1 });

// unique slug HANYA untuk dokumen yang punya slug (bukan null/undefined)
postSchema.index(
  { slug: 1 },
  { unique: true, partialFilterExpression: { slug: { $exists: true, $type: "string" } } }
);

// util sederhana bikin slug
function slugify(str = "") {
  return str
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// generate slug otomatis saat create / ketika title berubah
postSchema.pre("save", async function (next) {
  if (!this.isModified("title")) return next();
  const base = slugify(this.title);
  if (!base) return next();

  let candidate = base, n = 1;
  while (await mongoose.models.Post.exists({ slug: candidate })) {
    candidate = `${base}-${n++}`;
  }
  this.slug = candidate;
  next();
});

export const Post = mongoose.model("Post", postSchema);