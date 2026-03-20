# Configurar Sincronização (GitHub Pages + Supabase)

## 1) Criar projeto no Supabase
1. Acesse `https://supabase.com` e crie um projeto.
2. Abra **SQL Editor**.
3. Execute o conteúdo do arquivo `supabase/setup.sql`.

## 2) Pegar URL e chave ANON
1. Vá em **Project Settings** > **API**.
2. Copie:
   - **Project URL**
   - **anon public key**

## 3) Preencher `sync-config.js`
Edite o arquivo `sync-config.js` na raiz do site:

```js
window.ARC_SYNC = {
  provider: "supabase",
  url: "https://SEU-PROJETO.supabase.co",
  anonKey: "SUA_CHAVE_ANON_AQUI",
  table: "site_state",
  rowId: "global",
  pollMs: 5000
};
```

## 4) Publicar no GitHub Pages
Suba estes arquivos atualizados:
- `index.html`
- `status.html`
- `login.html`
- `sync-config.js`
- `supabase/setup.sql` (opcional, só referência)

## 5) Teste
1. Abra o site em 2 navegadores/dispositivos.
2. Poste um grrrarrr no admin.
3. Aguarde até 5 segundos ou atualize a aba.

Se aparecer erro de permissão, revise as policies do `setup.sql` no Supabase.
