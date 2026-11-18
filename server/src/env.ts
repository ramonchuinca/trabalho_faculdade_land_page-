import "dotenv/config";
import dns from "node:dns";
import { z } from "zod";

const schema = z.object({
  // Opcional: resolvers DNS (ex.: "8.8.8.8,1.1.1.1"). Útil quando o DNS local recusa consultas SRV (mongodb+srv).
  DNS_SERVERS: z.string().optional(),
  PORT: z.coerce.number().default(3333),
  MONGODB_URI: z.string().min(1, "MONGODB_URI é obrigatório"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET precisa ter ao menos 16 caracteres"),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
});

export const env = schema.parse(process.env);

if (env.DNS_SERVERS) dns.setServers(env.DNS_SERVERS.split(",").map((s) => s.trim()).filter(Boolean));
