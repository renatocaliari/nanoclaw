# GitHub Actions CI/CD - Build Automático do Agent

## 🎯 O Que Isso Resolve

**ANTES (Manual):**
```bash
# A cada mudança no agent:
docker build -t ...  # 2 min
docker push ...       # 1 min
❌ Total: 3-5 min de trabalho manual
```

**DEPOIS (Automático):**
```bash
# A cada mudança no agent:
git push  # 5 segundos
✅ Total: 0 trabalho manual!
```

---

## 📋 Como Funciona

### Gatilhos (quando roda)

O workflow roda automaticamente quando:

1. **Push para main:**
   ```bash
   git push origin main
   ```

2. **Push para branches feature/**:**
   ```bash
   git push origin feature/nova-tool
   ```

3. **Pull Request para main:**
   ```bash
   # Abre PR no GitHub
   # Workflow roda automaticamente
   ```

### Gatilhos Específicos

Só roda se mudar arquivos em `container/`:

```yaml
paths:
  - 'container/**'  # Agent runner, package.json, Dockerfile
  - '.github/workflows/build-agent.yml'  # Se mudar o workflow
```

**Exemplo:**
- ✅ Mudou `container/agent-runner/src/index.ts` → **RODA**
- ✅ Mudou `container/Dockerfile` → **RODA**
- ❌ Mudou `src/index.ts` → **NÃO roda**
- ❌ Mudou `docker-compose.yml` → **NÃO roda**

---

## 🚀 Primeira Configuração

### Passo 1: Adicionar o Workflow

O arquivo já foi criado:
```
.github/workflows/build-agent.yml
```

### Passo 2: Commit e Push

```bash
git add .github/workflows/build-agent.yml
git commit -m "ci: add GitHub Actions to build agent image"
git push origin main
```

### Passo 3: Verificar no GitHub

1. Acesse: https://github.com/SEU_USUARIO/nanoclaw/actions
2. Veja o workflow "Build Agent Container Image" rodando
3. Aguarde conclusão (~2-3 min)

### Passo 4: Verificar Imagem

```bash
# Verificar se imagem foi criada
docker pull ghcr.io/SEU_USUARIO/nanoclaw-agent:latest

# Se funcionar, sucesso! ✅
```

---

## 📝 Uso Cotidiano

### Cenário 1: Adicionar Nova Tool no Agent

```bash
# 1. Editar código
vim container/agent-runner/src/index.ts

# 2. Commit e push
git add container/agent-runner/src/index.ts
git commit -m "feat: add new tool"
git push origin main

# 3. GitHub Actions:
#    - Detecta mudança em container/
#    - Build automaticamente
#    - Push para ghcr.io
#    - Pronto! ✅

# 4. Atualizar .env.production no Dokploy
#    (se necessário)
```

### Cenário 2: Mudar Versão de Dependência

```bash
# 1. Atualizar
cd container/agent-runner
npm update @anthropic-ai/sdk

# 2. Commit e push
git add package.json package-lock.json
git commit -m "chore: update dependencies"
git push origin main

# 3. GitHub Actions build automático ✅
```

### Cenário 3: Correção de Bug

```bash
# 1. Fix bug
vim container/agent-runner/src/index.ts

# 2. Commit e push
git commit -m "fix: correct tool execution"
git push origin main

# 3. Imagem atualizada automaticamente ✅
```

---

## 🔧 Configuração do Dokploy

### Atualizar .env.production

```bash
# Mudar para usar imagem do GitHub
CONTAINER_IMAGE=ghcr.io/SEU_USUARIO/nanoclaw-agent:latest
```

**Vantagem:** Sempre atualizado, sem build manual!

---

## 🎛️ Customizações

### Mudar Tags

```yaml
tags: |
  type=ref,event=branch        # main, feature/xyz
  type=sha,prefix={{branch}}-  # main-abc1234
  type=raw,value=latest        # latest
  type=semver,pattern={{version}}  # v1.0.0
```

### Adicionar Testes

```yaml
- name: Test agent container
  run: |
    docker run --rm ghcr.io/${{ github.repository_owner }}/nanoclaw-agent:latest echo "Agent works!"
```

### Notificar no Slack

```yaml
- name: Notify Slack
  uses: 8398a7/action-slack-send@v3
  with:
    status: ${{ job.status }}
    text: 'Agent image built successfully!'
```

---

## 📊 Comparativo

| Aspecto                | Manual                     | CI/CD GitHub Actions         |
| ---------------------- | -------------------------- | ----------------------------- |
| **Tempo por mudança**    | 3-5 min                   | 0 seg (automático)         |
| **Esquecimento**        | Alto (precisa lembrar)    | Zero (automático)           |
| **Erros manuais**        | Build falha?             | Logs detalhados            |
|                        | Push falha?              | Retry automático           |
| **Histórico**            | Nada                      | Todas imagens versionadas   |
| **Multi-ambiente**       | Difícil                   | Builds paralelos            |
| **Custo**                | Seu tempo                 | Free (publi repos)          |

---

## ⚡ Performance

### Build Caching

O workflow usa cache para acelerar builds:

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

**Resultado:**
- Primeiro build: ~2 min
- Builds seguintes: ~30-60s (cache hit)

---

## 🐛 Troubleshooting

### Workflow não roda?

**Verificar:**
1. Arquivo no caminho certo: `.github/workflows/build-agent.yml`
2. Mudou arquivos em `container/`?
3. Branch é `main` ou `feature/*`?

**Verificar logs:**
```bash
# No GitHub
https://github.com/SEU_USUARIO/nanoclaw/actions
```

### Imagem não é criada?

**Verificar permissões:**
```bash
# Repository Settings → Actions → General
# ✅ Workflow permissions: Read and write permissions
```

**Verificar secrets:**
```
GitHub Actions NÃO precisa de secrets adicionais!
Usa GITHUB_TOKEN automático.
```

### Imagem criada mas Dokploy não puxa?

**Verificar se é pública:**
```bash
# Tentar pull anônimo
docker pull ghcr.io/SEU_USUARIO/nanoclaw-agent:latest

# Se pedir autenticação:
# Repository → Settings → Actions → General
# ✅ Workflow permissions
# ✅ Make repository public (ou configurar acesso)
```

**Tornar imagem pública:**
```yaml
# Adicionar ao workflow
permissions:
  packages: write
  contents: read
```

---

## ✅ Checklist

- [x] Workflow criado: `.github/workflows/build-agent.yml`
- [ ] Commit e push do workflow
- [ ] Verificar primeiro build no Actions
- [ ] Testar pull localmente
- [ ] Atualizar `.env.production` no Dokploy
- [ ] Deploy Dokploy
- [ ] Testar spawn de agent container

---

## 🎉 Pronto!

Depois disso:

```bash
# SÓ fazer:
git push

# E ESQUECER o resto! 🚀
```

**GitHub Actions cuida de tudo:**
- ✅ Build automático
- ✅ Push automático
- ✅ Versionamento automático
- ✅ Cache inteligente
- ✅ Logs detalhados

---

**É a melhor solução?** SIM! ✅

- **Zero trabalho manual**
- **Sempre atualizado**
- **Versionamento automático**
- **Histórico completo**
- **Retry automático em falhas**

**Quer que eu commit esse workflow agora?**
