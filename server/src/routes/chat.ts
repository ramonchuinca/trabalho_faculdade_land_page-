import { Router } from "express";
import { isValidObjectId, Types } from "mongoose";
import { z } from "zod";
import { Message } from "../models/Message.js";
import { User } from "../models/User.js";
import { HttpError } from "../lib/httpError.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

// Chat paciente <-> recepção (admin). Sem websocket: o front faz polling curto.
export const chatRouter = Router();
chatRouter.use(requireAuth);

const sendSchema = z.object({ text: z.string().trim().min(1, "Digite uma mensagem").max(1000) });
const LIMIT = 200;

// ---- Lado do paciente (sua própria conversa) ----
const onlyPatient = requireRole("patient");

chatRouter.get("/", onlyPatient, async (req, res) => {
  const patient = req.auth!.sub;
  const messages = await Message.find({ patient }).sort("-createdAt").limit(LIMIT);
  await Message.updateMany({ patient, from: "staff", readAt: null }, { readAt: new Date() });
  res.json(messages.reverse());
});

chatRouter.post("/", onlyPatient, async (req, res) => {
  const { text } = sendSchema.parse(req.body);
  const msg = await Message.create({ patient: req.auth!.sub, from: "patient", sender: req.auth!.sub, text });
  res.status(201).json(msg);
});

// ---- Contagem de não lidas (paciente: respostas da recepção; admin: mensagens de pacientes) ----
chatRouter.get("/unread", async (req, res) => {
  const filter =
    req.auth!.role === "admin"
      ? { from: "patient" as const, readAt: null }
      : { patient: req.auth!.sub, from: "staff" as const, readAt: null };
  res.json({ count: await Message.countDocuments(filter) });
});

// ---- Lado da recepção ----
const onlyAdmin = requireRole("admin");

chatRouter.get("/inbox", onlyAdmin, async (_req, res) => {
  const rows = await Message.aggregate([
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$patient",
        last: { $first: "$$ROOT" },
        unread: { $sum: { $cond: [{ $and: [{ $eq: ["$from", "patient"] }, { $eq: ["$readAt", null] }] }, 1, 0] } },
      },
    },
    { $sort: { "last.createdAt": -1 } },
    { $limit: 100 },
  ]);
  const users = await User.find({ _id: { $in: rows.map((r) => r._id) } }, "name phone email");
  const byId = new Map(users.map((u) => [String(u._id), u]));
  res.json(
    rows.map((r) => ({
      patient: byId.get(String(r._id)) ?? { _id: r._id, name: "Paciente removido" },
      last: { text: r.last.text, from: r.last.from, createdAt: r.last.createdAt },
      unread: r.unread,
    })),
  );
});

function patientParam(id: string) {
  if (!isValidObjectId(id)) throw new HttpError(404, "Paciente não encontrado");
  return new Types.ObjectId(id);
}

chatRouter.get("/inbox/:patientId", onlyAdmin, async (req, res) => {
  const patient = patientParam(String(req.params.patientId));
  const [messages, user] = await Promise.all([
    Message.find({ patient }).sort("-createdAt").limit(LIMIT),
    User.findById(patient, "name phone email"),
  ]);
  if (!user) throw new HttpError(404, "Paciente não encontrado");
  await Message.updateMany({ patient, from: "patient", readAt: null }, { readAt: new Date() });
  res.json({ patient: user, messages: messages.reverse() });
});

chatRouter.post("/inbox/:patientId", onlyAdmin, async (req, res) => {
  const patient = patientParam(String(req.params.patientId));
  const { text } = sendSchema.parse(req.body);
  const user = await User.findOne({ _id: patient, role: "patient" });
  if (!user) throw new HttpError(404, "Paciente não encontrado");
  const msg = await Message.create({ patient, from: "staff", sender: req.auth!.sub, text });
  res.status(201).json(msg);
});
