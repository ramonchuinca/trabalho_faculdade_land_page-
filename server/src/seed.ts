import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { env } from "./env.js";
import { User } from "./models/User.js";
import { Service } from "./models/Service.js";
import { Doctor } from "./models/Doctor.js";
import { Appointment } from "./models/Appointment.js";

// Dados fictícios da clínica "Vitalis" para desenvolvimento/demonstração.
// ATENÇÃO: apaga e recria tudo. Não rodar contra um banco com dados reais.
await mongoose.connect(env.MONGODB_URI);
await Promise.all([User.deleteMany({}), Service.deleteMany({}), Doctor.deleteMany({}), Appointment.deleteMany({})]);

const services = await Service.insertMany([
  { name: "Consulta Clínica Geral", slug: "clinica-geral", icon: "stethoscope", durationMin: 30, price: 220, description: "Avaliação geral de saúde, acompanhamento de doenças crônicas e encaminhamentos." },
  { name: "Cardiologia", slug: "cardiologia", icon: "heart-pulse", durationMin: 40, price: 320, description: "Check-up cardiovascular, pressão arterial, ECG e prevenção de doenças do coração." },
  { name: "Dermatologia", slug: "dermatologia", icon: "scan-face", durationMin: 30, price: 290, description: "Cuidados com pele, cabelo e unhas, mapeamento de pintas e tratamento de acne." },
  { name: "Pediatria", slug: "pediatria", icon: "baby", durationMin: 30, price: 250, description: "Acompanhamento do crescimento e desenvolvimento de crianças e adolescentes." },
  { name: "Ortopedia", slug: "ortopedia", icon: "bone", durationMin: 30, price: 300, description: "Dores articulares, lesões esportivas, coluna e reabilitação." },
  { name: "Ginecologia", slug: "ginecologia", icon: "flower-2", durationMin: 40, price: 310, description: "Saúde da mulher, pré-natal, prevenção e exames de rotina." },
  { name: "Exames Laboratoriais", slug: "exames", icon: "flask-conical", durationMin: 20, price: 90, description: "Coleta de sangue e urina com resultados disponíveis online." },
  { name: "Vacinação", slug: "vacinacao", icon: "syringe", durationMin: 20, price: 0, description: "Calendário vacinal completo para todas as idades." },
]);
const bySlug = Object.fromEntries(services.map((s) => [s.slug, s._id]));

// Seg a sex, manhã e tarde (weekday 1..5).
const weekdays = (blocks: [string, string][], days = [1, 2, 3, 4, 5]) =>
  days.flatMap((weekday) => blocks.map(([start, end]) => ({ weekday, start, end })));

await Doctor.insertMany([
  { name: "Dra. Helena Duarte", crm: "CRM-SP 123456", specialty: "Clínica Geral", bio: "Mais de 15 anos de experiência em clínica médica e medicina preventiva.", slotMinutes: 30, services: [bySlug["clinica-geral"], bySlug["vacinacao"]], workingHours: weekdays([["08:00", "12:00"], ["14:00", "18:00"]]) },
  { name: "Dr. Rafael Monteiro", crm: "CRM-SP 234567", specialty: "Cardiologia", bio: "Especialista em prevenção cardiovascular e hipertensão.", slotMinutes: 40, services: [bySlug["cardiologia"]], workingHours: weekdays([["09:00", "12:00"], ["14:00", "17:20"]], [1, 3, 5]) },
  { name: "Dra. Camila Azevedo", crm: "CRM-SP 345678", specialty: "Dermatologia", bio: "Dermatologia clínica e estética, com foco em prevenção do câncer de pele.", slotMinutes: 30, services: [bySlug["dermatologia"]], workingHours: weekdays([["08:30", "12:00"], ["13:30", "17:00"]], [2, 3, 4]) },
  { name: "Dr. Bruno Tavares", crm: "CRM-SP 456789", specialty: "Pediatria", bio: "Pediatra com atendimento humanizado desde o recém-nascido até a adolescência.", slotMinutes: 30, services: [bySlug["pediatria"], bySlug["vacinacao"]], workingHours: weekdays([["08:00", "12:00"], ["14:00", "18:00"]]) },
  { name: "Dr. Lucas Pereira", crm: "CRM-SP 567890", specialty: "Ortopedia", bio: "Ortopedia e medicina esportiva, da lesão à reabilitação.", slotMinutes: 30, services: [bySlug["ortopedia"]], workingHours: weekdays([["08:00", "12:00"], ["14:00", "17:00"]], [1, 2, 4]) },
  { name: "Dra. Beatriz Nogueira", crm: "CRM-SP 678901", specialty: "Ginecologia", bio: "Ginecologia e obstetrícia, com acompanhamento em todas as fases da vida.", slotMinutes: 40, services: [bySlug["ginecologia"]], workingHours: weekdays([["09:00", "12:00"], ["14:00", "17:20"]], [2, 4, 5]) },
  { name: "Equipe de Coleta Vitalis", crm: "—", specialty: "Laboratório", bio: "Coleta de exames com atendimento rápido e sem fila.", slotMinutes: 20, services: [bySlug["exames"]], workingHours: weekdays([["07:00", "11:00"]], [1, 2, 3, 4, 5, 6]) },
]);

const passwordHash = await bcrypt.hash("senha12345", 12);
await User.insertMany([
  { name: "Administrador Vitalis", email: "admin@vitalis.test", passwordHash, role: "admin" },
  { name: "Paciente Demo", email: "paciente@vitalis.test", passwordHash, role: "patient" },
]);

await mongoose.connection.syncIndexes();
console.log("Seed concluído. Logins de teste (senha: senha12345): admin@vitalis.test | paciente@vitalis.test");
await mongoose.disconnect();
