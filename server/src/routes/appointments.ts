import { Router } from "express";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { Appointment } from "../models/Appointment.js";
import { Doctor } from "../models/Doctor.js";
import { Service } from "../models/Service.js";
import { HttpError } from "../lib/httpError.js";
import { candidateSlots, clinicDateOf } from "../lib/slots.js";
import { requireAuth } from "../middleware/auth.js";

export const appointmentsRouter = Router();
appointmentsRouter.use(requireAuth);

const createSchema = z.object({
  doctorId: z.string(),
  serviceId: z.string(),
  start: z.iso.datetime({ offset: true }),
  notes: z.string().max(500).optional(),
});

// Paciente vê só as próprias consultas; admin vê todas (base do futuro painel do hospital).
appointmentsRouter.get("/", async (req, res) => {
  const filter = req.auth!.role === "admin" ? {} : { patient: req.auth!.sub };
  const list = await Appointment.find(filter)
    .sort("-start")
    .populate("doctor", "name specialty photoUrl")
    .populate("service", "name price durationMin icon");
  res.json(list);
});

appointmentsRouter.post("/", async (req, res) => {
  const { doctorId, serviceId, start, notes } = createSchema.parse(req.body);
  if (!isValidObjectId(doctorId) || !isValidObjectId(serviceId)) throw new HttpError(400, "IDs inválidos");

  const [doctor, service] = await Promise.all([
    Doctor.findOne({ _id: doctorId, active: true }),
    Service.findOne({ _id: serviceId, active: true }),
  ]);
  if (!doctor || !service) throw new HttpError(404, "Médico ou serviço não encontrado");
  if (!doctor.services.some((s) => String(s) === serviceId)) {
    throw new HttpError(400, "Este médico não realiza o serviço escolhido");
  }

  // O horário precisa ser exatamente um dos slots do médico e estar no futuro.
  const startDate = new Date(start);
  const valid = candidateSlots(doctor, clinicDateOf(startDate)).some((s) => s.getTime() === startDate.getTime());
  if (!valid || startDate.getTime() <= Date.now()) throw new HttpError(400, "Horário indisponível");

  try {
    const appt = await Appointment.create({
      patient: req.auth!.sub,
      doctor: doctor._id,
      service: service._id,
      start: startDate,
      end: new Date(startDate.getTime() + doctor.slotMinutes * 60_000),
      notes,
    });
    res.status(201).json(appt);
  } catch (err) {
    // Índice único (doctor + start): outra pessoa reservou no mesmo instante.
    if ((err as { code?: number }).code === 11000) {
      throw new HttpError(409, "Esse horário acabou de ser reservado. Escolha outro.");
    }
    throw err;
  }
});

appointmentsRouter.patch("/:id/cancel", async (req, res) => {
  const id = String(req.params.id);
  if (!isValidObjectId(id)) throw new HttpError(404, "Consulta não encontrada");
  const appt = await Appointment.findById(id);
  if (!appt) throw new HttpError(404, "Consulta não encontrada");
  if (req.auth!.role !== "admin" && String(appt.patient) !== req.auth!.sub) throw new HttpError(403, "Sem permissão");
  if (appt.status !== "scheduled") throw new HttpError(400, "Só é possível cancelar consultas agendadas");
  appt.status = "cancelled";
  await appt.save();
  res.json(appt);
});
