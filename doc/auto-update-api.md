# Auto-Update API — CodeCraft Gen-Z Apps

API universal de atualização automática para todos os apps da empresa.

---

## Arquitetura

```
App cliente (Tauri/WPF)
    │ GET /api/updates/{slug}  (na inicialização)
    ▼
api.codecraftgenz.com.br
    │ Consulta App.slug no banco
    ▼
Retorna manifest JSON (version, url, signature)
    │
App compara versão atual vs remota
    │ Se remota > atual: mostra dialog
    ▼
Usuário confirma → baixa/instala novo instalador
```

---

## Endpoint público

### `GET https://api.codecraftgenz.com.br/api/updates/:slug`

Sem autenticação. Retorna `204 No Content` se o app não tiver release cadastrada.

**Resposta (200):**
```json
{
  "version": "1.2.0",
  "notes": "O que há de novo nesta versão",
  "pub_date": "2026-05-16T00:00:00.000Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "conteúdo do arquivo .sig gerado pelo tauri build",
      "url": "https://codecraftgenz.com.br/downloads/meuapp-1.2.0-setup.exe"
    }
  }
}
```

---

## Slugs dos apps

| App           | Slug          | Tipo        |
|---------------|---------------|-------------|
| ReflexCraft   | reflexcraft   | Tauri v1    |
| CoinCraft2    | coincraft2    | Tauri v2    |
| DeskCraft     | deskcraft     | Tauri v2    |
| SnippetCraft  | snippetcraft  | Tauri v2    |
| VaultCraft    | vaultcraft    | Tauri v2    |
| CoinCraft     | coincraft     | WPF .NET 8  |
| PresenceCraft | presencecraft | WPF .NET 4  |
| QuizCraft     | quizcraft     | WPF .NET 9  |
| StudyCraft    | studycraft    | WPF .NET 8  |

---

## Como publicar uma nova versão

### Passo 1 — Build com assinatura (apps Tauri)

Configure a variável de ambiente antes do build:

```powershell
# Windows PowerShell
$env:TAURI_SIGNING_PRIVATE_KEY = "<conteúdo do arquivo D:\tauri-codecraft.key>"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""  # sem senha

cd D:\CraftApps\ReflexCraft
npm run tauri build
```

O build gera em `src-tauri/target/release/bundle/nsis/`:
- `ReflexCraft_0.2.0_x64-setup.exe` — instalador
- `ReflexCraft_0.2.0_x64-setup.exe.sig` — assinatura (conteúdo é o que vai no campo `signature`)

### Passo 2 — Upload do instalador

Faça upload do `.exe` para o Hostinger (pasta `/downloads` via SFTP ou painel admin).
Copie a URL final do arquivo, ex: `https://codecraftgenz.com.br/downloads/ReflexCraft_0.2.0_x64-setup.exe`

### Passo 3 — Registrar a release no banco

**Primeiro**, descubra o `id` do app no banco (use o painel admin ou consulta direta).

**Depois**, faça a chamada autenticada como admin:

```bash
curl -X POST https://api.codecraftgenz.com.br/api/apps/{APP_ID}/release \
  -H "Authorization: Bearer {SEU_JWT_ADMIN}" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "0.2.0",
    "executableUrl": "https://codecraftgenz.com.br/downloads/ReflexCraft_0.2.0_x64-setup.exe",
    "changelog": "- Melhorias de performance\n- Correções de bugs",
    "signature": "<conteúdo do arquivo .sig>",
    "slug": "reflexcraft"
  }'
```

> **Nota:** `slug` só precisa ser enviado na primeira vez. Nas releases seguintes pode omitir.

---

## Configuração de ambiente para build Tauri

A chave privada fica em `D:\tauri-codecraft.key` (não commitada no git).

Configure no seu ambiente de build:

| Variável                             | Valor                                           |
|--------------------------------------|-------------------------------------------------|
| `TAURI_SIGNING_PRIVATE_KEY`          | Conteúdo do arquivo `D:\tauri-codecraft.key`   |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | (vazio — chave sem senha)                       |

**Para CI/CD (GitHub Actions):**
```yaml
- name: Build Tauri app
  env:
    TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ""
  run: npm run tauri build
```

Adicione o conteúdo de `D:\tauri-codecraft.key` como secret `TAURI_SIGNING_PRIVATE_KEY` no GitHub.

---

## Chave pública (já embutida em todos os apps)

```
dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDVBRUIxQTA3RTk0MjIyMUEKUldRYUlrTHBCeHJyV3F6T1NZNEV6WFFDREZCcHQ3cTd3cVVPOVA4TTlNNGgyTHJLWktXeGxJZmwK
```

---

## Apps WPF — como funciona

Os apps WPF verificam atualizações 3 segundos após iniciar. Não há assinatura (só Tauri exige). O campo `signature` pode ser vazio no JSON para apps WPF.

No banco, ao publicar uma release para app WPF, o campo `signature` pode ser omitido ou enviado como string vazia.

---

## Arquivos modificados nesta implementação

### Backend (codecraftgenz-monorepo)
- `backend/prisma/schema.prisma` — campos `slug`, `changelog`, `signature`, `releaseDate` adicionados ao model `App`
- `backend/src/routes/updates.ts` — endpoint público `GET /:slug`
- `backend/src/routes/index.ts` — montagem em `/api/updates`
- `backend/src/routes/apps.ts` — endpoint admin `POST /:id/release`
- **Commit:** `88d71dc feat(backend): auto-update API`

### Tauri apps (D:\CraftApps)
- `ReflexCraft/src-tauri/tauri.conf.json` — updater ativado (v1)
- `CoinCraft2/` — tauri.conf.json, Cargo.toml, lib.rs, capabilities
- `DeskCraft/` — idem
- `SnippetCraft/` — idem (capabilities criado do zero)
- `VaultCraft/` — idem

### WPF apps (D:\CraftApps)
- `CoinCraft/src/CoinCraft.App/Services/UpdateService.cs`
- `QuizCraft/src/QuizCraft.Presentation/Services/UpdateService.cs`
- `StudyCraft/src/StudyCraft.App/Services/UpdateService.cs`
- `PresenceCraft/PresenceCraft/PresenceCraft/UpdateService.cs` (Newtonsoft.Json, sem git)
