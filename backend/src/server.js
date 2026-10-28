import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import MongoStore from "connect-mongo";
import { connectDatabase } from "./config/database.js";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";


import adminRoutes from "./routes/adminRoutes.js";

import paymentRoutes, { reconcilePendingPayments } from "./routes/paymentRoutes.js";
import { cashfreeConfigured } from "./services/cashfree.js";
import { uploadDir } from "./middleware/upload.js";

const app = express();
app.set("trust proxy", 1); // needed on Render so secure cookies work behind the proxy
const port = process.env.PORT || 5000;

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map(o => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

// Allows every Vercel deploy URL of this account (Vercel creates a new URL per deploy).
const vercelPattern = /^https:\/\/[a-z0-9-]+-mahidharshan\.vercel\.app$/;

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || vercelPattern.test(origin)) {
      return cb(null, true);
    }
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.urlencoded({ extended: true }));

app.use(express.json({ limit: "1mb" }));
app.use(session({
  name: "shopsphere.sid",
  secret: process.env.SESSION_SECRET || "development-only-change-this-secret",
  resave: false,
  saveUninitialized: false,
  store: process.env.MONGODB_URI ? MongoStore.create({ mongoUrl: process.env.MONGODB_URI, collectionName: "sessions" }) : undefined,
  cookie: {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

// Photos uploaded from the Sell page are served from here (stored in backend/uploads).
app.use("/uploads", express.static(uploadDir, {
  maxAge: "7d",
  setHeaders: res => res.setHeader("X-Content-Type-Options", "nosniff")
}));

app.get("/", (_req, res) => res.json({ status: "ok", app: "ShopSphere API" }));
app.get("/api/", (_req, res) => res.json({ status: "ok", app: "ShopSphere API Running Perfect" }));
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === 11000) return res.status(409).json({ message: "That email is already registered." });
  if (err.name === "ValidationError") return res.status(400).json({ message: Object.values(err.errors)[0]?.message || "Invalid data." });
  if (err.name === "CastError") return res.status(400).json({ message: "Invalid request." });
  res.status(500).json({ message: "Something went wrong on the server." });
});

connectDatabase().then(() => {
  app.listen(port, () => console.log(`ShopSphere API running at http://localhost:${port}`));
  if (cashfreeConfigured()) {
    // Every 5 minutes: settle payments the customer never came back to confirm.
    setInterval(() => reconcilePendingPayments().catch(err => console.error(err.message)), 5 * 60 * 1000).unref();
  } else {
    console.warn("Cashfree keys are missing: online payment is disabled.");
  }
}).catch(err => {
  console.error("Database connection failed:", err.message);
  process.exit(1);
});
