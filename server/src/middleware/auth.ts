import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env.js";
import { HttpError } from "../lib/httpError.js";

export interface AuthPayload {
  sub: string;
  role: "patient" | "doctor" | "admin";
}

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthPayload;
  }
}

export const signToken = (payload: AuthPayload) =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new HttpError(401, "Não autenticado");
  try {
    req.auth = jwt.verify(header.slice(7), env.JWT_SECRET) as unknown as AuthPayload;
  } catch {
    throw new HttpError(401, "Sessão inválida ou expirada");
  }
  next();
}

export const requireRole =
  (...roles: AuthPayload["role"][]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) throw new HttpError(403, "Sem permissão");
    next();
  };
