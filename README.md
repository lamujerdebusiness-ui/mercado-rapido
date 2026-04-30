# Mercado Rápido

## Descrição

Aplicativo simples de lista de compras com Supabase. Ele permite criar listas, adicionar itens por categoria, marcar comprados, duplicar listas antigas e sincronizar os dados entre dispositivos após login.

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Vercel

## Como rodar localmente

```bash
npm install
npm run dev
```

Depois acesse `http://127.0.0.1:3001`.

Neste projeto o dev server usa a porta `3001` porque a porta `3000` pode estar ocupada por outro app local.

## Rodar com Supabase local

Com Docker Desktop rodando:

```bash
npm install
npm run supabase:start
npm run dev
```

O Supabase local fica em:

- API: `http://127.0.0.1:54321`
- Studio: `http://127.0.0.1:54323`
- Mailpit: `http://127.0.0.1:54324`

O arquivo `.env.local` deve apontar para a API local e usar a anon key local. Para consultar as variáveis geradas pelo CLI:

```bash
npm run supabase:status
```

As tabelas e políticas são aplicadas pela migration em `supabase/migrations/20260429000000_create_shopping_tables.sql`.

## Configurar Supabase

1. Crie um projeto no Supabase.
2. Vá em SQL Editor.
3. Cole e execute o conteúdo de `supabase/schema.sql`.
4. Vá em Project Settings > API.
5. Copie o Project URL.
6. Copie a anon public key.
7. Crie um arquivo `.env.local` na raiz do projeto.
8. Preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Nunca coloque a service role key no frontend. O app usa apenas a anon public key e as regras de Row Level Security do banco.

## Auth para uso imediato

Se quiser usar o app imediatamente sem confirmação por email, configure no Supabase:

Authentication > Providers > Email > desativar confirmação de email.

Não automatize isso no código. Essa é uma configuração do projeto Supabase.

## Login com Google

O botão "Continue with Google" usa Supabase Auth OAuth. Para funcionar em produção:

1. No Google Cloud Console, crie credenciais OAuth Client ID do tipo Web application.
2. Adicione o redirect URI autorizado:

```txt
https://SEU_PROJECT_REF.supabase.co/auth/v1/callback
```

3. No Supabase, vá em Authentication > Providers > Google.
4. Ative o provider Google.
5. Cole o Client ID e o Client Secret do Google.
6. Salve.

No projeto cloud criado para este app, o redirect URI é:

```txt
https://wnpdnkvsyhxdtqpbweue.supabase.co/auth/v1/callback
```

## Deploy na Vercel

1. Crie um repositório no GitHub.
2. Faça push do código.
3. Importe o repositório na Vercel.
4. Configure as variáveis de ambiente na Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

5. Faça deploy.

Você pode ter múltiplos projetos, apps e repositórios na mesma conta da Vercel, GitHub e Supabase, respeitando os limites do plano usado em cada plataforma.

## Banco e segurança

O arquivo `supabase/schema.sql` cria:

- `shopping_lists`
- `shopping_items`
- índices
- triggers de `updated_at`
- políticas de Row Level Security

Cada usuário só consegue selecionar, criar, editar e excluir as próprias listas e itens. Os itens também são validados contra a lista do mesmo usuário.

## Comandos úteis

```bash
npm install
npm run dev
npm run build
```

## Roadmap

- PWA.
- Modo offline.
- Compartilhar lista com família.
- Preços dos itens.
- Total estimado da compra.
- Histórico de compras.
- Templates favoritos.
- Realtime.
- Importação de cupom fiscal no futuro.
