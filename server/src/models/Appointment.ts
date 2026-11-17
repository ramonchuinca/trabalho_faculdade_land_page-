import { Schema, model } from "mongoose";

export const STATUSES = ["scheduled", "cancelled", "completed"] as const;

const appointmentSchema = new Schema(
  {
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    service: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    status: { type: String, enum: STATUSES, default: "scheduled" },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

// Impede dois agendamentos ativos no mesmo horário do mesmo médico (anti double-booking).
appointmentSchema.index(
  { doctor: 1, start: 1 },
  { unique: true, partialFilterExpression: { status: "scheduled" } },
);

export const Appointment = model("Appointment", appointmentSchema);
