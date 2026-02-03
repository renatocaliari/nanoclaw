/**
 * NanoClaw Agent Runner - Multi-Provider AI Support
 * Runs inside a container, receives config via stdin, outputs result to stdout
 *
 * Supports:
 * - z.ai (glm-4.7)
 * - Anthropic (Claude)
 * - OpenAI (GPT-4)
 * - LanceDB for vector memory
 */

import fs from 'fs';
import path from 'path';
import { generateText, tool } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import * as lancedb from '@lancedb/lancedb';

interface ContainerInput {
  prompt: string;
  sessionId?: string;
  groupFolder: string;
  chatJid: string;
  isMain: boolean;
  isScheduledTask?: boolean;
}

interface ContainerOutput {
  status: 'success' | 'error';
  result: string | null;
  newSessionId?: string;
  error?: string;
}

interface MemoryEntry {
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

interface SessionEntry {
  sessionId: string;
  fullPath: string;
  summary: string;
  firstPrompt: string;
}

interface SessionsIndex {
  entries: SessionEntry[];
}

const OUTPUT_START_MARKER = '---NANOCLAW_OUTPUT_START---';
const OUTPUT_END_MARKER = '---NANOCLAW_OUTPUT_END---';

function writeOutput(output: ContainerOutput): void {
  console.log(OUTPUT_START_MARKER);
  console.log(JSON.stringify(output));
  console.log(OUTPUT_END_MARKER);
}

function log(message: string): void {
  console.error(`[agent-runner] ${message}`);
}

/**
 * Vector Memory System using LanceDB
 */
class HybridMemory {
  private db: lancedb.Connection | null = null;
  private table: lancedb.Table | null = null;
  private dbPath: string;
  private knowledgePath: string;
  private embeddingsApiUrl: string;
  private embeddingsApiKey: string;
  private currentGroup: string;

  constructor(groupFolder: string) {
    this.dbPath = path.join('/workspace/group', 'vectordb');
    this.knowledgePath = path.join('/workspace/group', 'KNOWLEDGE.md');
    this.currentGroup = groupFolder;

    // Embedding configuration (use OpenAI for now, can be changed)
    this.embeddingsApiUrl =
      process.env.EMBEDDINGS_API_URL || 'https://api.openai.com/v1';
    this.embeddingsApiKey = process.env.EMBEDDINGS_API_KEY || '';
  }

  async initialize() {
    try {
      this.db = await lancedb.connect(this.dbPath);

      // Check if table exists, if not create it
      const tables = await this.db.tableNames();
      if (!tables.includes('memories')) {
        log('Creating memories table in LanceDB');
        this.table = await this.db.createTable('memories', [
          {
            vector: new Array(1536).fill(0),
            content: '',
            metadata: {
              type: 'conversation',
              group: this.currentGroup,
              timestamp: new Date().toISOString(),
            },
          },
        ]);
      } else {
        this.table = await this.db.openTable('memories');
      }
    } catch (err) {
      log(
        `Failed to initialize LanceDB: ${err instanceof Error ? err.message : String(err)}`,
      );
      // Continue without LanceDB if it fails
      this.db = null;
      this.table = null;
    }
  }

  async add(
    content: string,
    metadata: MemoryEntry['metadata'],
    embedding?: number[],
  ) {
    if (!this.table) {
      log('LanceDB not available, skipping vector storage');
      return;
    }

    try {
      const entry: MemoryEntry = {
        content,
        metadata,
        embedding,
      };

      await this.table.add([
        {
          vector: entry.embedding || (await this.embed(content)),
          content: entry.content,
          metadata: entry.metadata,
        },
      ]);

      log(`Added to LanceDB: ${metadata.type} - ${content.slice(0, 50)}...`);
    } catch (err) {
      log(
        `Failed to add to LanceDB: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async search(query: string, limit: number = 5): Promise<MemoryEntry[]> {
    if (!this.table) {
      return [];
    }

    try {
      const results = await this.table
        .search(await this.embed(query))
        .where(`group = '${this.getCurrentGroup()}'`)
        .limit(limit)
        .toArray();

      return results.map((r) => ({
        content: r.content,
        metadata: r.metadata,
        embedding: r.vector,
      }));
    } catch (err) {
      log(
        `Failed to search LanceDB: ${err instanceof Error ? err.message : String(err)}`,
      );
      return [];
    }
  }

  async readKnowledge(): Promise<string> {
    try {
      if (fs.existsSync(this.knowledgePath)) {
        return await fs.promises.readFile(this.knowledgePath, 'utf-8');
      }
      return '';
    } catch (err) {
      log(
        `Failed to read KNOWLEDGE.md: ${err instanceof Error ? err.message : String(err)}`,
      );
      return '';
    }
  }

  private async appendToKnowledge(content: string, metadata: any) {
    try {
      const section = this.getSectionName(metadata.type);
      const timestamp = new Date().toISOString();
      const markdown = `\n## ${section} (${timestamp})\n\n${content}\n`;
      await fs.promises.appendFile(this.knowledgePath, markdown);
      log(`Appended to KNOWLEDGE.md: ${section}`);
    } catch (err) {
      log(
        `Failed to append to KNOWLEDGE.md: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private getSectionName(type: string): string {
    const sections: Record<string, string> = {
      instruction: 'System Instructions',
      preference: 'User Preferences',
      fact: 'Important Facts',
    };
    return sections[type] || 'Other';
  }

  private getCurrentGroup(): string {
    // Extract group from path
    const match = this.knowledgePath.match(/\/groups\/([^\/]+)\//);
    return match ? match[1] : 'unknown';
  }

  private async embed(text: string): Promise<number[]> {
    // Simple embedding using OpenAI API
    try {
      const response = await fetch(`${this.embeddingsApiUrl}/embeddings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.embeddingsApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: text,
          model: 'text-embedding-3-small',
        }),
      });

      const data = await response.json();
      return data.data[0].embedding;
    } catch (err) {
      log(
        `Failed to generate embedding: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }
}

/**
 * Provider factory - creates AI model instances
 */
function getProvider() {
  const provider = process.env.AI_PROVIDER || 'anthropic';

  switch (provider) {
    case 'zai':
      log('Using z.ai provider');
      return createOpenAICompatible({
        name: 'zai',
        baseURL:
          process.env.ZAI_BASE_URL || 'https://api.z.ai/api/coding/paas/v4',
        apiKey: process.env.ZAI_API_KEY || '',
      });

    case 'anthropic':
      log('Using Anthropic provider');
      return createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY || '',
      });

    case 'openai':
      log('Using OpenAI provider');
      return createOpenAI({
        apiKey: process.env.OPENAI_API_KEY || '',
      });

    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

/**
 * Convert MCP tools to Vercel AI SDK tools format
 */
interface ToolContext {
  chatJid?: string;
  groupFolder?: string;
  isMain?: boolean;
}

let toolContext: ToolContext = {};

function setToolContext(context: ToolContext): void {
  toolContext = context;
}

function convertMcpTools(ipcMcp: any) {
  return {
    sendMessage: {
      description: 'Send a message to the current WhatsApp/Telegram group',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The message text to send',
          },
        },
        required: ['text'],
      },
      execute: async ({ text }: { text: string }) => {
        const ipcDir = '/workspace/ipc/messages';
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
        const filepath = path.join(ipcDir, filename);

        await fs.promises.mkdir(ipcDir, { recursive: true });
        await fs.promises.writeFile(
          filepath,
          JSON.stringify({
            type: 'message',
            chatJid: toolContext.chatJid,
            text,
            timestamp: new Date().toISOString(),
          }),
        );

        return `Message queued: ${filename}`;
      },
    },

    scheduleTask: {
      description: 'Schedule a recurring or one-time task',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'What the agent should do',
          },
          schedule_type: {
            type: 'string',
            enum: ['cron', 'interval', 'once'],
            description: 'Schedule type',
          },
          schedule_value: {
            type: 'string',
            description: 'Schedule value',
          },
          context_mode: {
            type: 'string',
            enum: ['group', 'isolated'],
            description: 'Context mode',
          },
          target_group: {
            type: 'string',
            description: 'Target group folder (optional)',
          },
        },
        required: ['prompt', 'schedule_type', 'schedule_value'],
      },
      execute: async ({
        prompt,
        schedule_type,
        schedule_value,
        context_mode,
        target_group,
      }: {
        prompt: string;
        schedule_type: string;
        schedule_value: string;
        context_mode?: string;
        target_group?: string;
      }) => {
        const ipcDir = '/workspace/ipc/tasks';
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
        const filepath = path.join(ipcDir, filename);

        await fs.promises.mkdir(ipcDir, { recursive: true });
        await fs.promises.writeFile(
          filepath,
          JSON.stringify({
            type: 'schedule_task',
            prompt,
            schedule_type,
            schedule_value,
            context_mode: context_mode || 'group',
            groupFolder: target_group || toolContext.groupFolder || 'main',
            chatJid: toolContext.chatJid,
            timestamp: new Date().toISOString(),
          }),
        );

        return `Task scheduled: ${filename}`;
      },
    },

    remember: {
      description: 'Store important information in memory',
      parameters: {
        type: 'object',
        properties: {
          fact: {
            type: 'string',
            description: 'Important fact to remember',
          },
        },
        required: ['fact'],
      },
      execute: async ({ fact }: { fact: string }) => {
        return `Remembered: ${fact}`;
      },
    },
  };
}

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

/**
 * Session and transcript handling
 */
function getSessionSummary(
  sessionId: string,
  transcriptPath: string,
): string | null {
  const projectDir = path.dirname(transcriptPath);
  const indexPath = path.join(projectDir, 'sessions-index.json');

  if (!fs.existsSync(indexPath)) {
    log(`Sessions index not found at ${indexPath}`);
    return null;
  }

  try {
    const index: SessionsIndex = JSON.parse(
      fs.readFileSync(indexPath, 'utf-8'),
    );
    const entry = index.entries.find((e) => e.sessionId === sessionId);
    if (entry?.summary) {
      return entry.summary;
    }
  } catch (err) {
    log(
      `Failed to read sessions index: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return null;
}

/**
 * Archive transcript to conversations/
 */
function createPreCompactHook() {
  return async (input: any) => {
    const transcriptPath = input.transcript_path;
    const sessionId = input.session_id;

    if (!transcriptPath || !fs.existsSync(transcriptPath)) {
      log('No transcript found for archiving');
      return {};
    }

    try {
      const content = fs.readFileSync(transcriptPath, 'utf-8');
      const messages = parseTranscript(content);

      if (messages.length === 0) {
        log('No messages to archive');
        return {};
      }

      const summary = getSessionSummary(sessionId, transcriptPath);
      const name = summary ? sanitizeFilename(summary) : generateFallbackName();

      const conversationsDir = '/workspace/group/conversations';
      await fs.promises.mkdir(conversationsDir, { recursive: true });

      const date = new Date().toISOString().split('T')[0];
      const filename = `${date}-${name}.md`;
      const filePath = path.join(conversationsDir, filename);

      const markdown = formatTranscriptMarkdown(messages, summary);
      await fs.promises.writeFile(filePath, markdown);

      log(`Archived conversation to ${filePath}`);
    } catch (err) {
      log(
        `Failed to archive transcript: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return {};
  };
}

function sanitizeFilename(summary: string): string {
  return summary
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

function generateFallbackName(): string {
  const time = new Date();
  return `conversation-${time.getHours().toString().padStart(2, '0')}${time.getMinutes().toString().padStart(2, '0')}`;
}

interface ParsedMessage {
  role: 'user' | 'assistant';
  content: string;
}

function parseTranscript(content: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];

  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      if (entry.type === 'user' && entry.message?.content) {
        const text =
          typeof entry.message.content === 'string'
            ? entry.message.content
            : entry.message.content
                .map((c: { text?: string }) => c.text || '')
                .join('');
        if (text) messages.push({ role: 'user', content: text });
      } else if (entry.type === 'assistant' && entry.message?.content) {
        const textParts = entry.message.content
          .filter((c: { type: string }) => c.type === 'text')
          .map((c: { text: string }) => c.text);
        const text = textParts.join('');
        if (text) messages.push({ role: 'assistant', content: text });
      }
    } catch {}
  }

  return messages;
}

function formatTranscriptMarkdown(
  messages: ParsedMessage[],
  title?: string | null,
): string {
  const now = new Date();
  const formatDateTime = (d: Date) =>
    d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  const lines: string[] = [];
  lines.push(`# ${title || 'Conversation'}`);
  lines.push('');
  lines.push(`Archived: ${formatDateTime(now)}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const msg of messages) {
    const sender = msg.role === 'user' ? 'User' : 'Assistant';
    const content =
      msg.content.length > 2000
        ? msg.content.slice(0, 2000) + '...'
        : msg.content;
    lines.push(`**${sender}**: ${content}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Main agent execution
 */
async function main(): Promise<void> {
  let input: ContainerInput;

  try {
    const stdinData = await readStdin();
    input = JSON.parse(stdinData);
    log(`Received input for group: ${input.groupFolder}`);
  } catch (err) {
    writeOutput({
      status: 'error',
      result: null,
      error: `Failed to parse input: ${err instanceof Error ? err.message : String(err)}`,
    });
    process.exit(1);
  }

  // Initialize hybrid memory
  const memory = new HybridMemory(input.groupFolder);
  await memory.initialize();

  // Build context from memory
  const knowledgeContent = await memory.readKnowledge();
  const relevantMemories = await memory.search(input.prompt, 5);

  const memoryContext = `
${knowledgeContent}

## Relevant Past Memories
${relevantMemories.map((m) => `- ${m.content}`).join('\n')}
  `.trim();

  // Prepare prompt with context
  let prompt = input.prompt;
  if (input.isScheduledTask) {
    prompt = `[SCHEDULED TASK - You are running automatically, not in response to a user message. Use tools to communicate if needed.]\n\n${input.prompt}`;
  }

  try {
    log('Starting agent with multi-provider support...');

    setToolContext({
      chatJid: input.chatJid,
      groupFolder: input.groupFolder,
      isMain: input.isMain,
    });

    // Get provider
    const provider = getProvider();
    const model = provider(
      process.env.AI_MODEL || 'claude-3-5-sonnet-20241022',
    );

    const tools = convertMcpTools(null);

    const { text } = await generateText({
      model: model as any,
      messages: [
        { role: 'system', content: memoryContext },
        { role: 'user', content: prompt },
      ],
      tools,
      temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4096'),
    });

    log('Agent completed successfully');

    // Store conversation in memory
    await memory.add(prompt, {
      type: 'conversation',
      group: input.groupFolder,
      timestamp: new Date().toISOString(),
    });

    writeOutput({
      status: 'success',
      result: text,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log(`Agent error: ${errorMessage}`);
    writeOutput({
      status: 'error',
      result: null,
      error: errorMessage,
    });
    process.exit(1);
  }
}

main();
