import mongoSanitize from "@exortek/express-mongo-sanitize";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import hpp from "hpp";
import morgan from "morgan";
import { errorHandler } from "./middleware/error.middleware.js";
import apiRoutes from "./routes/index.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet());
app.use(morgan("dev"));
app.use(cookieParser());
app.use(hpp());
app.use(mongoSanitize());
app.use(
  cors({
    origin: ["http://localhost:3000", "https://akod-erp.vercel.app"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10kb" }));

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api/v1/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api/v1", apiRoutes);
app.use(errorHandler);
app.get("/", (req, res) => res.send("AKOD Backend Running"));

export default app;
