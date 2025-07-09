import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();
import responseTime from "response-time";
import { requestIdMiddleware } from "./middlewares/requestId.js";
import { requestContextMiddleware } from "./utils/requestContext.js";
import { morganMiddleware } from "./middlewares/morganRequestLogger.js";
import db from "./config/postgresDB.js";
import userRoutes from "./routes/userRoutes.js";
import tokenRoutes from "./routes/tokenRoutes.js";
import promptRoutes from "./routes/promptRoutes.js";
import extensionRoutes from "./routes/extensionRoutes.js";

const app = express();

const gatewayIP = "172.18.0.1";
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", gatewayIP);
} else {
  app.set("trust proxy", false);
}

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(responseTime());

// Add request ID middleware (must be before other middleware that uses it)
app.use(requestIdMiddleware);
app.use(requestContextMiddleware);
app.use(morganMiddleware);

// Configure CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://thinkvelocity.in",
      "http://localhost:3002",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
    credentials: true,
    exposedHeaders: ["set-cookie"],
  })
);

app.use((req, res, next) => {
  // Set Cross-Origin-Opener-Policy header
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});

// Routes
app.use("/", userRoutes);
app.use("/token", tokenRoutes);
app.use("/prompt", promptRoutes);
app.use("/extension", extensionRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); //Serve images

// app.get("*", (req, res, next) => {
//   console.log("Request path:", req.path);
//   next();
// });

// app.use((req, res, next) => {
//   console.log("Incoming request:", {
//     url: req.url,
//     path: req.path,
//     method: req.method,
//     headers: req.headers,
//   });
//   next();
// });

app.get("/", (req, res) => {
  res.json({ message: "API is working!" });
});

// app.get("/testip", (req, res) => {
//   res.json(`Your IP is ${req.ip}`);
// });

const PORT = process.env.APP_PORT || 3005;
const HOST = process.env.HOST || "localhost";

const initializeBackend = async () => {
  try {
    // database connection
    const client = await db.connect();
    console.log("Connected to Postgres Database successfully");
    client.release();
    // Start server
    app.listen(PORT, () => {
      console.log(
        `Backend V1 Server is running on port http://${HOST}:${PORT}`
      );
    });
  } catch (error) {
    console.error("Failed to initialize backend:", error);
    process.exit(1);
  }
};

initializeBackend();
