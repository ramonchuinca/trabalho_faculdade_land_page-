import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../lib/httpError.js";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ message: "Rota não encontrada" });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) return res.status(err.status).json({ message: err.message });
  if (err instanceof ZodError) {
    return res.status(400).json({ message: "Dados inválidos", issues: err.issues });
  }
  console.error(err);
  res.status(500).json({ message: "Erro interno do servidor" });
}
