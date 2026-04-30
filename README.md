# Mercado Rápido

## Descrição

Aplicativo simples de lista de compras com Supabase. Ele permite criar listas, adicionar itens por categoria, marcar comprados, compartilhar lista com familiar, duplicar listas antigas, importar NFC-e, estimar valores, arquivar listas e sincronizar os dados entre dispositivos após login.

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

As tabelas e políticas são aplicadas pelas migrations em `supabase/migrations/`.

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
- `shopping_list_collaborators`
- índices
- triggers de `updated_at`
- políticas de Row Level Security

Cada usuário consegue selecionar, criar, editar e excluir as próprias listas e itens. Uma lista também pode ser acessada por um familiar quando o dono copia o link familiar dentro do app e envia por WhatsApp ou outro app de mensagem. O familiar precisa estar logado e, ao abrir o link, entra como colaborador da lista.

## Funcionalidades

- Login por email/senha e Google via Supabase Auth.
- Criar, renomear, duplicar, excluir e arquivar listas.
- Compartilhar uma lista por link interno do app.
- Adicionar itens com categoria, quantidade e preço estimado.
- Importar itens de NFC-e pelo QR Code/link público da SEFAZ-RS/SVRS.
- Marcar itens como comprados, editar, excluir e mover para cima/baixo.
- Ver total estimado da lista e total já marcado como comprado.
- Finalizar compra para manter a lista no histórico.

## Importação de NFC-e

Na tela da lista, abra o menu de três pontos e selecione `Importar NFC-e`. O app tenta ler o QR Code com a câmera do celular ou permite colar o link da consulta pública.

A importação usa uma rota server-side do próprio Next.js para buscar a página pública da SEFAZ-RS/SVRS, extrair produtos, quantidades e valores unitários, e inserir os itens na lista atual. Se a SEFAZ alterar o HTML da consulta ou exigir validação manual, a importação pode falhar e mostrar uma mensagem para tentar novamente.

## Comandos úteis

```bash
npm install
npm run dev
npm run build
```

## Roadmap

- PWA.
- Modo offline.
- Templates favoritos.
- Realtime.
