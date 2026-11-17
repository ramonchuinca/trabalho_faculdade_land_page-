# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projeto

**Vitalis Clínica** — app de agendamento para clínicas/hospitais (projeto de portfólio, dados fictícios, idioma da UI: pt-BR). O paciente vê serviços, escolhe médico, escolhe um horário livre e gerencia suas consultas. O lado do hospital (admin/recepção/médico) usa a mesma API e o mesmo front, separado por `role`.

Monorepo com dois pacotes independentes (não há workspace/raiz com `package.json`; rode `npm` dentro de cada pasta):

- `server/` — Node + Express 5 + Mongoose 9 + Zod 4 + JWT, TypeScript ESM (`NodeNext`, imports locais com sufixo `.js`). Deploy: Render.
- `client/` — React 19 + Vite + TypeScript + Tailwind v4 + React Router 7 + TanStack Query. Deploy: Netlify.
- Banco: MongoDB Atlas (não há `mongod` local instalado).

A versão antiga (landing page HTML/PHP/SheetDB da faculdade) vive só na branch `legacy`. Não reaproveitar nada dela.

## Comandos

```bash
# API (server/)
cp .env.example .env     # preencher MONGODB_URI, JWT_SECRET, CLIENT_ORIGIN
npm run dev              # tsx watch, http://localhost:3333
npm run seed             # APAGA e recria users/services/doctors/appointments
npm run typecheck        # tsc --noEmit
npm run build && npm start

# Front (client/)
npm run dev              # http://localhost:5173, proxy /api -> localhost:3333
npm run build            # tsc -b && vite build (é o typecheck do front)
npm run lint             # oxlint
```

Não há testes automatizados ainda. Logins do seed (senha `senha12345`): `paciente@vitalis.test`, `admin@vitalis.test`.

## Arquitetura (o que exige ler vários arquivos)

**Front nunca fala com o Mongo.** Só chama `/api/*` via `client/src/lib/api.ts`. Em dev o Vite faz proxy; em produção usa `VITE_API_URL` (URL do Render). O token JWT fica em `localStorage` (`tokenStore`) e `lib/auth.tsx` (`AuthProvider`/`useAuth`) restaura a sessão via `GET /auth/me`. Os tipos em `api.ts` espelham à mão as respostas da API: ao mudar um model/rota no `server/`, atualizar lá também.

**Papéis:** `patient | doctor | admin` (`server/src/models/User.ts`). `POST /auth/register` cria **sempre** paciente; médicos/admins só por seed/admin. `requireAuth`/`requireRole` em `middleware/auth.ts`. `GET /appointments` devolve só as consultas do próprio paciente, exceto admin (todas) — é a base do futuro painel do hospital.

**Agendamento (núcleo do domínio):**
- `Doctor.workingHours` = blocos semanais (`weekday` 0=dom..6=sáb, `start`/`end` "HH:mm") + `slotMinutes`. Os horários **não são armazenados**: `server/src/lib/slots.ts` os gera sob demanda (`candidateSlots`) e `availableSlots` remove os já reservados e os passados.
- **Fuso fixo da clínica: UTC-3** (`TZ_OFFSET` em `slots.ts`). Render roda em UTC, então nunca usar `new Date(y,m,d)`/`getDay()` locais; usar os helpers de `slots.ts` (`clinicDateOf`, `candidateSlots`). Datas na API são `AAAA-MM-DD` no fuso da clínica; instantes são ISO UTC.
- `POST /appointments` revalida no servidor que o `start` é exatamente um slot válido do médico, no futuro, e que o médico realiza o serviço. A garantia anti double-booking é o **índice único parcial** `{doctor, start}` com `status: "scheduled"` em `Appointment.ts`; colisão (erro 11000) vira HTTP 409. `index.ts` chama `syncIndexes()` no boot para garantir o índice — não remover.
- `end` da consulta = `start + doctor.slotMinutes` (a `durationMin` do serviço é só informativa por enquanto).

**Erros:** lançar `HttpError(status, msg)` (`lib/httpError.ts`) ou deixar o `ZodError` subir; `middleware/error.ts` converte. Express 5 propaga erros de handlers `async` sozinho (sem `try/catch` nem wrapper). Rotas públicas de catálogo (`/services`, `/doctors`, `/doctors/:id/slots`) ficam em `routes/catalog.ts`; `/auth` tem rate limit em `app.ts`.

## Estado atual e próximos passos

Feito: back completo da fase 1 (auth, catálogo, slots, agendamento, cancelamento, seed) — **compila, mas nunca foi executado contra um banco real** (só a lógica pura de slots foi testada). Front: scaffold + Tailwind com tema `brand-*` + `Layout` + `Home` listando serviços da API; build passa.

Pendências imediatas (nesta ordem):
1. Criar cluster gratuito no MongoDB Atlas (liberar o IP, ex. 0.0.0.0/0 para o Render), criar `server/.env`, rodar `npm run seed` e `npm run dev` e testar a API de ponta a ponta (register/login, slots, agendar, 409 em horário duplicado, cancelar).
2. Front do paciente — rotas ainda não criadas (há um TODO em `client/src/App.tsx`): `/servicos`, `/profissionais`, `/entrar`, `/cadastro`, `/agendar` (wizard: serviço → médico → data → horário → confirmar), `/minhas-consultas` (com cancelar), rota protegida. A Home usa um ícone genérico; o campo `Service.icon` (nome lucide) ainda não é mapeado.
3. Deploy: Render (`server/`, build `npm install && npm run build`, start `npm start`, vars `MONGODB_URI`/`JWT_SECRET`/`CLIENT_ORIGIN`) e Netlify (`client/`, var `VITE_API_URL`; `public/_redirects` já trata o SPA). O plano gratuito do Render dorme após ~15 min — manter estados de loading amigáveis.
4. Painel do hospital (role `admin`): agenda geral, CRUD de médicos/serviços/horários — rotas de escrita do admin ainda não existem na API.

Housekeeping git (não feito): a limpeza da `main` e o novo código estão **sem commit**; a branch `legacy` existe só localmente (precisa de `git push origin legacy`). O repo ainda está no GitHub Pages: desativar o Pages e atualizar o link no portfólio para a URL do Netlify. O token do SheetDB do projeto antigo está no histórico do git — revogá-lo no painel do SheetDB.
