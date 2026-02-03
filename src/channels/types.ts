export interface ChannelMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  fromMe?: boolean;
}

export interface ChannelClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onMessage(callback: (msg: ChannelMessage) => void): void;
  sendMessage(chatId: string, text: string): Promise<void>;
  isConnected(): boolean;
}

export interface ChannelConfig {
  type: 'whatsapp' | 'telegram';
  enabled: boolean;
  priority?: number;
}
