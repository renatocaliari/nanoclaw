<p align="center">
  <img src="assets/nanoclaw-logo.png" alt="NanoClaw" width="400">
</p>

<p align="center">
  Multi-provider AI assistant with secure container isolation. Supports WhatsApp, Telegram, and vector memory for semantic search.
</p>

## Why I Built This

[OpenClaw](https://github.com/openclaw/openclaw) is an impressive project with a great vision. But I can't sleep well running software I don't understand with access to my life. OpenClaw has 52+ modules, 8 config management files, 45+ dependencies, and abstractions for 15 channel providers. Security is application-level (allowlists, pairing codes) rather than OS isolation. Everything runs in one Node process with shared memory.

NanoClaw gives you the same core functionality in a codebase you can understand in 8 minutes. One process. A handful of files. Agents run in actual Linux containers with filesystem isolation, not behind permission checks.

**What's New:** This fork has been enhanced with:
- **Multi-provider AI** - Switch between z.ai, Anthropic Claude, and OpenAI GPT models
- **Telegram support** - Use Telegram instead of (or in addition to) WhatsApp
- **Vector memory** - LanceDB semantic search across conversation history
- **Docker deployment** - Deploy to Dokploy or any Docker host with docker-compose

## Quick Start (Docker Deployment)

The fastest way to run NanoClaw is with Docker:

```bash
git clone https://github.com/renatocaliari/nanoclaw.git
cd nanoclaw
```

Then follow the **[10-minute deployment guide](QUICK_START_DOKPLOY.md)** to deploy to Dokploy or any Docker host.

**Quick Start Steps:**
1. Get API keys (z.ai, OpenAI for embeddings, Telegram bot token)
2. Copy `docker-compose.yml` to your Docker host
3. Configure environment variables
4. Deploy with `docker-compose up -d`

That's it. NanoClaw will be running in isolated containers with multi-provider AI support.

## Quick Start (Local Development)

For local development with Claude Code:

```bash
git clone https://github.com/gavrielc/nanoclaw.git
cd nanoclaw
claude
```

Then run `/setup`. Claude Code handles everything: dependencies, authentication, container setup, service configuration.

## Philosophy

**Small enough to understand.** One process, a few source files. No microservices, no message queues, no abstraction layers. Have Claude Code walk you through it.

**Secure by isolation.** Agents run in Linux containers (Apple Container on macOS, or Docker). They can only see what's explicitly mounted. Bash access is safe because commands run inside the container, not on your host.

**Built for one user.** This isn't a framework. It's working software that fits my exact needs. You fork it and have Claude Code make it match your exact needs.

**Customization = code changes.** No configuration sprawl. Want different behavior? Modify the code. The codebase is small enough that this is safe.

**AI-native.** No installation wizard; Claude Code guides setup. No monitoring dashboard; ask Claude what's happening. No debugging tools; describe the problem, Claude fixes it.

**Multi-provider flexibility.** Switch between AI providers based on your needs. z.ai for cost-effective general purpose, Claude for complex reasoning, GPT-4 for specific tasks. The Vercel AI SDK makes this seamless.

**Skills over features.** Contributors shouldn't add features (e.g. support for Telegram) to the codebase. Instead, they contribute [claude code skills](https://code.claude.com/docs/en/skills) like `/add-telegram` that transform your fork. You end up with clean code that does exactly what you need.

## What It Supports

### Communication Channels
- **WhatsApp I/O** - Message Claude from your phone
- **Telegram I/O** - Use Telegram bots for the same functionality
- **Channel abstraction** - Easy to add new channels (Discord, Slack, etc.)

### AI Providers
- **z.ai** - GLM-4.7, GLM-4.5 (cost-effective, fast)
- **Anthropic Claude** - Claude 3.5 Sonnet, Haiku, Opus (complex reasoning)
- **OpenAI** - GPT-4, GPT-3.5 (general purpose)
- **Vercel AI SDK** - Unified interface across providers

### Memory & Context
- **Isolated group context** - Each group has its own `CLAUDE.md` memory, isolated filesystem, and runs in its own container sandbox with only that filesystem mounted
- **Vector memory** - LanceDB semantic search across conversation history
- **Hybrid memory** - Combines vector search with knowledge base for rich context
- **Main channel** - Your private channel (self-chat) for admin control; every other group is completely isolated

### Automation
- **Scheduled tasks** - Recurring jobs that run Claude and can message you back
- **Web access** - Search and fetch content
- **Tool execution** - Agents can run bash commands (in isolated containers)

### Deployment
- **Docker deployment** - Deploy with docker-compose to any host
- **Dokploy support** - Ready-to-use deployment configuration
- **Container isolation** - Agents sandboxed in Docker with explicit mounts
- **Multi-architecture** - Supports linux/amd64 and linux/arm64

## Usage

Talk to your assistant with the trigger word (default: `@Andy`):

```
@Andy send an overview of the sales pipeline every weekday morning at 9am (has access to my Obsidian vault folder)
@Andy review the git history for the past week each Friday and update the README if there's drift
@Andy every Monday at 8am, compile news on AI developments from Hacker News and TechCrunch and message me a briefing
```

From the main channel (your self-chat), you can manage groups and tasks:
```
@Andy list all scheduled tasks across groups
@Andy pause the Monday briefing task
@Andy join the Family Chat group
```

Switch AI providers on the fly:
```
@Andy switch to GPT-4 for this task
@Andy use Haiku for faster responses
```

## Customizing

There are no configuration files to learn. Just tell Claude Code what you want:

- "Change the trigger word to @Bob"
- "Remember in the future to make responses shorter and more direct"
- "Add a custom greeting when I say good morning"
- "Store conversation summaries weekly"
- "Use z.ai as the default provider"

Or run `/customize` for guided changes.

The codebase is small enough that Claude can safely modify it.

## Deployment

### Docker Deployment (Recommended)

For production deployment, use Docker Compose:

1. **Read the deployment guide:** [QUICK_START_DOKPLOY.md](QUICK_START_DOKPLOY.md)
2. **Get your API keys:** z.ai, OpenAI (for embeddings), Telegram bot token
3. **Configure environment:** Copy `docker-compose.yml` and set environment variables
4. **Deploy:** `docker-compose up -d`

See [DEPLOYMENT_READINESS_CHECKLIST.md](DEPLOYMENT_READINESS_CHECKLIST.md) for the complete deployment checklist.

### Local Development

For local development with Claude Code:

```bash
claude
/setup
```

Claude Code will guide you through dependencies, authentication, and container setup.

## Architecture

```
WhatsApp/Telegram --> SQLite --> Polling loop --> Agent Container (Multi-Provider AI) --> Response
                                                        |
                                                    LanceDB
                                                        |
                                               Vector Memory Search
```

**Multi-Container Architecture:**
- **Main process** (Node.js): Handles WhatsApp/Telegram connections, message routing, task scheduling
- **Agent containers** (Docker): Isolated environments for each group/chat with AI execution
- **Vector database** (LanceDB): Semantic search across conversation history
- **IPC**: Filesystem-based communication between main process and agents

**Key Files:**
- `src/index.ts` - Main app: WhatsApp/Telegram connections, routing, IPC
- `src/channels/` - Channel abstraction layer (WhatsApp, Telegram)
- `src/container-runner.ts` - Spawns agent containers
- `src/task-scheduler.ts` - Runs scheduled tasks
- `src/db.ts` - SQLite operations
- `container/agent-runner/` - Agent container with multi-provider AI
- `container/agent-runner/src/index.ts` - Vercel AI SDK integration
- `groups/*/CLAUDE.md` - Per-group memory

**Multi-Provider AI:**
```typescript
// Provider factory in container/agent-runner/src/index.ts
switch (provider) {
  case 'zai': return createOpenAI({ baseURL: zaiBaseUrl, apiKey: zaiKey })
  case 'anthropic': return createAnthropic({ apiKey: anthropicKey })
  case 'openai': return createOpenAI({ apiKey: openaiKey })
}
```

## FAQ

**Why multiple AI providers?**

Different tasks need different models. z.ai is fast and cost-effective for general tasks. Claude excels at complex reasoning. GPT-4 has specific strengths. Having all three available lets you use the right tool for each job without being locked into one ecosystem.

**Why LanceDB for vector memory?**

LanceDB provides fast semantic search across conversation history. When you ask "what did we discuss about project X?", the agent can find relevant context from weeks ago. It combines with the traditional CLAUDE.md memory for hybrid capabilities.

**Telegram or WhatsApp?**

Both! Use Telegram for faster setup and better API. Use WhatsApp if you already have contacts there. The channel abstraction makes switching easy.

**Why Docker deployment?**

Docker provides true OS-level isolation. Each agent container only sees its own filesystem. Bash commands are safe because they run inside the container. Plus, Docker deployment works on any Linux server.

**Can I run this on Linux?**

Yes! That's the preferred deployment method. Use Docker Compose to deploy to any Linux host (including Dokploy).

**Is this secure?**

Agents run in containers, not behind application-level permission checks. They can only access explicitly mounted directories. You should still review what you're running, but the codebase is small enough that you actually can. See [docs/SECURITY.md](docs/SECURITY.md) for the full security model.

**How do I switch between AI providers?**

Set the `AI_PROVIDER` environment variable (`zai`, `anthropic`, or `openai`) and the `AI_MODEL` (e.g., `glm-4.7`, `claude-3-5-sonnet-20241022`). You can also switch per-task with natural language: "@Andy use Claude for this one".

**What about the original NanoClaw philosophy?**

Still intact! The codebase is small enough to understand. Security through container isolation. No configuration sprawl. The difference is that this fork has multi-provider AI, Telegram support, and Docker deployment built-in instead of requiring skills.

**Why no configuration files?**

We don't want configuration sprawl. Every user should customize it so that the code matches exactly what they want rather than configuring a generic system. Environment variables control deployment, and code changes control behavior.

## Contributing

This is a fork of [gavrielc/nanoclaw](https://github.com/gavrielc/nanoclaw) with enhancements for multi-provider AI, Telegram support, and Docker deployment.

**For this fork:** Bug fixes, security improvements, and documentation updates are welcome.

**For the upstream project:** Don't add features. Add skills. See the [original contributing guidelines](https://github.com/gavrielc/nanoclaw#contributing).

## Requirements

### For Docker Deployment:
- Docker and Docker Compose
- Linux server (or Docker host)
- API keys: z.ai, OpenAI (for embeddings), Telegram bot token

### For Local Development:
- macOS or Linux
- Node.js 20+
- [Claude Code](https://claude.ai/download)
- [Apple Container](https://github.com/apple/container) (macOS) or [Docker](https://docker.com/products/docker-desktop) (macOS/Linux)

## License

MIT
