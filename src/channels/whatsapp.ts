import { pino } from 'pino';
import path from 'path';
import { exec } from 'child_process';
import makeWASocket, {
  DisconnectReason,
  WASocket,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import {
  ChannelClient,
  ChannelMessage,
  RegisteredGroup,
  Session,
} from './types.js';

export interface WhatsAppConfig {
  storeDir: string;
  logger: pino.Logger;
  onRegisteredGroupsChange?: (groups: Record<string, RegisteredGroup>) => void;
}

export class WhatsAppChannel implements ChannelClient {
  private sock?: WASocket;
  private config: WhatsAppConfig;
  private messageCallback?: (msg: ChannelMessage) => void;
  private registeredGroups: Record<string, RegisteredGroup> = {};
  private connected = false;

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    const authDir = path.join(this.config.storeDir, 'auth');
    const { mkdirSync } = await import('fs');
    mkdirSync(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    this.sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, this.config.logger),
      },
      printQRInTerminal: false,
      logger: this.config.logger,
      browser: ['NanoClaw', 'Chrome', '1.0.0'],
    });

    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        const msg =
          'WhatsApp authentication required. Run /setup in Claude Code.';
        this.config.logger.error(msg);
        exec(
          `osascript -e 'display notification "${msg}" with title "NanoClaw" sound name "Basso"'`,
        );
        setTimeout(() => process.exit(1), 1000);
      }

      if (connection === 'close') {
        const reason = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = reason !== DisconnectReason.loggedOut;
        this.config.logger.info(
          { reason, shouldReconnect },
          'Connection closed',
        );

        if (shouldReconnect) {
          this.config.logger.info('Reconnecting...');
          this.connect();
        } else {
          this.config.logger.info('Logged out. Run /setup to re-authenticate.');
          process.exit(0);
        }
      } else if (connection === 'open') {
        this.connected = true;
        this.config.logger.info('Connected to WhatsApp');
      }
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('messages.upsert', ({ messages }) => {
      for (const msg of messages) {
        if (!msg.message) continue;
        const chatJid = msg.key.remoteJid;
        if (!chatJid || chatJid === 'status@broadcast') continue;

        // Convert to ChannelMessage format
        const channelMsg: ChannelMessage = {
          id: (msg.key.id as string) || `${chatJid}-${Date.now()}`,
          chatId: chatJid,
          senderId: msg.key.participant || chatJid,
          senderName: msg.pushName || 'Unknown',
          content: this.getMessageContent(msg.message),
          timestamp: new Date(Number(msg.messageTimestamp) * 1000),
          fromMe: msg.key.fromMe || false,
        };

        this.messageCallback?.(channelMsg);
      }
    });
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    // WhatsApp socket auto-reconnects, so we just stop message processing
  }

  onMessage(callback: (msg: ChannelMessage) => void): void {
    this.messageCallback = callback;
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    if (!this.sock) {
      throw new Error('WhatsApp socket not connected');
    }

    try {
      await this.sock.sendMessage(chatId, { text });
      this.config.logger.info(
        { jid: chatId, length: text.length },
        'Message sent',
      );
    } catch (err) {
      this.config.logger.error({ jid: chatId, err }, 'Failed to send message');
      throw err;
    }
  }

  isConnected(): boolean {
    return this.connected && this.sock !== undefined;
  }

  setRegisteredGroups(groups: Record<string, RegisteredGroup>): void {
    this.registeredGroups = groups;
  }

  /**
   * Fetch all participating groups and return metadata
   */
  async syncGroupMetadata(): Promise<Map<string, { subject: string }>> {
    if (!this.sock) {
      throw new Error('WhatsApp socket not connected');
    }

    const groups = await this.sock.groupFetchAllParticipating();
    const metadata = new Map<string, { subject: string }>();

    for (const [jid, data] of Object.entries(groups)) {
      if (data.subject) {
        metadata.set(jid, { subject: data.subject });
      }
    }

    return metadata;
  }

  /**
   * Send typing indicator
   */
  async setTyping(jid: string, isTyping: boolean): Promise<void> {
    if (!this.sock) return;

    try {
      await this.sock.sendPresenceUpdate(
        isTyping ? 'composing' : 'paused',
        jid,
      );
    } catch (err) {
      this.config.logger.debug({ jid, err }, 'Failed to update typing status');
    }
  }

  /**
   * Get socket instance for direct access
   */
  getSocket(): WASocket | undefined {
    return this.sock;
  }

  /**
   * Extract text content from WhatsApp message
   */
  private getMessageContent(message: any): string {
    if (message.conversation) {
      return message.conversation;
    }
    if (message.extendedTextMessage?.text) {
      return message.extendedTextMessage.text;
    }
    // Handle other message types as needed
    return '[Unsupported message type]';
  }
}
