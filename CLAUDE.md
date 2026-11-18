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

**Em produção (deploy feito e verificado pelo ar em 2026-11-18):** front em https://aagendamentoclinica.netlify.app e API em https://vitalis-api-og7k.onrender.com (Atlas, banco `vitalis`, já populado pelo seed). Verificado por HTTP contra produção: health, catálogo (8 serviços, 7 médicos), login, CORS (só a origem do Netlify), agendar 201, duplicado 409, cancelar 200. O front **não** foi aberto num navegador após o deploy — conferir visualmente.

Pendências (nesta ordem):
1. Conferir o site no navegador (login paciente e `/painel` admin) e anotar o que quebrar. Housekeeping: desativar o GitHub Pages do repo e apontar o link do portfólio para o Netlify; **revogar o token do SheetDB** (está no histórico da branch `legacy`, em `formulario.js`/`recebe.js`; reescrever histórico não adianta, a URL já é pública).
2. Segurança: o `JWT_SECRET` do Render foi colado igual ao do `.env` local; trocar por um exclusivo de produção antes de divulgar o link.
3. Robustez do front: `api()` trata resposta não-JSON como `{}` com status 200, o que estoura `map is not a function` nas telas. Deveria lançar `ApiError` com mensagem clara (aconteceu quando `VITE_API_URL` não entrou no build).
4. Painel do hospital — falta o CRUD de médicos/serviços/horários (rotas de escrita do admin ainda não existem na API). Ideias: remarcação feita pelo próprio paciente, notificação por e-mail/WhatsApp automático, papel `doctor` com agenda própria.
5. Opcional: testes automatizados da API e revisão visual/responsiva do front. O plano gratuito do Render dorme após ~15 min (1ª requisição leva ~50 s) — manter estados de loading amigáveis.

**Deploy (como está configurado e armadilhas reais):**
- Render: `render.yaml` na raiz (`rootDir: server`, build `npm install --include=dev && npm run build`, start `npm start`, health `/api/health`). Vars: `MONGODB_URI` (**terminar em `/vitalis`**: sem o nome do banco o Mongoose usa `test` e a API sobe "vazia"), `CLIENT_ORIGIN`, `JWT_SECRET`. A URL pública leva sufixo aleatório (`vitalis-api-og7k`; `vitalis-api.onrender.com` pertence a outra conta). No Atlas, Network Access com `0.0.0.0/0`.
- `CLIENT_ORIGIN` precisa do esquema completo: `https://aagendamentoclinica.netlify.app`, sem barra final (sem `https://` o CORS nunca casa). Barra final é removida pelo código.
- Netlify: `netlify.toml` na **RAIZ** com `base = "client"`. Dentro de `client/` ele é ignorado quando a base é a raiz (o 1º deploy publicou o repo inteiro, sem build, e deu 404). Var `VITE_API_URL` = URL do Render, sem `/api` e sem barra; o Vite a grava **no build**, então criar a variável exige novo deploy (*Clear cache and deploy site*). Cuidado para não colocar a URL no campo *Key*. Para checar: o bundle em `/assets/index-*.js` deve conter a URL do Render.
- Ordem: Render → URL vira `VITE_API_URL` no Netlify → URL do Netlify vira `CLIENT_ORIGIN` no Render. O seed apaga tudo: só rodar de propósito.

**Ambiente local (armadilhas já encontradas):** `server/.env` não vai para o git (em cada computador é preciso criá-lo a partir de `server/.env.example`; a `MONGODB_URI` também termina em `/vitalis`). Na `MONGODB_URI`, caracteres especiais da senha precisam ser codificados (`:` → `%3A`, `@` → `%40`) e **não** deve sobrar `:` extra antes da senha (dá `bad auth`). Se aparecer `querySrv ECONNREFUSED`, o DNS local está recusando consultas SRV: definir `DNS_SERVERS=8.8.8.8,1.1.1.1` no `.env` (lido em `server/src/env.ts`; no Render não é necessário). **No Windows, `pkill` não derruba o `tsx watch`**: um processo antigo segura a porta 3333 e a API "nova" responde com o banco/URI antigos — matar pelo PID (ver quem escuta na porta) antes de reiniciar. Se a 5173 estiver ocupada, o Vite sobe em 5174 (conferir o título da página).

Git: `main` e `legacy` estão no GitHub (`origin`).
