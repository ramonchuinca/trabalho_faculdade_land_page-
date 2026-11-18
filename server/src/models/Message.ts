import { Schema, model } from "mongoose";

// Uma conversa por paciente: todas as mensagens ficam ligadas ao `patient`.
const messageSchema = new Schema(
  {
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    from: { type: String, enum: ["patient", "staff"], required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    // Preenchido quando o lado oposto leu a mensagem.
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

messageSchema.index({ patient: 1, createdAt: 1 });

export const Message = model("Message", messageSchema);
