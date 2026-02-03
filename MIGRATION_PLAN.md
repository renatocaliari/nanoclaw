# NanoClaw Migration Plan

## Multi-Provider AI + Vector Memory + Multi-Channel

**Status:** In Progress  
**Date:** 2026-02-03  
**Goal:** Transform NanoClaw into a multi-provider, multi-channel AI assistant with intelligent memory

---

## Phase 1: Multi-Provider AI SDK ⭐ HIGH PRIORITY

### Current State

- **SDK:** `@anthropic-ai/claude-agent-sdk` (v0.2.29)
- **Provider:** Anthropic only
- **Location:** `container/agent-runner/` (Docker container)
- **Issue:** Locked into Anthropic, cannot use z.ai, OpenAI, etc.

### Target State

- **SDK:** Vercel AI SDK (`@ai-sdk/openai-compatible`, `@ai-sdk/anthropic`, `@ai-sdk/openai`)
- **Providers:**
  - z.ai (glm-4.7) - Custom baseURL
  - Anthropic (Claude)
  - OpenAI (GPT-4)
- **Configuration:** Environment-based provider selection

### Implementation Steps

#### 1.1 Update container/agent-runner/package.json

```json
{
  "dependencies": {
    "@ai-sdk/openai-compatible": "^1.0.0",
    "@ai-sdk/anthropic": "^1.0.0",
    "@ai-sdk/openai": "^1.0.0",
    "ai": "^3.0.0",
    "zod": "^4.0.0"
  }
}
```

#### 1.2 Replace query() with generateText()

**File:** `container/agent-runner/src/index.ts`

**Before:**

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

for await (const message of query({
  prompt,
  options: {
    cwd: '/workspace/group',
    allowedTools: [...],
    mcpServers: { nanoclaw: ipcMcp }
  }
})) {
  if (message.result) result = message.result;
}
```

**After:**

```typescript
import { generateText, tool } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createAnthropic } from '@ai-sdk/anthropic';

// Provider factory
function getProvider() {
  const provider = process.env.AI_PROVIDER || 'anthropic';

  switch (provider) {
    case 'zai':
      return createOpenAICompatible({
        name: 'zai',
        baseURL:
          process.env.ZAI_BASE_URL || 'https://api.z.ai/api/coding/paas/v4',
        apiKey: process.env.ZAI_API_KEY,
      });
    case 'anthropic':
      return createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    case 'openai':
      return createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// Convert MCP tools to Vercel AI SDK tools
function convertMcpTools(mcpTools) {
  // Conversion logic needed
  return convertedTools;
}

const { text } = await generateText({
  model: getProvider()(process.env.AI_MODEL || 'claude-3-5-sonnet-20241022'),
  prompt: input.prompt,
  tools: convertMcpTools(ipcMcp),
  temperature: 0.7,
});
```

#### 1.3 Update Dockerfile

```dockerfile
# Remove old SDK
# RUN npm install -g agent-browser @anthropic-ai/claude-code

# Add new dependencies in package.json, install normally
```

#### 1.4 Environment Configuration

```bash
# .env or environment variables
AI_PROVIDER=zai  # or anthropic, openai
AI_MODEL=glm-4.7
ZAI_API_KEY=sk-xxx
ZAI_BASE_URL=https://api.z.ai/api/coding/paas/v4
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-openai-xxx
```

---

## Phase 2: Vector Memory with LanceDB ⭐ HIGH PRIORITY

### Current State

- **Memory:** CLAUDE.md files (text-based)
- **Search:** Linear grep/substring
- **Scalability:** Poor (entire file loaded into context)

### Target State

- **Vector DB:** LanceDB (embedded, TypeScript-native)
- **Memory:** Hybrid (KNOWLEDGE.md + LanceDB)
- **Search:** Semantic vector search + SQL via DuckDB
- **Scalability:** Excellent (millions of vectors)

### Implementation Steps

#### 2.1 Add LanceDB Dependency

**File:** `package.json` (host and container)

```json
{
  "dependencies": {
    "@lancedb/lancedb": "^0.25.0-beta.0"
  }
}
```

#### 2.2 Create Memory Module

**File:** `src/memory.ts` (new)

```typescript
import * as lancedb from '@lancedb/lancedb';
import path from 'path';

export interface MemoryEntry {
  content: string;
  embedding?: number[];
  metadata: {
    type: 'conversation' | 'fact' | 'preference' | 'instruction';
    group: string;
    timestamp: string;
    confidence?: number;
    [key: string]: any;
  };
}

export class HybridMemory {
  private db: lancedb.Connection;
  private table: lancedb.Table;
  private knowledgePath: string;

  constructor(groupFolder: string) {
    const dbPath = path.join(process.cwd(), 'groups', groupFolder, 'vectordb');
    this.knowledgePath = path.join(
      process.cwd(),
      'groups',
      groupFolder,
      'KNOWLEDGE.md',
    );

    this.db = await lancedb.connect(dbPath);

    // Create table if not exists
    this.table = await this.db.createTable('memories', [
      {
        vector: lancedb.Float32Vector(1536), // OpenAI embedding size
        content: string,
        metadata: {
          type: string,
          group: string,
          timestamp: string,
          confidence: number,
        },
      },
    ]);
  }

  async add(
    content: string,
    metadata: MemoryEntry['metadata'],
    embedding?: number[],
  ) {
    const entry: MemoryEntry = {
      content,
      metadata,
      embedding,
    };

    // Always add to LanceDB
    await this.table.add([
      {
        vector: entry.embedding || (await this.embed(content)),
        content: entry.content,
        metadata: entry.metadata,
      },
    ]);

    // Add to KNOWLEDGE.md if critical
    if (metadata.type === 'instruction' || metadata.confidence > 0.95) {
      await this.appendToKnowledge(content, metadata);
    }
  }

  async search(query: string, limit: number = 5): Promise<MemoryEntry[]> {
    const results = await this.table
      .search(await this.embed(query))
      .limit(limit)
      .toArray();

    return results.map((r) => ({
      content: r.content,
      metadata: r.metadata,
      embedding: r.vector,
    }));
  }

  async readKnowledge(): Promise<string> {
    try {
      return await fs.readFile(this.knowledgePath, 'utf-8');
    } catch {
      return ''; // File doesn't exist yet
    }
  }

  private async appendToKnowledge(content: string, metadata: any) {
    const section = this.getSectionName(metadata.type);
    const markdown = `\n## ${section}\n\n${content}\n`;
    await fs.appendFile(this.knowledgePath, markdown);
  }

  private getSectionName(type: string): string {
    const sections = {
      instruction: 'System Instructions',
      preference: 'User Preferences',
      fact: 'Important Facts',
    };
    return sections[type] || 'Other';
  }

  private async embed(text: string): Promise<number[]> {
    // Use embedding service (OpenAI, or provider's embedding)
    // TODO: Implement embedding generation
    throw new Error('Embedding not implemented yet');
  }
}
```

#### 2.3 Integrate with Agent Runner

**File:** `container/agent-runner/src/index.ts`

```typescript
import { HybridMemory } from './memory.js';

async function main() {
  // ... existing input parsing ...

  const memory = new HybridMemory(input.groupFolder);

  // Search relevant memories
  const relevantMemories = await memory.search(input.prompt);
  const knowledgeContent = await memory.readKnowledge();

  // Build context
  const context = `
${knowledgeContent}

## Relevant Past Memories
${relevantMemories.map((m) => `- ${m.content}`).join('\n')}
  `.trim();

  const { text } = await generateText({
    model: getProvider()(process.env.AI_MODEL),
    messages: [
      { role: 'system', content: context },
      { role: 'user', content: input.prompt },
    ],
    tools: convertMcpTools(ipcMcp),
  });

  // Store conversation
  await memory.add(input.prompt, {
    type: 'conversation',
    group: input.groupFolder,
    timestamp: new Date().toISOString(),
  });

  // ... rest of the code ...
}
```

---

## Phase 3: Rename CLAUDE.md → KNOWLEDGE.md ⭐ MEDIUM PRIORITY

### Files to Update

1. `groups/global/CLAUDE.md` → `groups/global/KNOWLEDGE.md`
2. `groups/main/CLAUDE.md` → `groups/main/KNOWLEDGE.md`
3. Any references in code (should be none, already checked)

### Script

```bash
#!/bin/bash
find groups -name "CLAUDE.md" -exec sh -c 'mv "$1" "${1%/*}/KNOWLEDGE.md"' _ {} \;
```

---

## Phase 4: Telegram Integration ⭐ MEDIUM PRIORITY

### Library Choice

**Telegraf** - Most popular, well-maintained, TypeScript-friendly

### Implementation

#### 4.1 Add Telegram Dependency

```json
{
  "dependencies": {
    "telegraf": "^4.16.0"
  }
}
```

#### 4.2 Create Channel Abstraction

**File:** `src/channels/base.ts` (new)

```typescript
export interface ChannelMessage {
  id: string;
  chatId: string;
  sender: string;
  content: string;
  timestamp: Date;
}

export interface ChannelClient {
  connect(): Promise<void>;
  onMessage(callback: (msg: ChannelMessage) => void): void;
  sendMessage(chatId: string, text: string): Promise<void>;
  disconnect(): Promise<void>;
}
```

**File:** `src/channels/whatsapp.ts` (refactor existing code)

```typescript
export class WhatsAppChannel implements ChannelClient {
  // Move existing baileys code here
}
```

**File:** `src/channels/telegram.ts` (new)

```typescript
import { Telegram } from 'telegraf';

export class TelegramChannel implements ChannelClient {
  private bot: Telegram;

  constructor(token: string) {
    this.bot = new Telegram(token);
  }

  async connect() {
    await this.bot.launch();
  }

  onMessage(callback: (msg: ChannelMessage) => void) {
    this.bot.on('text', (ctx) => {
      callback({
        id: ctx.message.message_id.toString(),
        chatId: ctx.chat.id.toString(),
        sender: ctx.from.username || ctx.from.first_name,
        content: ctx.message.text,
        timestamp: new Date(ctx.message.date * 1000),
      });
    });
  }

  async sendMessage(chatId: string, text: string) {
    await this.bot.telegram.sendMessage(chatId, text);
  }

  async disconnect() {
    await this.bot.stop();
  }
}
```

#### 4.3 Update Main Router

**File:** `src/index.ts`

```typescript
import { WhatsAppChannel } from './channels/whatsapp.js';
import { TelegramChannel } from './channels/telegram.js';

const channels: Map<string, ChannelClient> = new Map();

async function initChannels() {
  // Initialize WhatsApp
  const whatsapp = new WhatsAppChannel();
  await whatsapp.connect();
  channels.set('whatsapp', whatsapp);

  // Initialize Telegram (if configured)
  if (process.env.TELEGRAM_BOT_TOKEN) {
    const telegram = new TelegramChannel(process.env.TELEGRAM_BOT_TOKEN);
    await telegram.connect();
    channels.set('telegram', telegram);
  }

  // Route messages from all channels
  for (const [name, channel] of channels) {
    channel.onMessage(async (msg) => {
      await processMessage(msg, name);
    });
  }
}
```

---

## Phase 5: Testing & Validation ⭐ HIGH PRIORITY

### Test Plan

1. **Multi-provider test**:
   - Test with z.ai (glm-4.7)
   - Test with Anthropic (Claude)
   - Test with OpenAI (GPT-4)

2. **Memory test**:
   - Add memories via LanceDB
   - Search and verify retrieval
   - Check KNOWLEDGE.md updates

3. **Multi-channel test**:
   - Send message via WhatsApp
   - Send message via Telegram
   - Verify routing and responses

4. **Integration test**:
   - Full end-to-end flow
   - Scheduled tasks
   - IPC tools

---

## Order of Implementation

1. ✅ **Phase 1**: Multi-provider AI SDK (foundational)
2. ✅ **Phase 2**: Vector Memory with LanceDB
3. ⏳ **Phase 3**: Rename CLAUDE.md → KNOWLEDGE.md
4. ⏳ **Phase 4**: Telegram Integration
5. ✅ **Phase 5**: Testing & Validation

---

## Rollback Plan

If anything breaks:

1. Git stash changes
2. Rebuild container: `./container/build.sh`
3. Restore from backup

---

## Success Criteria

- [ ] Can switch between z.ai, Anthropic, OpenAI via env var
- [ ] LanceDB stores and retrieves memories correctly
- [ ] KNOWLEDGE.md exists and is human-readable
- [ ] Telegram bot responds to messages
- [ ] WhatsApp still works as before
- [ ] Scheduled tasks work across all providers
- [ ] All tests pass
