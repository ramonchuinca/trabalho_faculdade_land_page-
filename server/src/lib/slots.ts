import { Appointment } from "../models/Appointment.js";
import type { Types } from "mongoose";

// Clínica opera no horário de Brasília (UTC-3, sem horário de verão desde 2019).
export const TZ_OFFSET = "-03:00";
export const TZ_OFFSET_HOURS = 3;

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const atClinicTime = (date: string, minutes: number) => {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return new Date(`${date}T${hh}:${mm}:00${TZ_OFFSET}`);
};

/** Data (AAAA-MM-DD) de um instante, no fuso da clínica. */
export const clinicDateOf = (d: Date) =>
  new Date(d.getTime() - TZ_OFFSET_HOURS * 3600_000).toISOString().slice(0, 10);

interface DoctorLike {
  _id: Types.ObjectId;
  slotMinutes: number;
  workingHours: { weekday: number; start: string; end: string }[];
}

/** Todos os horários possíveis do médico no dia, sem considerar ocupação. */
export function candidateSlots(doctor: DoctorLike, date: string): Date[] {
  const weekday = new Date(`${date}T12:00:00${TZ_OFFSET}`).getUTCDay();
  const slots: Date[] = [];
  for (const wh of doctor.workingHours.filter((w) => w.weekday === weekday)) {
    for (let t = toMinutes(wh.start); t + doctor.slotMinutes <= toMinutes(wh.end); t += doctor.slotMinutes) {
      slots.push(atClinicTime(date, t));
    }
  }
  return slots.sort((a, b) => a.getTime() - b.getTime());
}

/** Horários livres: no futuro e sem agendamento ativo. */
export async function availableSlots(doctor: DoctorLike, date: string): Promise<Date[]> {
  const candidates = candidateSlots(doctor, date);
  if (candidates.length === 0) return [];

  const booked = await Appointment.find({
    doctor: doctor._id,
    status: "scheduled",
    start: { $gte: candidates[0], $lte: candidates[candidates.length - 1] },
  }).select("start");
  const taken = new Set(booked.map((a) => a.start.getTime()));
  const now = Date.now();

  return candidates.filter((s) => s.getTime() > now && !taken.has(s.getTime()));
}
