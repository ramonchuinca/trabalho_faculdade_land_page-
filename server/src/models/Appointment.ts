import { Schema, model } from "mongoose";

export const STATUSES = ["scheduled", "cancelled", "completed"] as const;
export const CONFIRM_CHANNELS = ["phone", "whatsapp", "chat", "other"] as const;

const appointmentSchema = new Schema(
  {
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    service: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    status: { type: String, enum: STATUSES, default: "scheduled" },
    notes: { type: String, default: "" },
    // Confirmação pela recepção. O status continua "scheduled" de propósito: o índice único
    // abaixo só protege o horário enquanto status === "scheduled".
    confirmedAt: { type: Date, default: null },
    confirmedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    confirmChannel: { type: String, enum: CONFIRM_CHANNELS, default: null },
    // Histórico de remarcações feitas pela recepção (imprevistos do paciente ou da clínica).
    reschedules: {
      type: [{ from: { type: Date, required: true }, at: { type: Date, required: true }, by: { type: Schema.Types.ObjectId, ref: "User" }, _id: false }],
      default: [],
    },
  },
  { timestamps: true },
);

// Impede dois agendamentos ativos no mesmo horário do mesmo médico (anti double-booking).
appointmentSchema.index(
  { doctor: 1, start: 1 },
  { unique: true, partialFilterExpression: { status: "scheduled" } },
);

export const Appointment = model("Appointment", appointmentSchema);
