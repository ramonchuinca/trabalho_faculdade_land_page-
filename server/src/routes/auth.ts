import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/User.js";
import { HttpError } from "../lib/httpError.js";
import { requireAuth, signToken, type AuthPayload } from "../middleware/auth.js";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.email(),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres"),
  cpf: z.string().trim().optional(),
  phone: z.string().trim().optional(),
});

const loginSchema = z.object({ email: z.email(), password: z.string().min(1) });

const publicUser = (u: { _id: unknown; name: string; email: string; role: string; cpf?: string | null; phone?: string | null }) => ({
  id: String(u._id),
  name: u.name,
  email: u.email,
  role: u.role,
  cpf: u.cpf ?? null,
  phone: u.phone ?? null,
});

// Cadastro público cria SEMPRE um paciente. Médicos/admins são criados por um admin.
authRouter.post("/register", async (req, res) => {
  const data = registerSchema.parse(req.body);
  if (await User.exists({ email: data.email.toLowerCase() })) {
    throw new HttpError(409, "Este e-mail já está cadastrado");
  }
  const user = await User.create({
    name: data.name,
    email: data.email,
    cpf: data.cpf,
    phone: data.phone,
    passwordHash: await bcrypt.hash(data.password, 12),
    role: "patient",
  });
  res.status(201).json({ token: signToken({ sub: String(user._id), role: "patient" }), user: publicUser(user) });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!user || !ok) throw new HttpError(401, "E-mail ou senha incorretos");
  res.json({ token: signToken({ sub: String(user._id), role: user.role as AuthPayload["role"] }), user: publicUser(user) });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.auth!.sub);
  if (!user) throw new HttpError(401, "Usuário não encontrado");
  res.json({ user: publicUser(user) });
});
