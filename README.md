# Vitalis Clínica

Aplicativo web de agendamento para clínicas e hospitais (projeto de portfólio, dados fictícios).
O paciente vê os serviços, escolhe o médico, seleciona um horário livre e gerencia suas consultas.

> A versão antiga (landing page em HTML/PHP) está preservada na branch `legacy`.

## Stack

- **Front** (`client/`): React 19 + Vite + TypeScript + Tailwind v4 + React Router + TanStack Query → deploy no **Netlify**
- **API** (`server/`): Node + Express 5 + Mongoose + JWT + Zod → deploy no **Render**
- **Banco**: MongoDB Atlas (plano gratuito)

## Rodando localmente

```bash
# 1) API
cd server
cp .env.example .env        # preencha MONGODB_URI e JWT_SECRET
npm install
npm run seed                # popula serviços, médicos e usuários de teste
npm run dev                 # http://localhost:3333

# 2) Front (outro terminal)
cd client
npm install
npm run dev                 # http://localhost:5173 (o Vite faz proxy de /api para a API)
```

Logins de teste criados pelo seed (senha `senha12345`): `paciente@vitalis.test` e `admin@vitalis.test`.

## Deploy

- **Render** (Web Service, root `server`): build `npm install && npm run build`, start `npm start`.
  Variáveis: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN` (URL do Netlify).
- **Netlify** (base `client`): build `npm run build`, publish `dist`. Variável: `VITE_API_URL` (URL do Render).
  O `public/_redirects` já cuida das rotas do React Router.
