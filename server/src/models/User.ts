import { Schema, model, type InferSchemaType } from "mongoose";

export const ROLES = ["patient", "doctor", "admin"] as const;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    cpf: { type: String, trim: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: ROLES, default: "patient" },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = model("User", userSchema);
