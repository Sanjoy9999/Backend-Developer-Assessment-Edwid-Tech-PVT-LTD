import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import routes from "./routes/index.js";
import errorHandler from "./utils/errorHandler.js";
import { connectDB } from "./db/postgres.js";
import { connectRedis } from "./services/redisService.js";
import { initCollection } from "./services/qdrantService.js";

const app = express();

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(limiter); // Apply rate limiting to all requests

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Initialize Services
const initServices = async () => {
  await connectDB();
  await connectRedis();
  await initCollection(); // Ensure vector DB(Qdrant) is ready
};

// Start services but don't block app export (server.js will wait or we handle async start there)
// Better to call initServices in server.js
app.initServices = initServices;

// Routes
app.use("/api", routes);

// Health check
app.get("/", (req, res) => {
  res.send("News RAG API is running");
});

// Error Handler
app.use(errorHandler);

export default app;
