import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./db.js";
import postRoutes from "./routes/postRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();

// Middleware order yang benar
app.use(cors());

// Parse JSON dan form-data dengan conditional
app.use((req, res, next) => {
  const contentType = req.get('Content-Type');

  if (contentType && contentType.includes('application/json')) {
    express.json()(req, res, next);
  } else if (contentType && contentType.includes('application/x-www-form-urlencoded')) {
    express.urlencoded({ extended: true })(req, res, next);
  } else if (contentType && contentType.includes('multipart/form-data')) {
    // Handle multipart/form-data (form-data)
    express.urlencoded({ extended: true })(req, res, next);
  } else {
    next();
  }
});

app.use("/api/posts", postRoutes);
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
const URI = process.env.MONGODB_URI;

if (!URI) {
  console.error("❌ MONGODB_URI missing from .env");
  process.exit(1);
}

(async () => {
  try {
    await connectDB(URI);
    app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
  } catch (err) {
    console.error("❌ Mongo connection error:", err.message);
    process.exit(1);
  }
})();