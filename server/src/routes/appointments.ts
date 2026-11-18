import { Router } from "express";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { Appointment, CONFIRM_CHANNELS } from "../models/Appointment.js";
import { Doctor } from "../models/Doctor.js";
import { Message } from "../models/Message.js";
import { Service } from "../models/Service.js";
import { HttpError } from "../lib/httpError.js";
import { candidateSlots, clinicDateOf } from "../lib/slots.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

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
  const isAdmin = req.auth!.role === "admin";
  const query = Appointment.find(isAdmin ? {} : { patient: req.auth!.sub })
    .sort("-start")
    .populate("doctor", "name specialty photoUrl")
    .populate("service", "name price durationMin icon");
  // A recepção precisa do contato do paciente para confirmar por telefone/WhatsApp.
  if (isAdmin) query.populate("patient", "name phone email");
  res.json(await query);
});

const confirmSchema = z.object({ channel: z.enum(CONFIRM_CHANNELS).default("other") });

// Recepção confirma o agendamento depois de falar com o paciente.
appointmentsRouter.patch("/:id/confirm", requireRole("admin"), async (req, res) => {
  const id = String(req.params.id);
  if (!isValidObjectId(id)) throw new HttpError(404, "Consulta não encontrada");
  const { channel } = confirmSchema.parse(req.body ?? {});
  // Atualização condicional e atômica: evita confirmar duas vezes ou confirmar consulta cancelada.
  const appt = await Appointment.findOneAndUpdate(
    { _id: id, status: "scheduled", confirmedAt: null },
    { confirmedAt: new Date(), confirmedBy: req.auth!.sub, confirmChannel: channel },
    { new: true },
  );
  if (!appt) throw new HttpError(400, "Consulta não encontrada, já confirmada ou não está mais agendada");
  res.json(appt);
});

const rescheduleSchema = z.object({
  start: z.iso.datetime({ offset: true }),
  // Se a atendente já combinou o novo horário com o paciente, marca como confirmada na hora.
  confirmChannel: z.enum(CONFIRM_CHANNELS).optional(),
});

const fmtWhen = (d: Date) =>
  d.toLocaleString("pt-BR", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

// Recepção remarca a consulta para outro horário livre do mesmo médico.
appointmentsRouter.patch("/:id/reschedule", requireRole("admin"), async (req, res) => {
  const id = String(req.params.id);
  if (!isValidObjectId(id)) throw new HttpError(404, "Consulta não encontrada");
  const { start, confirmChannel } = rescheduleSchema.parse(req.body);

  const appt = await Appointment.findById(id).populate("service", "name");
  if (!appt) throw new HttpError(404, "Consulta não encontrada");
  if (appt.status !== "scheduled") throw new HttpError(400, "Só é possível remarcar consultas agendadas");
  const doctor = await Doctor.findOne({ _id: appt.doctor, active: true });
  if (!doctor) throw new HttpError(404, "Médico não encontrado");

  const startDate = new Date(start);
  if (startDate.getTime() === appt.start.getTime()) throw new HttpError(400, "Escolha um horário diferente do atual");
  const valid = candidateSlots(doctor, clinicDateOf(startDate)).some((s) => s.getTime() === startDate.getTime());
  if (!valid || startDate.getTime() <= Date.now()) throw new HttpError(400, "Horário indisponível");

  const previous = appt.start;
  const now = new Date();
  try {
    // Condicional em status: não remarca algo cancelado no meio do caminho. O índice único (doctor+start)
    // continua sendo a trava contra dois pacientes no mesmo horário.
    const updated = await Appointment.findOneAndUpdate(
      { _id: id, status: "scheduled" },
      {
        start: startDate,
        end: new Date(startDate.getTime() + doctor.slotMinutes * 60_000),
        confirmedAt: confirmChannel ? now : null,
        confirmedBy: confirmChannel ? req.auth!.sub : null,
        confirmChannel: confirmChannel ?? null,
        $push: { reschedules: { from: previous, at: now, by: req.auth!.sub } },
      },
      { new: true },
    );
    if (!updated) throw new HttpError(400, "A consulta não está mais agendada");

    // Avisa o paciente no chat (aparece como mensagem nova para ele).
    const serviceName = (appt.service as unknown as { name: string }).name;
    await Message.create({
      patient: appt.patient,
      from: "staff",
      sender: req.auth!.sub,
      text: `Sua consulta de ${serviceName} com ${doctor.name} foi reagendada de ${fmtWhen(previous)} para ${fmtWhen(startDate)}.${
        confirmChannel ? "" : " Por favor, confirme respondendo por aqui."
      }`,
    });
    res.json(updated);
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw new HttpError(409, "Esse horário acabou de ser reservado. Escolha outro.");
    }
    throw err;
  }
});

appointmentsRouter.patch("/:id/complete", requireRole("admin"), async (req, res) => {
  const id = String(req.params.id);
  if (!isValidObjectId(id)) throw new HttpError(404, "Consulta não encontrada");
  const appt = await Appointment.findOneAndUpdate(
    { _id: id, status: "scheduled" },
    { status: "completed" },
    { new: true },
  );
  if (!appt) throw new HttpError(400, "Consulta não encontrada ou não está mais agendada");
  res.json(appt);
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
