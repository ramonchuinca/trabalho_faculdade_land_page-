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
npm run dev              # http://localhost:5173, proxy /api -> localhost:3333
npm run build            # tsc -b && vite build (é o typecheck do front)
npm run lint             # oxlint
```

Não há testes automatizados ainda. Logins do seed (senha `senha12345`): `paciente@vitalis.test`, `admin@vitalis.test` (também `maria@` e `joao@vitalis.test`). O seed cria consultas de demonstração (pendentes e uma confirmada) e uma mensagem de chat.

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

**Confirmação e hospital (role `admin` = recepção):** a consulta nasce `scheduled` e a recepção a confirma depois de falar com o paciente: `PATCH /appointments/:id/confirm` grava `confirmedAt`/`confirmedBy`/`confirmChannel` (phone|whatsapp|chat|other). **O `status` continua `scheduled` de propósito**: o índice único anti double-booking só vale para esse status, então criar um status `confirmed` liberaria o horário. "Pendente" = `scheduled && !confirmedAt`. `PATCH /:id/reschedule` (admin) remarca para outro slot válido do mesmo médico (mesmas regras do POST; colisão → 409), guarda o histórico em `reschedules[]`, **derruba a confirmação** a menos que venha `confirmChannel` (atendente já combinou o novo horário) e avisa o paciente com uma mensagem automática no chat. Também existe `PATCH /:id/complete` (admin) e `GET /appointments` do admin vem com `patient` populado (nome/telefone/e-mail). O telefone é **obrigatório** no cadastro (a recepção precisa dele). Front: `pages/admin/Panel.tsx` (`/painel`: abas Pendentes/Confirmadas/Histórico/Todas, busca, botões Ligar `tel:`, WhatsApp `wa.me` com mensagem pronta, Chat e Confirmar) e `pages/admin/Inbox.tsx` (`/painel/mensagens`). Contato por WhatsApp é só um link `wa.me` (grátis; o atendente clica em enviar). Enviar sozinho exigiria a WhatsApp Business API (paga/aprovação da Meta), não implementada.

**Sessão por aba (armadilha real):** o token JWT fica em **`sessionStorage`** (`tokenStore` em `lib/api.ts`), não em `localStorage`. Com `localStorage` todas as abas do navegador dividiam o mesmo token: logar como admin numa aba e recarregar a aba do paciente a transformava em admin (e a aba antiga ficava em loop de 403 em `/chat/inbox`). Assim dá para testar paciente e recepção lado a lado no mesmo navegador, e o reload mantém a conta de cada aba. Custo conhecido: fechar a aba encerra a sessão (aceitável aqui; um "lembrar de mim" exigiria cookie httpOnly/refresh token). `lib/auth.tsx` também limpa o cache do React Query (`qc.clear()`) em login/logout — sem isso um usuário enxergava por até 1 min dados em cache do anterior — e `api()` dispara `SESSION_EXPIRED_EVENT` em 401 com token.

**Chat paciente ↔ recepção:** model `Message` (uma conversa por paciente), rotas em `routes/chat.ts` (`/chat` do paciente; `/chat/inbox*` do admin; `/chat/unread` para ambos). Sem websocket: o front faz **polling** (`refetchInterval` 4–8 s) — ver `components/Chat.tsx` (balão flutuante do paciente + `ChatThread` reutilizado na caixa de entrada). Se precisar de tempo real, trocar por Socket.io/SSE.

**Visual:** tema em `client/src/index.css` (`brand-*` teal + `accent-*` índigo, gradientes, `glass`, `card-lift`, `skeleton`, animações `animate-fade-up/pop/float`; respeita `prefers-reduced-motion`). Gradiente em botões: `bg-linear-to-r` (Tailwind v4, não `bg-gradient-to-*`).

## Estado atual e próximos passos

Feito e **testado de ponta a ponta contra o Atlas** (roteiros HTTP: 24 do núcleo + 26 de confirmação/chat + 20 de reagendamento; o primeiro cobre: register/login, slots, agendar, 409 em horário duplicado, 400 para horário fora da grade/passado/serviço errado, 403 ao cancelar consulta alheia, cancelar libera o slot, admin vê todas). Front do paciente completo (catálogo, wizard, auth, minhas consultas com cancelar), painel da recepção com confirmação e chat. As rotas de confirmação/chat foram testadas por HTTP (26 checagens) e as telas verificadas em navegador headless (Edge + puppeteer-core), sem erros de console. Ainda **não há testes automatizados** e o front só foi validado por build/lint, não em navegador com dados reais.

Pendências (nesta ordem):
1. Deploy (config pronta, falta executar nas plataformas): Render via `render.yaml` na raiz (`rootDir: server`, build `npm install --include=dev && npm run build`, start `npm start`, health `/api/health`, vars `MONGODB_URI`/`JWT_SECRET`/`CLIENT_ORIGIN`; no Atlas liberar `0.0.0.0/0` em Network Access) e Netlify via `client/netlify.toml` (base dir `client`, var `VITE_API_URL`; `public/_redirects` trata o SPA). Ordem: Render → copiar a URL para `VITE_API_URL` no Netlify → copiar a URL do Netlify para `CLIENT_ORIGIN` no Render. Barra final em `CLIENT_ORIGIN`/`VITE_API_URL` é removida pelo código. Depois do 1º deploy rodar `npm run seed` apontando para o Atlas (o seed apaga tudo). O plano gratuito do Render dorme após ~15 min — manter estados de loading amigáveis.
2. Painel do hospital — falta o CRUD de médicos/serviços/horários (rotas de escrita do admin ainda não existem na API). Ideias: remarcação feita pelo próprio paciente, notificação por e-mail/WhatsApp automático, papel `doctor` com agenda própria.
3. Opcional: testes automatizados da API (o roteiro usado está nas regras acima e nos fluxos de confirmação/chat) e revisão visual/responsiva do front.

**Ambiente local (armadilhas já encontradas):** `server/.env` não vai para o git. Na `MONGODB_URI`, caracteres especiais da senha precisam ser codificados (`:` → `%3A`, `@` → `%40`) e **não** deve sobrar `:` extra antes da senha (dá `bad auth`). Se aparecer `querySrv ECONNREFUSED`, o DNS local está recusando consultas SRV: definir `DNS_SERVERS=8.8.8.8,1.1.1.1` no `.env` (lido em `server/src/env.ts`; no Render não é necessário).

Git: `main` e `legacy` estão no GitHub (`origin`). Pendências de housekeeping: o repo ainda publica no GitHub Pages, que agora serve a `main` sem `index.html` na raiz — desativar o Pages (ou apontá-lo para `legacy` até o Netlify subir) e atualizar o link do portfólio para a URL do Netlify. O token do SheetDB do projeto antigo está no histórico da branch `legacy` (`formulario.js`, `recebe.js`) — revogá-lo/apagar a API no painel do SheetDB (reescrever o histórico não adianta, a URL já é pública).
