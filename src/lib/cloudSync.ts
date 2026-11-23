import type { ChatMessageItem, ChatThread } from '../utils/poetryLogic';
import { supabase } from './supabase';

interface SavedPoemRecord {
  id: string;
  chatId?: string;
  content: string;
  createdAt: string;
}

function readLocalSavedPoems(): SavedPoemRecord[] {
  try {
    const value = JSON.parse(localStorage.getItem('sukhan_saved_verses_v1') || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is SavedPoemRecord =>
      Boolean(item && typeof item.id === 'string' && typeof item.content === 'string')
    );
  } catch {
    return [];
  }
}

function asIso(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

export async function persistChatToCloud(userId: string, chat: ChatThread): Promise<void> {
  if (!supabase) return;
  const now = new Date().toISOString();
  const { error } = await supabase.from('chats').upsert({
    id: chat.id,
    user_id: userId,
    title: (chat.title || 'Conversation').slice(0, 200),
    saved: Boolean(chat.saved),
    created_at: asIso(chat.createdAt, now),
    updated_at: asIso(chat.updatedAt, now),
  }, { onConflict: 'id' });
  if (error) throw error;
}

export async function persistMessageToCloud(userId: string, chatId: string, message: ChatMessageItem): Promise<void> {
  if (!supabase || !message.content?.trim()) return;
  const now = new Date().toISOString();
  const { error } = await supabase.from('messages').upsert({
    id: message.id,
    chat_id: chatId,
    user_id: userId,
    role: message.role,
    content: message.content.slice(0, 20000),
    feedback: message.feedback || 'none',
    created_at: asIso(message.createdAt, now),
    updated_at: asIso(message.updatedAt, now),
  }, { onConflict: 'id' });
  if (error) throw error;
}

export async function updateChatInCloud(userId: string, chatId: string, patch: Partial<Pick<ChatThread, 'title' | 'saved' | 'updatedAt'>>): Promise<void> {
  if (!supabase) return;
  const values: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof patch.title === 'string') values.title = patch.title.slice(0, 200);
  if (typeof patch.saved === 'boolean') values.saved = patch.saved;
  const { error } = await supabase.from('chats').update(values).eq('id', chatId).eq('user_id', userId);
  if (error) throw error;
}

export async function deleteChatFromCloud(userId: string, chatId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('chats').delete().eq('id', chatId).eq('user_id', userId);
  if (error) throw error;
}

export async function updateMessageInCloud(userId: string, chatId: string, messageId: string, feedback: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('messages').update({
    feedback,
    updated_at: new Date().toISOString(),
  }).eq('id', messageId).eq('chat_id', chatId).eq('user_id', userId);
  if (error) throw error;
}

export async function syncSavedPoemsToCloud(userId: string): Promise<void> {
  if (!supabase) return;
  const poems = readLocalSavedPoems();
  if (poems.length) {
    const rows = poems.map((poem) => ({
      id: poem.id,
      user_id: userId,
      chat_id: poem.chatId || null,
      content: poem.content.slice(0, 20000),
      created_at: asIso(poem.createdAt, new Date().toISOString()),
    }));
    const { error } = await supabase.from('saved_poems').upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  }

  const { data, error } = await supabase.from('saved_poems')
    .select('id,chat_id,content,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const byId = new Map<string, SavedPoemRecord>();
  for (const item of [...(data || []), ...poems]) {
    byId.set(String(item.id), {
      id: String(item.id),
      chatId: item.chatId || (item.chat_id ? String(item.chat_id) : undefined),
      content: String(item.content || ''),
      createdAt: asIso(item.createdAt || item.created_at, new Date().toISOString()),
    });
  }
  try {
    localStorage.setItem('sukhan_saved_verses_v1', JSON.stringify([...byId.values()]));
    window.dispatchEvent(new Event('sukhan-saved-verses-changed'));
  } catch {
    // Cloud remains the durable copy if the device has no storage space.
  }
}

export async function syncLocalDataToCloud(userId: string, localChats: ChatThread[]): Promise<ChatThread[]> {
  if (!supabase) return localChats;

  if (localChats.length) {
    const now = new Date().toISOString();
    const chatRows = localChats.map((chat) => ({
      id: chat.id,
      user_id: userId,
      title: (chat.title || 'Conversation').slice(0, 200),
      saved: Boolean(chat.saved),
      created_at: asIso(chat.createdAt, now),
      updated_at: asIso(chat.updatedAt, now),
    }));
    const { error: chatError } = await supabase.from('chats').upsert(chatRows, { onConflict: 'id' });
    if (chatError) throw chatError;

    const messages = localChats.flatMap((chat) => chat.messages
      .filter((message) => Boolean(message.content?.trim()))
      .map((message) => ({
        id: message.id,
        chat_id: chat.id,
        user_id: userId,
        role: message.role,
        content: message.content.slice(0, 20000),
        feedback: message.feedback || 'none',
        created_at: asIso(message.createdAt, now),
        updated_at: asIso(message.updatedAt, now),
      })));
    if (messages.length) {
      const { error: messageError } = await supabase.from('messages').upsert(messages, { onConflict: 'id' });
      if (messageError) throw messageError;
    }
  }

  await syncSavedPoemsToCloud(userId);

  const { data: chatRows, error: loadChatsError } = await supabase
    .from('chats').select('id,user_id,title,saved,created_at,updated_at')
    .eq('user_id', userId).order('updated_at', { ascending: false });
  if (loadChatsError) throw loadChatsError;
  if (!chatRows?.length) return localChats;

  const ids = chatRows.map((chat) => chat.id as string);
  const { data: messageRows, error: loadMessagesError } = await supabase
    .from('messages').select('id,chat_id,user_id,role,content,feedback,created_at,updated_at')
    .eq('user_id', userId).in('chat_id', ids).order('created_at', { ascending: true });
  if (loadMessagesError) throw loadMessagesError;

  const messagesByChat = new Map<string, ChatMessageItem[]>();
  for (const row of messageRows || []) {
    const chatId = String(row.chat_id);
    const current = messagesByChat.get(chatId) || [];
    current.push({
      id: String(row.id),
      chatId,
      ownerId: userId,
      role: row.role === 'assistant' ? 'assistant' : 'user',
      content: String(row.content || ''),
      feedback: (row.feedback || 'none') as ChatMessageItem['feedback'],
      createdAt: asIso(row.created_at, new Date().toISOString()),
      updatedAt: asIso(row.updated_at, new Date().toISOString()),
    });
    messagesByChat.set(chatId, current);
  }

  return chatRows.map((row) => ({
    id: String(row.id),
    ownerId: userId,
    title: String(row.title || 'Conversation'),
    saved: Boolean(row.saved),
    createdAt: asIso(row.created_at, new Date().toISOString()),
    updatedAt: asIso(row.updated_at, new Date().toISOString()),
    messages: messagesByChat.get(String(row.id)) || [],
  }));
}
