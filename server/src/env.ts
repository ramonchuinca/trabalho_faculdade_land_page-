import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(3333),
  MONGODB_URI: z.string().min(1, "MONGODB_URI é obrigatório"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET precisa ter ao menos 16 caracteres"),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
});

export const env = schema.parse(process.env);
