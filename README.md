# Vitalis Clínica

Aplicativo web de agendamento para clínicas e hospitais (projeto de portfólio, dados fictícios, interface em pt-BR).
O **paciente** vê os serviços, escolhe o médico, reserva um horário livre e acompanha suas consultas.
A **recepção** (papel `admin`) confirma cada agendamento falando com o paciente, remarca em caso de imprevisto e responde dúvidas por chat.

> A versão antiga (landing page em HTML/PHP) está preservada na branch `legacy`.

## Funcionalidades

### Paciente

- Catálogo de serviços e profissionais.
- Agendamento em 4 passos (serviço → médico → dia/horário → confirmar), com o estado guardado na URL.
- Minhas consultas: status em tempo real (*Aguardando confirmação*, *Confirmada*, *Concluída*, *Cancelada*) e cancelamento.
- Chat com a recepção (balão flutuante, com contador de mensagens não lidas).

### Recepção (`/painel`)

- Fila de agendamentos com abas *Pendentes / Confirmadas / Histórico / Todas* e busca por paciente.
- **Ligar** (`tel:`) e **WhatsApp** (link `wa.me` com a mensagem de confirmação já escrita) direto do cartão.
- **Confirmar** informando o canal usado (telefone, WhatsApp ou chat).
- **Reagendar** para outro horário livre do mesmo médico; o paciente é avisado automaticamente no chat.
- Caixa de mensagens (`/painel/mensagens`) com as conversas dos pacientes.

### Regras do agendamento

- Os horários não são armazenados: são gerados sob demanda a partir da agenda semanal do médico, no fuso fixo da clínica (UTC-3).
- O servidor revalida cada horário, e um índice único parcial no MongoDB impede dois pacientes no mesmo horário (colisão → HTTP 409). Confirmar uma consulta **não** libera o horário.

## Stack

- **Front** (`client/`): React 19 + Vite + TypeScript + Tailwind v4 + React Router 7 + TanStack Query → deploy no **Netlify**
- **API** (`server/`): Node + Express 5 + Mongoose 9 + Zod 4 + JWT → deploy no **Render**
- **Banco**: MongoDB Atlas (plano gratuito)

## Rodando localmente

```bash
# 1) API
cd server
cp .env.example .env        # preencha MONGODB_URI e JWT_SECRET
npm install
npm run seed                # APAGA e recria serviços, médicos, usuários, consultas e mensagens de demonstração
npm run dev                 # http://localhost:3333

# 2) Front (outro terminal)
cd client
npm install
npm run dev                 # http://localhost:5173 (o Vite faz proxy de /api para a API)
```

### Contas de demonstração (senha `senha12345`)

| Papel | E-mail |
| --- | --- |
| Paciente | `paciente@vitalis.test` (também `maria@vitalis.test`, `joao@vitalis.test`) |
| Recepção | `admin@vitalis.test` |

A tela de login tem botões para entrar direto com as contas de paciente e de recepção.

### Dicas de ambiente

- **`MONGODB_URI`**: codifique caracteres especiais da senha (`:` → `%3A`, `@` → `%40`) e não deixe `:` sobrando antes dela, ou o Atlas responde `bad auth`. Libere seu IP em *Network Access* no Atlas.
- **`querySrv ECONNREFUSED`**: seu DNS local está recusando consultas SRV. Defina `DNS_SERVERS=8.8.8.8,1.1.1.1` no `server/.env` (não é necessário no Render).
- **Testar paciente e recepção ao mesmo tempo**: a sessão fica em `sessionStorage`, ou seja, **uma por aba**. Abra uma aba logada como paciente e outra como recepção no mesmo navegador; cada uma mantém a sua conta ao recarregar. Fechar a aba encerra a sessão.
- Não há testes automatizados ainda; o back foi validado por roteiros HTTP e as telas, em navegador headless.

## Deploy

- **Render** (Web Service, root `server`): build `npm install && npm run build`, start `npm start`.
  Variáveis: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN` (URL do Netlify). No Atlas, libere `0.0.0.0/0` em *Network Access*.
  O plano gratuito dorme após ~15 min sem uso; a primeira requisição pode demorar alguns segundos.
- **Netlify** (base `client`): build `npm run build`, publish `dist`. Variável: `VITE_API_URL` (URL do Render).
  O `public/_redirects` já cuida das rotas do React Router.

## Observações

- O chat usa *polling* (consulta a cada 4–8 s), sem WebSocket. O WhatsApp é um link `wa.me` (o atendente clica em enviar); o envio automático exigiria a WhatsApp Business API, que é paga.
- Próximos passos: deploy (Render + Netlify), CRUD de médicos/serviços/horários no painel, remarcação feita pelo próprio paciente e testes automatizados.
