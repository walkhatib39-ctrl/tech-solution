import fs from 'fs';
import path from 'path';

export interface Message {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    message: string;
    createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

// Ensure data directory exists
function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(MESSAGES_FILE)) {
        fs.writeFileSync(MESSAGES_FILE, JSON.stringify([], null, 2));
    }
}

export function getAllMessages(): Message[] {
    ensureDataDir();
    const data = fs.readFileSync(MESSAGES_FILE, 'utf-8');
    return JSON.parse(data);
}

export function saveMessage(message: Omit<Message, 'id' | 'createdAt'>): Message {
    ensureDataDir();
    const messages = getAllMessages();

    const newMessage: Message = {
        id: Date.now().toString(),
        ...message,
        createdAt: new Date().toISOString()
    };

    messages.unshift(newMessage);
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));

    return newMessage;
}

export function deleteMessage(id: string): boolean {
    ensureDataDir();
    const messages = getAllMessages();
    const filteredMessages = messages.filter(m => m.id !== id);

    if (filteredMessages.length === messages.length) {
        return false; // Message not found
    }

    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(filteredMessages, null, 2));
    return true;
}

export function getMessageById(id: string): Message | null {
    const messages = getAllMessages();
    return messages.find(m => m.id === id) || null;
}
