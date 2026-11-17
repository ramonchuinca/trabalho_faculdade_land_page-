import { Schema, model } from "mongoose";

// Um bloco de atendimento semanal: weekday 0 = domingo ... 6 = sábado; horários "HH:mm"
const workingHourSchema = new Schema(
  {
    weekday: { type: Number, min: 0, max: 6, required: true },
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  { _id: false },
);

const doctorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    crm: { type: String, required: true },
    specialty: { type: String, required: true },
    bio: { type: String, default: "" },
    photoUrl: { type: String, default: "" },
    services: [{ type: Schema.Types.ObjectId, ref: "Service" }],
    slotMinutes: { type: Number, default: 30 },
    workingHours: [workingHourSchema],
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Doctor = model("Doctor", doctorSchema);
