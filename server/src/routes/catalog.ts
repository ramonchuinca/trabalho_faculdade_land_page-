import { Router } from "express";
import { isValidObjectId } from "mongoose";
import { Service } from "../models/Service.js";
import { Doctor } from "../models/Doctor.js";
import { HttpError } from "../lib/httpError.js";
import { DATE_RE, availableSlots } from "../lib/slots.js";

// Catálogo público: serviços, médicos e horários livres.
export const catalogRouter = Router();

catalogRouter.get("/services", async (_req, res) => {
  res.json(await Service.find({ active: true }).sort("name"));
});

catalogRouter.get("/doctors", async (req, res) => {
  const filter: Record<string, unknown> = { active: true };
  if (typeof req.query.service === "string" && isValidObjectId(req.query.service)) {
    filter.services = req.query.service;
  }
  res.json(await Doctor.find(filter).sort("name"));
});

catalogRouter.get("/doctors/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!isValidObjectId(id)) throw new HttpError(404, "Médico não encontrado");
  const doctor = await Doctor.findOne({ _id: id, active: true }).populate("services");
  if (!doctor) throw new HttpError(404, "Médico não encontrado");
  res.json(doctor);
});

catalogRouter.get("/doctors/:id/slots", async (req, res) => {
  const id = String(req.params.id);
  const date = String(req.query.date ?? "");
  if (!DATE_RE.test(date)) throw new HttpError(400, "Informe a data no formato AAAA-MM-DD");
  if (!isValidObjectId(id)) throw new HttpError(404, "Médico não encontrado");
  const doctor = await Doctor.findOne({ _id: id, active: true });
  if (!doctor) throw new HttpError(404, "Médico não encontrado");
  const slots = await availableSlots(doctor, date);
  res.json({ date, slots: slots.map((s) => s.toISOString()) });
});
