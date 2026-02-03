# Deploy NanoClaw no Dokploy - Guia Passo a Passo

Guia completo para deploy do NanoClaw multi-container no Dokploy.

## 📋 Pré-requisitos

Antes de começar, verifique:

- [ ] Dokploy instalado e rodando
- [ ] Acesso ao terminal do servidor Dokploy
- [ ] Docker instalado no servidor
- [ ] Conta no registry Docker (Docker Hub ou GitHub Container Registry)
- [ ] API keys dos provedores de AI (z.ai, Anthropic, OpenAI)
- [ ] Código atualizado do NanoClaw

---

## 🚀 Passo 1: Preparar o Repositório

### 1.1. Verificar branch e arquivos

```bash
cd /path/to/nanoclaw

# Verificar arquivos Docker criados
ls -la | grep -E "docker-compose|Dockerfile|\.dockerignore"
# Esperado: docker-compose.yml, Dockerfile.app, .dockerignore

# Verificar documentação
ls -la docs/ | grep DOKPLOY
# Esperado: DOKPLOY_DEPLOYMENT.md
```

### 1.2. Validar docker-compose.yml

```bash
# Validar sintaxe do docker-compose
docker-compose config

# Se não houver erros, continue
# Se houver erros, corrija antes de prosseguir
```

---

## 🐳 Passo 2: Build e Push das Imagens Docker

### 2.1. Escolher Registry

**Opção A: Docker Hub** (mais simples)

```bash
# Login no Docker Hub
docker login

# Tag das imagens
docker tag nanoclaw-agent:latest SEU_USUARIO/nanoclaw-agent:latest
```

**Opção B: GitHub Container Registry** (integrado com GitHub)

```bash
# Login no GHCR
echo GITHUB_TOKEN | docker login ghcr.io -u SEU_USUARIO --password-stdin

# Tag das imagens
docker tag nanoclaw-agent:latest ghcr.io/SEU_USUARIO/nanoclaw-agent:latest
```

### 2.2. Build da Imagem de Agente

```bash
# Build da imagem do agente
docker build -t nanoclaw-agent:latest -f container/Dockerfile container/

# Verificar build
docker images | grep nanoclaw-agent
# Esperado: nanoclaw-agent latest <image-id> <size>
```

### 2.3. Push da Imagem

**Docker Hub:**

```bash
docker push SEU_USUARIO/nanoclaw-agent:latest
```

**GitHub Container Registry:**

```bash
docker push ghcr.io/SEU_USUARIO/nanoclaw-agent:latest
```

### 2.4. Atualizar .env.production

```bash
# Copiar template
cp .env.production.example .env.production

# Editar com suas credenciais
vim .env.production
```

**Variáveis CRÍTICAS para editar:**

```bash
# Registry da imagem (usar sua imagem pushada)
CONTAINER_IMAGE=SEU_USUARIO/nanoclaw-agent:latest
# OU
CONTAINER_IMAGE=ghcr.io/SEU_USUARIO/nanoclaw-agent:latest

# API keys (obrigatório)
ZAI_API_KEY=seu-zai-api-key-aqui
EMBEDDINGS_API_KEY=seu-openai-api-key-aqui

# Channel type
CHANNEL_TYPE=whatsapp
# OU
CHANNEL_TYPE=telegram
TELEGRAM_BOT_TOKEN=seu-telegram-token-aqui

# AI provider
AI_PROVIDER=zai
AI_MODEL=glm-4.7

# Timezone
TIMEZONE=America/Sao_Paulo
```

**⚠️ IMPORTANTE:** Nunca commitar `.env.production` com reais API keys!

---

## 📦 Passo 3: Preparar Deploy no Dokploy

### 3.1. Acessar Dokploy

```bash
# Abrir Dokploy no navegador
https://SEU-SERVIDOR-DOKPLOY
```

### 3.2. Conectar Repositório Git

1. **Clique em "New Project" ou "Create Application"**
2. **Selecione "Git" como fonte**
3. **Conectar sua conta GitHub:**
   - GitHub App (recomendado)
   - OU Personal Access Token
4. **Selecionar o fork do nanoclaw:**
   - `SEU_USUARIO/nanoclaw`
5. **Selecionar branch:** `main` (ou branch com suas mudanças)

### 3.3. Configurar Aplicação

**Tipo de Deploy:**

- ✅ Selecione **"Docker Compose"** ou **"Compose"**

**Configurações:**

```
Branch: main
Compose Path: docker-compose.yml
```

### 3.4. Adicionar Variáveis de Ambiente

**Método A: Upload do .env.production**

1. Clique em "Environment Variables"
2. Upload `.env.production`
3. Verificar se todas as vars aparecem

**Método B: Adicionar manualmente**

Adicionar as variáveis **obrigatórias:**

```
CHANNEL_TYPE=whatsapp
AI_PROVIDER=zai
AI_MODEL=glm-4.7
ZAI_API_KEY=seu-key-aqui
EMBEDDINGS_API_KEY=seu-key-aqui
EMBEDDINGS_PROVIDER=openai
CONTAINER_RUNTIME=docker
CONTAINER_IMAGE=SEU_USUARIO/nanoclaw-agent:latest
TIMEZONE=America/Sao_Paulo
LOG_LEVEL=info
DATA_DIR=/app/data
STORE_DIR=/app/store
GROUPS_DIR=/app/groups
VECTOR_DB_PATH=/app/vector-db
```

Variáveis **opcionais** (se usar Telegram):

```
TELEGRAM_BOT_TOKEN=seu-token-aqui
```

### 3.5. Configurar Volumes (Opcional)

Dokploy geralmente cria volumes automaticamente baseado no `docker-compose.yml`.

**Se quiser volumes nomeados específicos:**

1. Vá em "Volumes" no Dokploy
2. Verifique se estes volumes foram criados:
   - `nanoclaw-groups`
   - `nanoclaw-data`
   - `nanoclaw-store`
   - `nanoclaw-vector-db`
   - `nanoclaw-logs`

### 3.6. Configurar Domínio (Opcional)

1. Vá em "Domains" ou "Networking"
2. Adicionar domínio (se tiver)
3. Configure Traefik labels (se necessário)

---

## 🎯 Passo 4: Deploy Inicial

### 4.1. Iniciar Deploy

1. Clique em **"Deploy"** ou **"Start Deployment"**
2. Aguarde o pull do código
3. Aguarde o build da imagem `nanoclaw-app`
4. Aguarde o start dos containers

### 4.2. Acompanhar Logs

**Via Dokploy UI:**

1. Clique na aplicação
2. Aba "Logs"
3. Verificar se não há erros

**O que procurar nos logs:**

✅ **Logs positivos:**

```
NanoClaw starting...
Container runtime: docker
Connected to WhatsApp
Bot started
```

❌ **Logs de erro:**

```
Error: Cannot connect to Docker daemon
Error: API key missing
Error: Cannot pull container image
```

### 4.3. Troubleshooting Inicial

**Erro: Cannot pull container image**

```bash
# Verificar se a imagem existe no registry
docker pull SEU_USUARIO/nanoclaw-agent:latest

# Se falhar, rebuild e push
docker build -t SEU_USUARIO/nanoclaw-agent:latest -f container/Dockerfile container/
docker push SEU_USUARIO/nanoclaw-agent:latest
```

**Erro: API key missing**

```bash
# Verificar variáveis de ambiente no Dokploy
# Conferir se ZAI_API_KEY e EMBEDDINGS_API_KEY estão setadas
```

**Erro: Permission denied**

```bash
# Verificar permissões do Docker socket
docker logs nanoclaw-main
```

---

## ✅ Passo 5: Verificação Pós-Deploy

### 5.1. Verificar Status dos Containers

```bash
# No servidor Dokploy
docker ps | grep nanoclaw
# Esperado: nanoclaw-main rodando

# Verificar se container agent está disponível
docker images | grep nanoclaw-agent
# Esperado: nanoclaw-agent latest
```

### 5.2. Verificar Logs

```bash
# Logs da aplicação
docker logs nanoclaw-main --tail 50 -f

# Procurar por erros
docker logs nanoclaw-main 2>&1 | grep -i error
```

### 5.3. Testar WhatsApp (se usando)

1. **Enviar mensagem para o bot:**
   - Use o número configurado
   - Ou use o QR code para autenticar

2. **Verificar logs:**

   ```
   Connected to WhatsApp
   Received message from +55...
   Spawning container agent
   Container completed
   ```

3. **Enviar mensagem de teste:**

   ```
   @Andy ola
   ```

4. **Verificar resposta:**
   - Bot deve responder

### 5.4. Testar Telegram (se usando)

1. **Iniciar conversa com o bot no Telegram**
2. **Enviar `/start`**
3. **Verificar logs Dokploy**
4. **Enviar mensagem de teste**

---

## 🔧 Passo 6: Configuração Pós-Deploy

### 6.1. Autenticação WhatsApp (Se Applicable)

Se usando WhatsApp e primeira vez:

1. **Verificar logs para QR code:**

   ```
   QR Code received: ...
   ```

2. **Escaneiar QR code:**
   - Abrir WhatsApp no celular
   - Menu → Dispositivos conectados
   - Vincular um dispositivo
   - Escanear QR code

3. **Verificar logs:**
   ```
   WhatsApp connection successful
   ```

### 6.2. Configurar KNOWLEDGE.md

```bash
# Acessar container (via Dokploy ou SSH)
docker exec -it nanoclaw-main bash

# Editar KNOWLEDGE.md do grupo main
vim /app/groups/main/KNOWLEDGE.md

# Adicionar conhecimento inicial
```

Exemplo:

```markdown
# NanoClaw - Main Channel

## Contexto

Você é Andy, assistente pessoal AI.

## Comportamento

- Seja conciso e direto
- Use português brasileiro
- Emojis moderadamente

## Capacidades

- Criar e gerenciar projetos
- Analisar código
- Acessar GitHub
- Ler arquivos
- Avaliar notícias
- Monitorar saúde
```

### 6.3. Testar Agentes

```bash
# Testar spawn de container
# Enviar mensagem no WhatsApp/Telegram:
@Andy teste

# Verificar logs
docker logs nanoclaw-main --tail 20
```

Logs esperados:

```
Spawning container agent
Mounts: /app/groups/main -> /workspace/group
Container completed with status: success
```

---

## 📊 Passo 7: Monitoramento e Manutenção

### 7.1. Logs Contínuos

```bash
# Follow logs em tempo real
docker logs nanoclaw-main -f

# Logs com timestamp
docker logs nanoclaw-main -f --timestamps

# Logs apenas erros
docker logs nanoclaw-main 2>&1 | grep -i error
```

### 7.2. Métricas de Recursos

```bash
# CPU e Memória
docker stats nanoclaw-main

# Disk usage
docker exec nanoclaw-main df -h

# Container disk usage
docker system df
```

### 7.3. Backups

**Backups dos Volumes:**

```bash
# Listar volumes
docker volume ls | grep nanoclaw

# Backup de volume específico
docker run --rm \
  -v nanoclaw-groups:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/nanoclaw-groups-$(date +%Y%m%d).tar.gz /data

# Backup de todos os volumes
for vol in nanoclaw-groups nanoclaw-data nanoclaw-store nanoclaw-vector-db nanoclaw-logs; do
  docker run --rm \
    -v ${vol}:/data \
    -v $(pwd):/backup \
    alpine tar czf /backup/${vol}-$(date +%Y%m%d).tar.gz /data
done
```

### 7.4. Atualizações

**Quando atualizar código:**

1. **Push nova versão:**

   ```bash
   git push origin main
   ```

2. **Rebuild e push imagens:**

   ```bash
   # Se mudou container
   docker build -t SEU_USUARIO/nanoclaw-agent:latest -f container/Dockerfile container/
   docker push SEU_USUARIO/nanoclaw-agent:latest
   ```

3. **Redeploy no Dokploy:**
   - Clique "Redeploy"
   - OU trigger manual deploy

---

## 🐛 Troubleshooting Comum

### Problema: Container não inicia

**Sintoma:**

```
Error: Cannot start service nanoclaw-main
```

**Solução:**

```bash
# Verificar logs detalhados
docker-compose logs nanoclaw-main

# Verificar se imagem foi buildada
docker images | grep nanoclaw-app

# Verificar variáveis de ambiente
docker exec nanoclaw-main env | grep -E "API_KEY|TOKEN"
```

### Problema: Agent containers não spawnam

**Sintoma:**

```
Error: Failed to spawn container agent
```

**Solução:**

```bash
# Verificar se imagem de agent existe
docker images | grep nanoclaw-agent

# Verificar se Docker socket está montado
docker exec nanoclaw-main ls -la /var/run/docker.sock

# Testar spawn manual
docker exec nanoclaw-main docker run --rm nanoclaw-agent:latest echo test
```

### Problema: WhatsApp desconecta

**Sintoma:**

```
WhatsApp connection lost
Reconnecting...
```

**Solução:**

```bash
# Verificar auth state
docker exec nanoclaw-main ls -la /app/store/

# Se auth perdido, reautenticar
# 1. Delete auth state
docker exec nanoclaw-main rm -rf /app/store/baileys_auth_info

# 2. Restart container
docker restart nanoclaw-main

# 3. Re-escanear QR code
```

### Problema: Alto consumo de memória

**Sintoma:**

```
Container OOM killed
```

**Solução:**

```bash
# Aumentar limite de memória no docker-compose.yml
# Editar:
deploy:
  resources:
    limits:
      memory: 4G  # aumentar de 2G

# Redeploy
```

### Problema: Logs não aparecem

**Sintoma:**

```
Sem logs no Dokploy
```

**Solução:**

```bash
# Verificar logs direto do container
docker logs nanoclaw-main

# Verificar se logging está habilitado
docker exec nanoclaw-main cat /app/logs/nanoclaw.log

# Verificar LOG_LEVEL
docker exec nanoclaw-main env | grep LOG_LEVEL
```

---

## 🎉 Sucesso!

Se tudo deu certo, você deve ter:

- ✅ NanoClaw rodando no Dokploy
- ✅ Containers saudáveis
- ✅ WhatsApp/Telegram conectado
- ✅ Agent containers spawnando
- ✅ Logs sem erros críticos

### Próximos Passos

1. **Configurar agentes especializados**
   - Criar grupos para diferentes propósitos
   - Adicionar KNOWLEDGE.md específicos

2. **Configurar tools**
   - GitHub integration
   - Google Drive
   - NotebookLM
   - Etc.

3. **Monitorar**
   - Setar alertas de logs
   - Configurar backups automáticos

4. **Documentar**
   - Registrar suas configurações
   - Criar runbooks para troubleshooting

---

## 📞 Suporte

**Problemas?**

1. **Verificar logs primeiro**
2. **Consultar docs:**
   - `docs/DOKPLOY_DEPLOYMENT.md`
   - `README_DOCKER.md`
3. **GitHub Issues:**
   - `renatocaliari/nanoclaw`

---

**Última atualização:** 2025-02-03
**Versão:** 1.0.0
