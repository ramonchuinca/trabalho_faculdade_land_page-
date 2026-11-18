import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./env.js";
import { authRouter } from "./routes/auth.js";
import { catalogRouter } from "./routes/catalog.js";
import { appointmentsRouter } from "./routes/appointments.js";
import { chatRouter } from "./routes/chat.js";
import { errorHandler, notFound } from "./middleware/error.js";

export const app = express();

app.set("trust proxy", 1); // Render fica atrás de proxy
app.use(helmet());
// Sem barra final: o header Origin do navegador nunca a traz, e "https://x.app/" não casaria.
const allowedOrigins = env.CLIENT_ORIGIN.split(",").map((o) => o.trim().replace(/\/+$/, "")).filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Limite nas rotas de login/cadastro contra força bruta.
app.use(
  "/api/auth",
  rateLimit({ windowMs: 15 * 60_000, limit: 50, standardHeaders: true, legacyHeaders: false }),
  authRouter,
);
app.use("/api", catalogRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/chat", chatRouter);

app.use(notFound);
app.use(errorHandler);
