import { Schema, model } from "mongoose";

const serviceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    icon: { type: String, default: "stethoscope" }, // nome do ícone no front (lucide)
    durationMin: { type: Number, required: true, default: 30 },
    price: { type: Number, required: true, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Service = model("Service", serviceSchema);
