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
cp .env.example .env     # preencher MONGODB_URI, JWT_SECRET, CLIENT_ORIGIN (DNS_SERVERS opcional)
npm run dev              # tsx watch, http://localhost:3333
npm run seed             # APAGA e recria users/services/doctors/appointments
npm run typecheck        # tsc --noEmit
npm run build && npm start

# Front (client/)
npm run dev              # http://localhost:5173, proxy /api -> localhost:3333 (VITE_MOCK=1 = sem backend)
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

**Front do paciente** (`client/src/pages/`): `Services`, `Doctors`, `Book` (wizard serviço → médico → dia/horário → confirmar), `Auth` (login/cadastro, mesmo componente com `mode`), `MyAppointments`, `NotFound`; `ProtectedRoute` protege `/minhas-consultas`. O estado do wizard vive na **URL** (`?service=&doctor=&date=&start=`), então o login no meio do fluxo não perde a escolha. Datas/horas são exibidas no fuso da clínica via `lib/format.ts`; `lib/icons.tsx` mapeia `Service.icon` (kebab-case lucide) — ao criar um serviço com ícone novo, adicionar ao mapa.

**Mock do front:** `VITE_MOCK=1 npm run dev` (só em dev) troca `api()` por uma API falsa em memória (`client/src/lib/mock.ts`) para ver o visual sem backend. Os dados somem ao recarregar e as regras (ex.: 409) não são reais — não usar para validar comportamento.

## Estado atual e próximos passos

Feito e **testado de ponta a ponta contra o Atlas** (24 checagens via HTTP: register/login, slots, agendar, 409 em horário duplicado, 400 para horário fora da grade/passado/serviço errado, 403 ao cancelar consulta alheia, cancelar libera o slot, admin vê todas). Front do paciente completo (catálogo, wizard de agendamento, auth, minhas consultas com cancelar). Ainda **não há testes automatizados** e o front só foi validado por build/lint, não em navegador com dados reais.

Pendências (nesta ordem):
1. Deploy: Render (`server/`, build `npm install && npm run build`, start `npm start`, vars `MONGODB_URI`/`JWT_SECRET`/`CLIENT_ORIGIN`; no Atlas liberar `0.0.0.0/0` em Network Access) e Netlify (`client/`, var `VITE_API_URL`; `public/_redirects` já trata o SPA). O plano gratuito do Render dorme após ~15 min — manter estados de loading amigáveis.
2. Painel do hospital (role `admin`): agenda geral, CRUD de médicos/serviços/horários — rotas de escrita do admin ainda não existem na API. `GET /appointments` já devolve todas para admin.
3. Opcional: testes automatizados da API (o roteiro usado está nas regras acima) e revisão visual/responsiva do front.

**Ambiente local (armadilhas já encontradas):** `server/.env` não vai para o git. Na `MONGODB_URI`, caracteres especiais da senha precisam ser codificados (`:` → `%3A`, `@` → `%40`) e **não** deve sobrar `:` extra antes da senha (dá `bad auth`). Se aparecer `querySrv ECONNREFUSED`, o DNS local está recusando consultas SRV: definir `DNS_SERVERS=8.8.8.8,1.1.1.1` no `.env` (lido em `server/src/env.ts`; no Render não é necessário).

Git: `main` e `legacy` estão no GitHub (`origin`). Pendências de housekeeping: o repo ainda publica no GitHub Pages, que agora serve a `main` sem `index.html` na raiz — desativar o Pages (ou apontá-lo para `legacy` até o Netlify subir) e atualizar o link do portfólio para a URL do Netlify. O token do SheetDB do projeto antigo está no histórico da branch `legacy` (`formulario.js`, `recebe.js`) — revogá-lo/apagar a API no painel do SheetDB (reescrever o histórico não adianta, a URL já é pública).
