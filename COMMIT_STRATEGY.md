# Git Commit Strategy - Clean PR

## Estrutura Sugerida de Commits

Para um PR limpo e organizado, recomendo criar múltiplos commits semânticos:

### Opção 1: Commits Funcionais (Recomendado)

```bash
# Commit 1: Core infrastructure
git add .gitignore container/Dockerfile container/agent-runner/package.json
git commit -m "build: update container dependencies and Docker config

- Update container/agent-runner/package.json with new dependencies
- Simplify container/Dockerfile for multi-provider support
- Remove unused ipc-mcp.ts (old MCP implementation)
- Update .gitignore for production builds
"

# Commit 2: Channel abstraction layer
git add src/channels/ src/index.ts src/types.ts src/db.ts
git commit -m "feat: add channel abstraction layer

- Add ChannelClient interface and implementations
- Implement WhatsAppChannel with Baileys
- Implement TelegramChannel with Telegraf
- Refactor main app to use channel abstraction
- Update types for sender_jid consistency
- Update DB schema for NewMessage type
"

# Commit 3: Multi-provider AI + Vector memory
git add container/agent-runner/
git commit -m "feat: add multi-provider AI support and LanceDB integration

- Replace Claude Agent SDK with Vercel AI SDK
- Add support for z.ai, Anthropic, OpenAI providers
- Integrate LanceDB for vector memory
- Implement hybrid memory (KNOWLEDGE.md + LanceDB)
- Add provider factory for easy switching
- Graceful fallback if LanceDB fails
"

# Commit 4: Memory system migration
git add groups/
git commit -m "refactor: migrate to KNOWLEDGE.md for provider-agnostic naming

- Rename CLAUDE.md to KNOWLEDGE.md (main + global)
- Update all references to new naming
- Maintain backward compatibility
"

# Commit 5: Docker deployment setup
git add docker-compose.yml Dockerfile.app .dockerignore .env.production.example
git commit -m "feat: add Docker Compose deployment for Dokploy

- Add docker-compose.yml with multi-container setup
- Create Dockerfile.app for main application
- Add .dockerignore for optimized builds
- Add .env.production.example template
- Configure volumes, networks, health checks
- Support Docker socket mount for spawning agents
"

# Commit 6: Documentation
git add MIGRATION_PLAN.md IMPLEMENTATION_SUMMARY.md NEXT_STEPS.md STATUS_UPDATE.md
git commit -m "docs: add comprehensive implementation documentation

- Add MIGRATION_PLAN.md with 5-phase strategy
- Add IMPLEMENTATION_SUMMARY.md with technical details
- Add NEXT_STEPS.md for user setup guide
- Add STATUS_UPDATE.md for progress tracking
"

# Commit 7: Deployment guides
git add README_DOCKER.md DOCKER_COMPOSE_STATUS.md docs/DOKPLOY_DEPLOYMENT.md docs/DOKPLOY_STEP_BY_STEP.md PULL_REQUEST_TEMPLATE.md
git commit -m "docs: add Docker and Dokploy deployment guides

- Add README_DOCKER.md with architecture overview
- Add DOCKER_COMPOSE_STATUS.md with deployment summary
- Add DOKPLOY_DEPLOYMENT.md with complete guide
- Add DOKPLOY_STEP_BY_STEP.md with tutorial
- Add PULL_REQUEST_TEMPLATE.md for PR description
"
```

### Opção 2: Commit Único (Mais Simples)

```bash
# Add tudo de uma vez
git add .
git commit -m "feat: multi-provider AI, Telegram, LanceDB + Dokploy deployment

BREAKING CHANGE: CLAUDE.md renamed to KNOWLEDGE.md

Features:
- Multi-provider AI support (z.ai, Anthropic, OpenAI)
- Telegram channel integration
- LanceDB vector memory with hybrid system
- Channel abstraction layer for easy expansion
- Docker Compose deployment for Dokploy
- Comprehensive documentation

Architecture:
- Maintains multi-container security model
- OS-level isolation per group
- Agent containers spawned dynamically
- Docker socket for container spawning

Changes:
- Replace Claude Agent SDK with Vercel AI SDK
- Add channel abstraction (WhatsApp, Telegram)
- Integrate LanceDB for semantic search
- Hybrid memory: KNOWLEDGE.md + Vector DB
- Docker Compose ready for Dokploy
- Provider switching via environment variables

Docs:
- Complete deployment guide for Dokploy
- Step-by-step setup tutorial
- Implementation details and architecture
- Migration plan from original setup

Closes #issue-number (if applicable)
"
```

## Comandos para Organizar

### Criar branch para PR

```bash
# Criar branch feature
git checkout -b feature/multi-provider-dokploy

# Fazer commits seguindo Estrutura 1 (recomendado)
# ... commits acima ...

# Push para origin
git push -u origin feature/multi-provider-dokploy
```

### Criar Pull Request

```bash
# Via GitHub CLI
gh pr create \
  --title "feat: Multi-Provider AI, Telegram, LanceDB + Dokploy Deployment" \
  --body-file PULL_REQUEST_TEMPLATE.md \
  --base main \
  --head feature/multi-provider-dokploy

# OU manual no GitHub:
# 1. Acesse https://github.com/renatocaliari/nanoclaw
# 2. Clique em "Compare & pull request"
# 3. Seleccione o branch feature/multi-provider-dokploy
# 4. Copie conteúdo de PULL_REQUEST_TEMPLATE.md
# 5. Crie o PR
```

## Verificação Antes de Commitar

### 1. Verificar arquivos modificados

```bash
git status

# Deve mostrar:
# modified:   container/Dockerfile
# modified:   container/agent-runner/package.json
# modified:   container/agent-runner/src/index.ts
# deleted:    container/agent-runner/src/ipc-mcp.ts
# modified:   groups/global/CLAUDE.md → groups/global/KNOWLEDGE.md
# modified:   groups/main/CLAUDE.md → groups/main/KNOWLEDGE.md
# modified:   package-lock.json
# modified:   package.json
# modified:   src/container-runner.ts
# modified:   src/db.ts
# modified:   src/index.ts
# modified:   src/types.ts
# new files:  src/channels/, docker-compose.yml, etc
```

### 2. Verificar diff

```bash
# Diff de todos os arquivos
git diff

# Diff de arquivo específico
git diff src/container-runner.ts

# Diff de staged changes
git diff --staged
```

### 3. Verificar se nada foi esquecido

```bash
# Arquivos não commitados
git ls-files --others --exclude-standard

# Deveria mostrar apenas:
# .env (local dev, não commitar)
# .env.production (só commitar .env.production.example)
# node_modules/ (já no .gitignore)
```

## Checklist Antes de Push

- [x] Todos os arquivos criados/modifyados corretamente
- [x] TypeScript compila sem erros
- [x] .env.example criado (sem reais API keys)
- [x] Documentação completa
- [x] Commits semânticos e organizados
- [x] Branch criado e atualizado
- [x] PULL_REQUEST_TEMPLATE.md criado
- [ ] `.env.production` NÃO commitado (adicionar ao .gitignore)

## Adicionar .env.production ao .gitignore

```bash
# Adicionar ao .gitignore
echo ".env.production" >> .gitignore

# Commit adicional
git add .gitignore
git commit -m "chore: add .env.production to gitignore"
```

## Resumo dos Arquivos para Commit

### Deve Commitar ✅

```
modified:   container/Dockerfile
modified:   container/agent-runner/package.json
modified:   container/agent-runner/src/index.ts
deleted:    container/agent-runner/src/ipc-mcp.ts
renamed:    groups/global/CLAUDE.md -> groups/global/KNOWLEDGE.md
renamed:    groups/main/CLAUDE.md -> groups/main/KNOWLEDGE.md
modified:   package-lock.json
modified:   package.json
modified:   src/container-runner.ts
modified:   src/db.ts
modified:   src/index.ts
modified:   src/types.ts

new file:   src/channels/telegram.ts
new file:   src/channels/types.ts
new file:   src/channels/whatsapp.ts
new file:   docker-compose.yml
new file:   Dockerfile.app
new file:   .dockerignore
new file:   .env.production.example
new file:   MIGRATION_PLAN.md
new file:   IMPLEMENTATION_SUMMARY.md
new file:   NEXT_STEPS.md
new file:   STATUS_UPDATE.md
new file:   README_DOCKER.md
new file:   DOCKER_COMPOSE_STATUS.md
new file:   docs/DOKPLOY_DEPLOYMENT.md
new file:   docs/DOKPLOY_STEP_BY_STEP.md
new file:   PULL_REQUEST_TEMPLATE.md
new file:   container/build-docker.sh
```

### NÃO Deve Commitar ❌

```
.env (local development)
.env.production (production secrets)
node_modules/
dist/
*.log
```

## Script Automatizado (Opcional)

```bash
#!/bin/bash
# commit-script.sh

echo "Creating organized commits for NanoClaw multi-provider update"

# Commit 1: Build infra
git add .gitignore container/Dockerfile container/agent-runner/package.json container/agent-runner/src/ipc-mcp.ts
git commit -m "build: update container dependencies and Docker config"

# Commit 2: Channel abstraction
git add src/channels/ src/index.ts src/types.ts src/db.ts
git commit -m "feat: add channel abstraction layer"

# Commit 3: Multi-provider + LanceDB
git add container/agent-runner/
git commit -m "feat: add multi-provider AI support and LanceDB integration"

# Commit 4: Memory migration
git add groups/
git commit -m "refactor: migrate to KNOWLEDGE.md for provider-agnostic naming"

# Commit 5: Docker setup
git add docker-compose.yml Dockerfile.app .dockerignore .env.production.example
git commit -m "feat: add Docker Compose deployment for Dokploy"

# Commit 6: Core docs
git add MIGRATION_PLAN.md IMPLEMENTATION_SUMMARY.md NEXT_STEPS.md STATUS_UPDATE.md
git commit -m "docs: add comprehensive implementation documentation"

# Commit 7: Deployment docs
git add README_DOCKER.md DOCKER_COMPOSE_STATUS.md docs/DOKPLOY_DEPLOYMENT.md docs/DOKPLOY_STEP_BY_STEP.md PULL_REQUEST_TEMPLATE.md
git commit -m "docs: add Docker and Dokploy deployment guides"

echo "✅ All commits created!"
echo "Run: git push -u origin feature/multi-provider-dokploy"
```

Usar:

```bash
chmod +x commit-script.sh
./commit-script.sh
```

---

**Pronto!** Siga a "Opção 1" de commits para um PR limpo e profissional.
