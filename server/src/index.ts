import mongoose from "mongoose";
import { env } from "./env.js";
import { app } from "./app.js";

await mongoose.connect(env.MONGODB_URI);
console.log("MongoDB conectado");

// Garante o índice único anti double-booking antes de aceitar requisições.
await mongoose.connection.syncIndexes();

app.listen(env.PORT, () => console.log(`API rodando em http://localhost:${env.PORT}`));
