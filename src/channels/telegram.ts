import { pino } from 'pino';
import { Telegram } from 'telegraf';
import { ChannelClient, ChannelMessage, RegisteredGroup } from './types.js';

export interface TelegramConfig {
  botToken: string;
  logger: pino.Logger;
}

export class TelegramChannel implements ChannelClient {
  private bot: Telegram;
  private config: TelegramConfig;
  private messageCallback?: (msg: ChannelMessage) => void;
  private connected = false;
  private pollingStopped = false;

  constructor(config: TelegramConfig) {
    this.config = config;
    this.bot = new Telegram(config.botToken);
  }

  async connect(): Promise<void> {
    try {
      // Verify bot token by fetching bot info
      await this.bot.getMe();
      this.connected = true;
      this.config.logger.info('Connected to Telegram');

      // Start polling for updates (long polling)
      this.startPolling();
    } catch (err) {
      this.config.logger.error({ err }, 'Failed to connect to Telegram');
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    this.pollingStopped = true;
    this.connected = false;
    this.config.logger.info('Disconnected from Telegram');
  }

  onMessage(callback: (msg: ChannelMessage) => void): void {
    this.messageCallback = callback;
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    try {
      // Telegram expects numeric chat IDs, but might be stored as string
      const targetId =
        typeof chatId === 'string' ? parseInt(chatId, 10) : chatId;
      await this.bot.sendMessage(targetId, text);
      this.config.logger.info({ chatId, length: text.length }, 'Message sent');
    } catch (err) {
      this.config.logger.error({ chatId, err }, 'Failed to send message');
      throw err;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Telegram doesn't have group sync in the same way as WhatsApp
   * Groups are discovered through messages
   */
  async syncGroupMetadata(): Promise<Map<string, { subject: string }>> {
    // Telegram bot API doesn't provide a way to list all groups
    // Groups must send a message first to be discovered
    return new Map();
  }

  /**
   * Send chat action (typing, etc.)
   */
  async setTyping(chatId: string, isTyping: boolean): Promise<void> {
    try {
      const targetId =
        typeof chatId === 'string' ? parseInt(chatId, 10) : chatId;
      if (isTyping) {
        await this.bot.sendChatAction(targetId, 'typing');
      }
    } catch (err) {
      this.config.logger.debug(
        { chatId, err },
        'Failed to update typing status',
      );
    }
  }

  /**
   * Start polling for updates using long polling
   */
  private async startPolling(): Promise<void> {
    let offset = 0;
    const timeout = 30; // 30 seconds

    const poll = async () => {
      while (!this.pollingStopped && this.connected) {
        try {
          const updates = await this.bot.getUpdates(offset, undefined, timeout);

          for (const update of updates) {
            if (update.message) {
              const msg = update.message;
              if (msg.text) {
                const channelMsg: ChannelMessage = {
                  id: update.update_id.toString(),
                  chatId: msg.chat.id.toString(),
                  senderId: msg.from?.id.toString() || msg.chat.id.toString(),
                  senderName:
                    msg.from?.username || msg.from?.first_name || 'Unknown',
                  content: msg.text,
                  timestamp: new Date(msg.date * 1000),
                  fromMe: false, // Bots don't receive their own messages via updates
                };

                this.messageCallback?.(channelMsg);
              }
            }
            // Update offset to acknowledge this update
            offset = update.update_id + 1;
          }
        } catch (err) {
          // Ignore timeout errors and continue polling
          if ((err as any).code !== 'ETELEGRAM') {
            this.config.logger.debug({ err }, 'Polling error (will retry)');
          }
        }
      }

      // Wait before reconnecting if disconnected
      if (!this.pollingStopped) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        if (!this.pollingStopped && this.connected) {
          poll();
        }
      }
    };

    poll().catch((err) => {
      this.config.logger.error({ err }, 'Polling failed');
    });
  }

  /**
   * Get bot information
   */
  async getBotInfo(): Promise<{ id: number; username: string; name: string }> {
    const bot = await this.bot.getMe();
    return {
      id: bot.id,
      username: bot.username || '',
      name: bot.first_name || 'Bot',
    };
  }
}
