// API falsa em memória, só para ver o visual sem backend. Ligue com VITE_MOCK=1 (veja api.ts).
import type { Appointment, Doctor, Service, User } from "./api";

const sv = (
  i: number,
  name: string,
  icon: string,
  durationMin: number,
  price: number,
  description: string,
): Service => ({
  _id: `s${i}`,
  name,
  slug: `s${i}`,
  icon,
  durationMin,
  price,
  description,
});

const SERVICES: Service[] = [
  sv(
    1,
    "Consulta Clínica Geral",
    "stethoscope",
    30,
    220,
    "Avaliação geral de saúde, acompanhamento de doenças crônicas e encaminhamentos.",
  ),
  sv(
    2,
    "Cardiologia",
    "heart-pulse",
    40,
    320,
    "Check-up cardiovascular, pressão arterial, ECG e prevenção de doenças do coração.",
  ),
  sv(
    3,
    "Dermatologia",
    "scan-face",
    30,
    290,
    "Cuidados com pele, cabelo e unhas, mapeamento de pintas e tratamento de acne.",
  ),
  sv(
    4,
    "Pediatria",
    "baby",
    30,
    250,
    "Acompanhamento do crescimento e desenvolvimento de crianças e adolescentes.",
  ),
  sv(
    5,
    "Ortopedia",
    "bone",
    30,
    300,
    "Dores articulares, lesões esportivas, coluna e reabilitação.",
  ),
  sv(
    6,
    "Ginecologia",
    "flower-2",
    40,
    310,
    "Saúde da mulher, pré-natal, prevenção e exames de rotina.",
  ),
  sv(
    7,
    "Exames Laboratoriais",
    "flask-conical",
    20,
    90,
    "Coleta de sangue e urina com resultados disponíveis online.",
  ),
  sv(
    8,
    "Vacinação",
    "syringe",
    20,
    0,
    "Calendário vacinal completo para todas as idades.",
  ),
];

const dr = (
  i: number,
  name: string,
  specialty: string,
  bio: string,
  services: string[],
  slotMinutes: number,
): Doctor => ({
  _id: `d${i}`,
  name,
  crm: `CRM-SP ${100000 + i * 111111}`,
  specialty,
  bio,
  photoUrl: "",
  services,
  slotMinutes,
});

const DOCTORS: Doctor[] = [
  dr(
    1,
    "Dra. Helena Duarte",
    "Clínica Geral",
    "Mais de 15 anos de experiência em clínica médica e medicina preventiva.",
    ["s1", "s8"],
    30,
  ),
  dr(
    2,
    "Dr. Rafael Monteiro",
    "Cardiologia",
    "Especialista em prevenção cardiovascular e hipertensão.",
    ["s2"],
    40,
  ),
  dr(
    3,
    "Dra. Camila Azevedo",
    "Dermatologia",
    "Dermatologia clínica e estética, com foco em prevenção do câncer de pele.",
    ["s3"],
    30,
  ),
  dr(
    4,
    "Dr. Bruno Tavares",
    "Pediatria",
    "Pediatra com atendimento humanizado do recém-nascido à adolescência.",
    ["s4", "s8"],
    30,
  ),
  dr(
    5,
    "Dr. Lucas Pereira",
    "Ortopedia",
    "Ortopedia e medicina esportiva, da lesão à reabilitação.",
    ["s5"],
    30,
  ),
  dr(
    6,
    "Dra. Beatriz Nogueira",
    "Ginecologia",
    "Ginecologia e obstetrícia, com acompanhamento em todas as fases da vida.",
    ["s6"],
    40,
  ),
  dr(
    7,
    "Equipe de Coleta Vitalis",
    "Laboratório",
    "Coleta de exames com atendimento rápido e sem fila.",
    ["s7"],
    20,
  ),
];

const DEMO_USER: User = {
  id: "u1",
  name: "Paciente Demo",
  email: "paciente@vitalis.test",
  role: "patient",
  cpf: null,
  phone: null,
};

const appts: Appointment[] = [];
const taken = new Set<string>(); // `${doctorId}|${startISO}`

const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));
class MockError extends Error {
  status: number;
  constructor(status: number, m: string) {
    super(m);
    this.status = status;
  }
}

// Horários no fuso da clínica (UTC-3): seg–sex, 08–12 e 14–18; alguns "já ocupados" de forma determinística.
function slotsFor(doc: Doctor, date: string): string[] {
  const [y, m, d] = date.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  if (wd === 0 || wd === 6) return [];
  const out: string[] = [];
  for (const [from, to] of [
    [8 * 60, 12 * 60],
    [14 * 60, 18 * 60],
  ]) {
    for (let t = from; t + doc.slotMinutes <= to; t += doc.slotMinutes) {
      const iso = new Date(Date.UTC(y, m - 1, d, 0, t + 180)).toISOString();
      const fakeBusy = (d * 7 + t / 10 + Number(doc._id.slice(1))) % 5 === 0;
      if (
        !fakeBusy &&
        !taken.has(`${doc._id}|${iso}`) &&
        new Date(iso).getTime() > Date.now()
      )
        out.push(iso);
    }
  }
  return out;
}

export async function mockApi(
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  await wait();
  const method = (init.method ?? "GET").toUpperCase();
  const body = init.body ? JSON.parse(String(init.body)) : {};
  const url = new URL(path, "http://x");
  const p = url.pathname;

  if (p === "/services") return SERVICES;
  if (p === "/doctors") return DOCTORS;
  const slotM = p.match(/^\/doctors\/(\w+)\/slots$/);
  if (slotM) {
    const doc = DOCTORS.find((x) => x._id === slotM[1]);
    if (!doc) throw new MockError(404, "Médico não encontrado");
    const date = url.searchParams.get("date")!;
    return { date, slots: slotsFor(doc, date) };
  }

  if (p === "/auth/login")
    return { token: "mock", user: { ...DEMO_USER, email: body.email } };
  if (p === "/auth/register")
    return {
      token: "mock",
      user: { ...DEMO_USER, name: body.name, email: body.email },
    };
  if (p === "/auth/me") return { user: DEMO_USER };

  if (p === "/appointments" && method === "GET") {
    return [...appts].sort((a, b) => b.start.localeCompare(a.start));
  }
  if (p === "/appointments" && method === "POST") {
    const doc = DOCTORS.find((x) => x._id === body.doctorId)!;
    const svc = SERVICES.find((x) => x._id === body.serviceId)!;
    taken.add(`${doc._id}|${body.start}`);
    const a: Appointment = {
      _id: `a${appts.length + 1}`,
      start: body.start,
      end: new Date(
        new Date(body.start).getTime() + doc.slotMinutes * 60_000,
      ).toISOString(),
      status: "scheduled",
      doctor: {
        _id: doc._id,
        name: doc.name,
        specialty: doc.specialty,
        photoUrl: "",
      },
      service: {
        _id: svc._id,
        name: svc.name,
        price: svc.price,
        durationMin: svc.durationMin,
        icon: svc.icon,
      },
    };
    appts.push(a);
    return a;
  }
  const cancelM = p.match(/^\/appointments\/(\w+)\/cancel$/);
  if (cancelM) {
    const a = appts.find((x) => x._id === cancelM[1]);
    if (!a) throw new MockError(404, "Consulta não encontrada");
    a.status = "cancelled";
    taken.delete(`${a.doctor._id}|${a.start}`);
    return a;
  }
  throw new MockError(404, `Mock sem rota: ${method} ${p}`);
}
