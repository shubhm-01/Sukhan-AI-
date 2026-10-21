/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Menu,
  Plus,
  Send,
  Sparkles,
  Bookmark,
  Globe,
  SlidersHorizontal,
  X,
  RotateCcw,
  AlertCircle,
  Sun,
  Moon,
  Settings as SettingsIcon,
  Feather,
  BookOpen,
  Square,
} from 'lucide-react';
import { ChatSidebar } from './components/ChatSidebar';
import { ChatMessageBubble } from './components/ChatMessageBubble';
import { FarhangView } from './components/FarhangView';
import {
  ChatThread,
  ChatMessageItem,
  MessageFeedback,
  UserSettings,
  PoetryLanguage,
  PoetryForm,
  PoetryMood,
  WritingStyle,
  LexiconEntry,
  INITIAL_SEED_CHATS,
  deriveChatTitle,
  sanitizeId,
  detectLanguageAndScript,
  detectUserIntent,
} from './utils/poetryLogic';
import {
  resolveApiUrl,
  hasBackendApiAvailable,
  executeResilientChatTurn,
} from './utils/apiClient';
import {
  db,
  auth,
  onAuthStateChanged,
  signInWithGoogle,
  signOutUser,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  OperationType,
  handleFirestoreError,
  User,
} from './lib/firebase';

const STORAGE_CHATS_KEY = 'sukhan_ai_chats_v3';
const STORAGE_ACTIVE_CHAT_KEY = 'sukhan_ai_active_chat_v3';
const STORAGE_SETTINGS_KEY = 'sukhan_ai_settings_v3';

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  defaultScript: 'auto',
  poeticStyle: 'classical',
  showTranslations: true,
  enableWebGrounding: false,
};

const STARTER_PROMPTS = [
  {
    label: 'Ask a Literary Question',
    tag: 'Conversation · Literary Craft',
    prompt:
      'What is the difference between a Ghazal and a Nazm, and how do Radif and Qafiya work?',
  },
  {
    label: 'Compose a Ghazal in Roman Urdu',
    tag: 'On-Demand Poetry · Roman Urdu',
    prompt:
      'Write a classical ghazal in Roman Urdu about evening rain on an old courtyard and an unfinished conversation, using the radif "hai abhi".',
  },
  {
    label: 'اردو غزل لکھوائیں — شبِ تنہائی',
    tag: 'Urdu Script · اشعار',
    prompt:
      'شبِ تنہائی، خاموشی اور امید کے چراغ پر اردو رسم الخط میں ایک خوبصورت غزل لکھیں۔',
  },
  {
    label: 'हिन्दी कविता — स्मृति और सावन',
    tag: 'Hindi · काव्य',
    prompt:
      'सावन की पहली बारिश और पुरानी यादों पर देवनागरी हिन्दी में एक भावपूर्ण कविता लिखिए।',
  },
];

const POETRY_FOLLOW_UP_SUGGESTIONS = [
  'Make it sadder',
  'Change the last line',
  'Write this in Roman Urdu',
  'Write this in Urdu script (اردو)',
  'Write this in Hindi (हिन्दी)',
  'Explain this couplet',
];

export default function App() {
  // User Settings & Theme
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (raw) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {
      // Ignore storage error
    }
    return DEFAULT_SETTINGS;
  });

  // Apply theme attribute to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage error
    }
  }, [settings]);

  // Firebase Auth User
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);

  // Conversations State
  const [chats, setChats] = useState<ChatThread[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_CHATS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore error
    }
    return INITIAL_SEED_CHATS;
  });

  const [activeChatId, setActiveChatId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_ACTIVE_CHAT_KEY);
      if (savedId) return savedId;
    } catch {
      // Ignore
    }
    return INITIAL_SEED_CHATS[0].id;
  });

  // Sidebar & Modal States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterSavedOnly, setFilterSavedOnly] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isFarhangOpen, setIsFarhangOpen] = useState<boolean>(false);
  const [isCraftDrawerOpen, setIsCraftDrawerOpen] = useState<boolean>(false);

  // Composer State
  const [composerText, setComposerText] = useState<string>('');
  const [composerScript, setComposerScript] = useState<PoetryLanguage>('auto');
  const [useWebResearch, setUseWebResearch] = useState<boolean>(false);
  const [craftForm, setCraftForm] = useState<PoetryForm>('ghazal');
  const [craftMood, setCraftMood] = useState<PoetryMood>('ishq');
  const [craftRadif, setCraftRadif] = useState<string>('');

  // Streaming & Error State
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<{
    message: string;
    retryAction?: () => void;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeChat =
    chats.find((c) => c.id === activeChatId) || chats[0] || null;

  // Save activeChatId to localStorage
  useEffect(() => {
    if (activeChatId) {
      try {
        localStorage.setItem(STORAGE_ACTIVE_CHAT_KEY, activeChatId);
      } catch {
        // Ignore
      }
    }
  }, [activeChatId]);

  // Persist chats to localStorage and sync to backend persistent DB
  const syncChatsToServer = useCallback(
    async (updatedChats: ChatThread[], ownerId: string) => {
      try {
        localStorage.setItem(STORAGE_CHATS_KEY, JSON.stringify(updatedChats));
      } catch {
        // Ignore quota errors
      }
      if (!hasBackendApiAvailable()) return;
      try {
        await fetch(resolveApiUrl('/api/chats/sync'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ownerId, chats: updatedChats }),
        });
      } catch {
        // Ignore offline errors
      }
    },
    []
  );

  // Initial load from server persistent store if localStorage wasn't populated
  useEffect(() => {
    if (!hasBackendApiAvailable()) return;
    let cancelled = false;
    const ownerKey = user?.uid || 'guest';
    fetch(resolveApiUrl(`/api/chats?ownerId=${encodeURIComponent(ownerKey)}`))
      .then((res) => {
        const ct = res.headers.get('content-type') || '';
        return res.ok && ct.includes('application/json') ? res.json() : null;
      })
      .then((data) => {
        if (cancelled || !data || !Array.isArray(data.chats)) return;
        const hasLocal = localStorage.getItem(STORAGE_CHATS_KEY);
        if (!hasLocal && data.chats.length > 0) {
          setChats(data.chats);
        }
      })
      .catch(() => {
        // Local state already initialized
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  // Sync changes whenever `chats` updates
  useEffect(() => {
    const ownerKey = user?.uid || 'guest';
    syncChatsToServer(chats, ownerKey);
  }, [chats, user?.uid, syncChatsToServer]);

  // Firebase Auth listener & Firestore User-Isolated Sync
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);

      if (currentUser && currentUser.emailVerified) {
        const chatsPath = 'chats';
        try {
          const q = query(
            collection(db, chatsPath),
            where('ownerId', '==', currentUser.uid)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            const loadedThreads: ChatThread[] = [];
            for (const chatDoc of snap.docs) {
              const cData = chatDoc.data();
              const msgPath = `chats/${chatDoc.id}/messages`;
              let msgs: ChatMessageItem[] = [];
              try {
                const mQ = query(
                  collection(db, msgPath),
                  where('ownerId', '==', currentUser.uid)
                );
                const mSnap = await getDocs(mQ);
                msgs = mSnap.docs
                  .map((d) => {
                    const md = d.data();
                    return {
                      id: d.id,
                      chatId: chatDoc.id,
                      ownerId: String(md.ownerId || currentUser.uid),
                      role: (md.role === 'assistant' ? 'assistant' : 'user') as
                        | 'user'
                        | 'assistant',
                      content: String(md.content || ''),
                      feedback: (md.feedback || 'none') as MessageFeedback,
                      createdAt:
                        md.createdAt?.toDate?.()?.toISOString?.() ||
                        new Date().toISOString(),
                      updatedAt:
                        md.updatedAt?.toDate?.()?.toISOString?.() ||
                        new Date().toISOString(),
                    };
                  })
                  .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
              } catch (err) {
                handleFirestoreError(err, OperationType.LIST, msgPath);
              }

              loadedThreads.push({
                id: chatDoc.id,
                ownerId: String(cData.ownerId || currentUser.uid),
                title: String(cData.title || 'Conversation'),
                saved: Boolean(cData.saved),
                createdAt:
                  cData.createdAt?.toDate?.()?.toISOString?.() ||
                  new Date().toISOString(),
                updatedAt:
                  cData.updatedAt?.toDate?.()?.toISOString?.() ||
                  new Date().toISOString(),
                messages: msgs,
              });
            }

            if (loadedThreads.length > 0) {
              loadedThreads.sort((a, b) =>
                b.updatedAt.localeCompare(a.updatedAt)
              );
              setChats(loadedThreads);
              setActiveChatId(loadedThreads[0].id);
            }
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, chatsPath);
        }
      }
    });
    return () => unsub();
  }, []);

  // Helper to persist a chat and message to Firestore when user is signed in
  const persistChatToFirestore = async (chat: ChatThread) => {
    if (!authReady || !user || !user.emailVerified) return;
    const chatId = sanitizeId(chat.id);
    const chatPath = `chats/${chatId}`;
    try {
      await setDoc(doc(db, 'chats', chatId), {
        ownerId: user.uid,
        title: chat.title.slice(0, 200) || 'Conversation',
        saved: Boolean(chat.saved),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, chatPath);
    }
  };

  const persistMessageToFirestore = async (
    chatIdRaw: string,
    msg: ChatMessageItem
  ) => {
    if (!authReady || !user || !user.emailVerified) return;
    const chatId = sanitizeId(chatIdRaw);
    const messageId = sanitizeId(msg.id);
    const msgPath = `chats/${chatId}/messages/${messageId}`;
    const safeContent = (msg.content || '').slice(0, 20000);
    if (!safeContent) return;
    try {
      await setDoc(doc(db, 'chats', chatId, 'messages', messageId), {
        chatId,
        ownerId: user.uid,
        role: msg.role,
        content: safeContent,
        feedback: msg.feedback || 'none',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, msgPath);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setChats((prev) =>
      prev.map((c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.isStreaming
            ? {
                ...m,
                content: m.content || 'Generation stopped by user.',
                isStreaming: false,
              }
            : m
        ),
      }))
    );
  };

  // Core AI Streaming & Response Handler (Web + Android APK Resilient)
  const streamAssistantReply = async (
    targetChatId: string,
    conversationMessages: ChatMessageItem[],
    assistantMsgId: string
  ) => {
    setIsStreaming(true);
    setErrorBanner(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const effectiveSettings: UserSettings = {
      ...settings,
      defaultScript:
        composerScript !== 'auto' ? composerScript : settings.defaultScript,
    };

    try {
      await executeResilientChatTurn({
        messages: conversationMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        settings: effectiveSettings,
        useWebResearch: useWebResearch || settings.enableWebGrounding,
        signal: controller.signal,
        onChunk: (accumulatedText) => {
          setChats((prev) =>
            prev.map((c) =>
              c.id === targetChatId
                ? {
                    ...c,
                    updatedAt: new Date().toISOString(),
                    messages: c.messages.map((m) =>
                      m.id === assistantMsgId
                        ? {
                            ...m,
                            content: accumulatedText,
                            isStreaming: true,
                          }
                        : m
                    ),
                  }
                : c
            )
          );
        },
        onComplete: async (finalContent, groundingSources) => {
          const now = new Date().toISOString();
          const finalMsg: ChatMessageItem = {
            id: assistantMsgId,
            chatId: targetChatId,
            ownerId: user?.uid || 'guest',
            role: 'assistant',
            content: finalContent,
            feedback: 'none',
            createdAt: now,
            updatedAt: now,
            isStreaming: false,
            groundingSources,
          };

          setChats((prev) =>
            prev.map((c) =>
              c.id === targetChatId
                ? {
                    ...c,
                    updatedAt: now,
                    messages: c.messages.map((m) =>
                      m.id === assistantMsgId ? finalMsg : m
                    ),
                  }
                : c
            )
          );
          await persistMessageToFirestore(targetChatId, finalMsg);
        },
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setErrorBanner({
        message:
          err instanceof Error
            ? err.message
            : 'Connection interrupted while generating response. Please retry.',
        retryAction: () =>
          streamAssistantReply(
            targetChatId,
            conversationMessages,
            assistantMsgId
          ),
      });
    } finally {
      abortControllerRef.current = null;
      setIsStreaming(false);
      setTimeout(scrollToBottom, 80);
    }
  };

  // Send a new message in the current chat
  const handleSendMessage = async (overrideText?: string) => {
    const rawText =
      typeof overrideText === 'string' ? overrideText : composerText;
    const trimmed = rawText.trim();

    if (!trimmed) {
      setErrorBanner({
        message: 'Please enter a message, question, or poetic prompt before sending.',
      });
      return;
    }

    if (isStreaming) return;
    setErrorBanner(null);

    if (typeof overrideText !== 'string') {
      setComposerText('');
      if (composerRef.current) {
        composerRef.current.style.height = 'auto';
      }
    }

    const now = new Date().toISOString();
    const ownerId = user?.uid || 'guest';
    let targetChat = activeChat;

    // Create a new chat thread if none exists
    if (!targetChat) {
      const newChatId = `chat-${Date.now()}`;
      targetChat = {
        id: newChatId,
        ownerId,
        title: deriveChatTitle(trimmed),
        saved: false,
        createdAt: now,
        updatedAt: now,
        messages: [],
      };
      setChats((prev) => [targetChat!, ...prev]);
      setActiveChatId(newChatId);
      await persistChatToFirestore(targetChat);
    }

    const userMsg: ChatMessageItem = {
      id: `msg-u-${Date.now()}`,
      chatId: targetChat.id,
      ownerId,
      role: 'user',
      content: trimmed,
      feedback: 'none',
      createdAt: now,
      updatedAt: now,
    };

    const assistantMsgId = `msg-a-${Date.now() + 1}`;
    const placeholderAssistantMsg: ChatMessageItem = {
      id: assistantMsgId,
      chatId: targetChat.id,
      ownerId,
      role: 'assistant',
      content: '',
      feedback: 'none',
      createdAt: now,
      updatedAt: now,
      isStreaming: true,
    };

    const updatedHistory = [...targetChat.messages, userMsg];
    const shouldUpdateTitle =
      targetChat.messages.length === 0 ||
      targetChat.title === 'New Literary Conversation' ||
      targetChat.title === 'New Chat';
    const nextTitle = shouldUpdateTitle
      ? deriveChatTitle(trimmed)
      : targetChat.title;

    setChats((prev) =>
      prev.map((c) =>
        c.id === targetChat!.id
          ? {
              ...c,
              title: nextTitle,
              updatedAt: now,
              messages: [...updatedHistory, placeholderAssistantMsg],
            }
          : c
      )
    );

    setTimeout(scrollToBottom, 50);
    await persistMessageToFirestore(targetChat.id, userMsg);

    await streamAssistantReply(targetChat.id, updatedHistory, assistantMsgId);
  };

  // Start a fresh conversation
  const handleNewChat = async () => {
    setErrorBanner(null);
    if (activeChat && activeChat.messages.length === 0) {
      composerRef.current?.focus();
      return;
    }

    const now = new Date().toISOString();
    const newChat: ChatThread = {
      id: `chat-${Date.now()}`,
      ownerId: user?.uid || 'guest',
      title: 'New Chat',
      saved: false,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };

    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setComposerText('');
    await persistChatToFirestore(newChat);
    setTimeout(() => composerRef.current?.focus(), 60);
  };

  // Rename a conversation
  const handleRenameChat = async (chatId: string, newTitle: string) => {
    const cleanTitle = newTitle.trim().slice(0, 200);
    if (!cleanTitle) return;
    const now = new Date().toISOString();

    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId ? { ...c, title: cleanTitle, updatedAt: now } : c
      )
    );

    if (authReady && user && user.emailVerified) {
      const safeId = sanitizeId(chatId);
      try {
        await updateDoc(doc(db, 'chats', safeId), {
          title: cleanTitle,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `chats/${safeId}`);
      }
    }
  };

  // Toggle Saved status on a conversation
  const handleToggleSaveChat = async (chatId: string) => {
    const target = chats.find((c) => c.id === chatId);
    if (!target) return;
    const nextSaved = !target.saved;
    const now = new Date().toISOString();

    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId ? { ...c, saved: nextSaved, updatedAt: now } : c
      )
    );

    if (authReady && user && user.emailVerified) {
      const safeId = sanitizeId(chatId);
      try {
        await updateDoc(doc(db, 'chats', safeId), {
          saved: nextSaved,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `chats/${safeId}`);
      }
    }
  };

  // Delete a conversation
  const handleDeleteChat = async (chatId: string) => {
    const remaining = chats.filter((c) => c.id !== chatId);
    if (remaining.length === 0) {
      const now = new Date().toISOString();
      const fresh: ChatThread = {
        id: `chat-${Date.now()}`,
        ownerId: user?.uid || 'guest',
        title: 'New Chat',
        saved: false,
        createdAt: now,
        updatedAt: now,
        messages: [],
      };
      setChats([fresh]);
      setActiveChatId(fresh.id);
    } else {
      setChats(remaining);
      if (activeChatId === chatId) {
        setActiveChatId(remaining[0].id);
      }
    }

    if (authReady && user && user.emailVerified) {
      const safeId = sanitizeId(chatId);
      try {
        await deleteDoc(doc(db, 'chats', safeId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `chats/${safeId}`);
      }
    }
  };

  // Edit a previous user message and resend from that point
  const handleEditAndResend = async (messageId: string, newContent: string) => {
    if (!activeChat || isStreaming) return;
    const msgIdx = activeChat.messages.findIndex((m) => m.id === messageId);
    if (msgIdx === -1) return;

    const now = new Date().toISOString();
    const updatedUserMsg: ChatMessageItem = {
      ...activeChat.messages[msgIdx],
      content: newContent,
      updatedAt: now,
    };

    const truncatedHistory = [
      ...activeChat.messages.slice(0, msgIdx),
      updatedUserMsg,
    ];

    const assistantMsgId = `msg-a-${Date.now()}`;
    const placeholderAssistantMsg: ChatMessageItem = {
      id: assistantMsgId,
      chatId: activeChat.id,
      ownerId: user?.uid || 'guest',
      role: 'assistant',
      content: '',
      feedback: 'none',
      createdAt: now,
      updatedAt: now,
      isStreaming: true,
    };

    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChat.id
          ? {
              ...c,
              updatedAt: now,
              messages: [...truncatedHistory, placeholderAssistantMsg],
            }
          : c
      )
    );

    await streamAssistantReply(
      activeChat.id,
      truncatedHistory,
      assistantMsgId
    );
  };

  // Regenerate an assistant response
  const handleRegenerateMessage = async (messageId: string) => {
    if (!activeChat || isStreaming) return;
    const msgIdx = activeChat.messages.findIndex((m) => m.id === messageId);
    if (msgIdx === -1) return;

    const historyUpToAssistant = activeChat.messages.slice(0, msgIdx);
    if (historyUpToAssistant.length === 0) return;

    const now = new Date().toISOString();
    const assistantMsgId = `msg-a-${Date.now()}`;
    const placeholderAssistantMsg: ChatMessageItem = {
      id: assistantMsgId,
      chatId: activeChat.id,
      ownerId: user?.uid || 'guest',
      role: 'assistant',
      content: '',
      feedback: 'none',
      createdAt: now,
      updatedAt: now,
      isStreaming: true,
    };

    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChat.id
          ? {
              ...c,
              updatedAt: now,
              messages: [...historyUpToAssistant, placeholderAssistantMsg],
            }
          : c
      )
    );

    await streamAssistantReply(
      activeChat.id,
      historyUpToAssistant,
      assistantMsgId
    );
  };

  // Continue / expand from an assistant message (context-aware: poetry vs prose)
  const handleContinueMessage = async (messageId: string) => {
    const targetMsg = activeChat?.messages.find((m) => m.id === messageId);
    const hasPoem = Boolean(targetMsg && /\[VERSE\]/i.test(targetMsg.content));
    await handleSendMessage(
      hasPoem
        ? 'Continue this poem with two more couplets in the same meter and radif.'
        : 'Please continue and tell me more about this.'
    );
  };

  // Rate an assistant message (thumbs up / down)
  const handleMessageFeedback = async (
    messageId: string,
    feedback: MessageFeedback
  ) => {
    if (!activeChat) return;
    const now = new Date().toISOString();

    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChat.id
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === messageId ? { ...m, feedback, updatedAt: now } : m
              ),
            }
          : c
      )
    );

    if (authReady && user && user.emailVerified) {
      const safeChatId = sanitizeId(activeChat.id);
      const safeMsgId = sanitizeId(messageId);
      try {
        await updateDoc(
          doc(db, 'chats', safeChatId, 'messages', safeMsgId),
          {
            feedback,
            updatedAt: serverTimestamp(),
          }
        );
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `chats/${safeChatId}/messages/${safeMsgId}`
        );
      }
    }
  };

  // Insert structured Poetic Craft prompt into composer
  const handleInsertCraftPrompt = () => {
    const scriptLabel =
      composerScript === 'urdu'
        ? 'in Urdu script (اردو)'
        : composerScript === 'hindi'
        ? 'in Hindi Devanagari (हिन्दी)'
        : composerScript === 'roman_urdu'
        ? 'in Roman Urdu'
        : '';
    const radifPart = craftRadif.trim()
      ? ` with the radif "${craftRadif.trim()}"`
      : '';
    const baseTheme = composerText.trim() || 'quiet longing and evening lamps';
    const crafted = `Compose a ${craftMood} ${craftForm} ${scriptLabel}${radifPart} about: ${baseTheme}`
      .replace(/\s+/g, ' ')
      .trim();
    setComposerText(crafted);
    setIsCraftDrawerOpen(false);
    setTimeout(() => composerRef.current?.focus(), 50);
  };

  const handleApplyLexiconTerm = (entry: LexiconEntry) => {
    setComposerText(
      `Compose a ghazal weaving in the classical motif "${entry.word}" (${entry.urduScript} — ${entry.meaning}) with the radif "${entry.sampleRadif}".`
    );
    setIsFarhangOpen(false);
    setTimeout(() => composerRef.current?.focus(), 50);
  };

  const composerDetection = detectLanguageAndScript(composerText);

  // Only show poetry-refinement chips if the latest assistant message actually contains poetry
  const lastAssistantMsg = activeChat
    ? [...activeChat.messages].reverse().find((m) => m.role === 'assistant')
    : undefined;
  const showPoetryFollowUpChips = Boolean(
    lastAssistantMsg && /\[VERSE\]/i.test(lastAssistantMsg.content)
  );

  return (
    <div className="box-border h-[100dvh] w-full overflow-hidden flex bg-[var(--bg-canvas)] text-[var(--text-primary)] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Left ChatGPT-Style Sidebar */}
      <ChatSidebar
        chats={chats}
        activeChatId={activeChat?.id || ''}
        searchQuery={searchQuery}
        onChangeSearch={setSearchQuery}
        filterSavedOnly={filterSavedOnly}
        onToggleFilterSaved={setFilterSavedOnly}
        onSelectChat={(id) => {
          setActiveChatId(id);
          setErrorBanner(null);
        }}
        onNewChat={handleNewChat}
        onRenameChat={handleRenameChat}
        onToggleSaveChat={handleToggleSaveChat}
        onDeleteChat={handleDeleteChat}
        theme={settings.theme}
        onToggleTheme={() =>
          setSettings((prev) => ({
            ...prev,
            theme: prev.theme === 'dark' ? 'light' : 'dark',
          }))
        }
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenFarhangModal={() => setIsFarhangOpen(true)}
        user={user}
        onSignIn={async () => {
          try {
            await signInWithGoogle();
          } catch {
            // Popup closed by user
          }
        }}
        onSignOut={signOutUser}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Central Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Conversation Header */}
        <header className="min-h-14 px-3 sm:px-6 py-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label="Open conversation sidebar"
              className="lg:hidden p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] cursor-pointer shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <h1 className="font-display text-lg sm:text-xl font-semibold text-[var(--text-primary)] truncate">
                {activeChat?.title || 'Sukhan AI'}
              </h1>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {activeChat && (
              <button
                type="button"
                onClick={() => handleToggleSaveChat(activeChat.id)}
                aria-label={
                  activeChat.saved
                    ? 'Remove conversation from saved'
                    : 'Bookmark conversation'
                }
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  activeChat.saved
                    ? 'bg-[var(--bg-elevated)] border-[var(--accent-gold)] text-[var(--accent-gold)]'
                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Bookmark
                  className={`w-3.5 h-3.5 ${
                    activeChat.saved ? 'fill-[var(--accent-gold)]' : ''
                  }`}
                />
                <span className="hidden sm:inline">
                  {activeChat.saved ? 'Saved' : 'Save Chat'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsFarhangOpen(true)}
              aria-label="Open Farhang Poetic Lexicon"
              className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
              <span className="hidden md:inline">Farhang</span>
            </button>

            <button
              type="button"
              onClick={handleNewChat}
              className="px-3 py-1.5 rounded-lg bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[var(--accent-fg)] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
          </div>
        </header>

        {/* Scrollable Message Stream */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {!activeChat || activeChat.messages.length === 0 ? (
              /* Empty State / Literary Welcome Screen */
              <div className="py-8 sm:py-12 space-y-8 text-center">
                <div className="space-y-3 max-w-xl mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-strong)] flex items-center justify-center mx-auto">
                    <Feather className="w-6 h-6 text-[var(--accent-gold)]" />
                  </div>
                  <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[var(--text-primary)]">
                    How can Sukhan AI help you today?
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Chat naturally about anything, ask questions, or request{' '}
                    <span className="text-[var(--text-primary)] font-medium">
                      Urdu Ghazals (اردو)
                    </span>
                    ,{' '}
                    <span className="text-[var(--text-primary)] font-medium">
                      Roman Urdu Shayari
                    </span>
                    , and{' '}
                    <span className="text-[var(--text-primary)] font-medium">
                      Hindi Kavita (हिन्दी)
                    </span>{' '}
                    whenever you want to compose poetry.
                  </p>
                </div>

                {/* Starter Prompt Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-2xl mx-auto">
                  {STARTER_PROMPTS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(item.prompt)}
                      className="p-4 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all space-y-1.5 text-left cursor-pointer group"
                    >
                      <div className="text-[11px] font-medium text-[var(--accent-gold)]">
                        {item.tag}
                      </div>
                      <div className="font-display text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-gold)] transition-colors">
                        {item.label}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] line-clamp-2">
                        {item.prompt}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Active Conversation Messages */
              <div className="space-y-6">
                {activeChat.messages.map((msg) => {
                  if (msg.role === 'assistant' && msg.isStreaming && !msg.content) {
                    return (
                      <div
                        key={msg.id}
                        aria-live="polite"
                        className="flex items-center gap-3 text-xs text-[var(--text-secondary)] py-2"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-strong)] flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-[var(--accent-gold)] animate-spin" />
                        </div>
                        <span>Sukhan AI is thinking...</span>
                      </div>
                    );
                  }
                  return (
                    <ChatMessageBubble
                      key={msg.id}
                      message={msg}
                      isStreaming={isStreaming}
                      onEditAndResend={handleEditAndResend}
                      onRegenerate={handleRegenerateMessage}
                      onContinue={handleContinueMessage}
                      onFeedback={handleMessageFeedback}
                    />
                  );
                })}
              </div>
            )}

            {/* Error & Retry Banner */}
            {errorBanner && (
              <div
                role="alert"
                className="rounded-xl bg-rose-950/50 border border-rose-500/40 p-3.5 flex items-center justify-between gap-3 text-xs text-rose-200"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorBanner.message}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {errorBanner.retryAction && (
                    <button
                      type="button"
                      onClick={errorBanner.retryAction}
                      className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-100 font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setErrorBanner(null)}
                    aria-label="Dismiss error"
                    className="p-1 text-rose-300 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Bottom ChatGPT-Style Composer Dock */}
        <footer className="px-3 sm:px-6 pb-3 sm:pb-4 pt-2 bg-[var(--bg-canvas)] border-t border-[var(--border-subtle)] shrink-0">
          <div className="max-w-3xl mx-auto space-y-2.5">
            {/* Contextual Follow-Up Quick Chips ONLY when latest response contains a poem */}
            {showPoetryFollowUpChips && (
              <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
                <span className="text-[11px] text-[var(--text-muted)] shrink-0 mr-1">
                  Refine Poem:
                </span>
                {POETRY_FOLLOW_UP_SUGGESTIONS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={isStreaming}
                    onClick={() => handleSendMessage(chip)}
                    className="px-2.5 py-1 rounded-md bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Collapsible Poetic Craft Helper Drawer */}
            {isCraftDrawerOpen && (
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-strong)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--accent-gold)]">
                    Poetic Craft Builder (Builds a Poetry Prompt)
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCraftDrawerOpen(false)}
                    aria-label="Close poetic craft helper"
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label
                      htmlFor="craft-form-select"
                      className="block text-[11px] text-[var(--text-muted)] mb-1"
                    >
                      Poetic Form
                    </label>
                    <select
                      id="craft-form-select"
                      value={craftForm}
                      onChange={(e) =>
                        setCraftForm(e.target.value as PoetryForm)
                      }
                      className="w-full rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
                    >
                      <option value="ghazal">Ghazal (غزل)</option>
                      <option value="shayari">2-Line Shayari (شعر)</option>
                      <option value="nazm">Nazm (نظم)</option>
                      <option value="qita">Qita (قطعہ)</option>
                      <option value="caption">Poetic Caption</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="craft-mood-select"
                      className="block text-[11px] text-[var(--text-muted)] mb-1"
                    >
                      Mood (Kaifiyat)
                    </label>
                    <select
                      id="craft-mood-select"
                      value={craftMood}
                      onChange={(e) =>
                        setCraftMood(e.target.value as PoetryMood)
                      }
                      className="w-full rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
                    >
                      <option value="ishq">Ishq (Devotion)</option>
                      <option value="hijr">Hijr (Longing)</option>
                      <option value="nostalgia">Yaad (Nostalgia)</option>
                      <option value="tasawwuf">Tasawwuf (Mystic)</option>
                      <option value="melancholy">Melancholy</option>
                      <option value="hope">Umeed (Hope)</option>
                      <option value="inkilaab">Inkilaab (Resilience)</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="craft-radif-input"
                      className="block text-[11px] text-[var(--text-muted)] mb-1"
                    >
                      Optional Radif (Refrain)
                    </label>
                    <input
                      id="craft-radif-input"
                      type="text"
                      value={craftRadif}
                      onChange={(e) => setCraftRadif(e.target.value)}
                      placeholder="e.g. hai abhi / ہے ابھی"
                      className="w-full rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleInsertCraftPrompt}
                    className="px-3 py-1.5 rounded-lg bg-[var(--accent-gold)] text-[var(--accent-fg)] text-xs font-semibold cursor-pointer"
                  >
                    Insert Poetry Prompt
                  </button>
                </div>
              </div>
            )}

            {/* Main Composer Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-strong)] focus-within:border-[var(--accent-gold)] transition-colors p-2.5 sm:p-3 space-y-2"
            >
              <textarea
                ref={composerRef}
                id="sukhan-chat-input"
                rows={2}
                dir={composerDetection.scriptDirection}
                value={composerText}
                onChange={(e) => {
                  setComposerText(e.target.value);
                  if (errorBanner) setErrorBanner(null);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Message Sukhan AI... Chat normally about anything, or ask for a ghazal / shayari when you want one"
                className={`w-full resize-none bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none text-sm sm:text-[15px] leading-relaxed ${
                  composerDetection.detected === 'urdu'
                    ? 'font-urdu text-lg text-right'
                    : ''
                }`}
              />

              {/* Bottom Composer Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--border-subtle)]">
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Script Selector */}
                  <div
                    role="group"
                    aria-label="Preferred output script"
                    className="inline-flex items-center rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] p-0.5 text-[11px]"
                  >
                    {(
                      [
                        { id: 'auto', label: 'Auto' },
                        { id: 'roman_urdu', label: 'Roman' },
                        { id: 'urdu', label: 'اردو' },
                        { id: 'hindi', label: 'हिन्दी' },
                      ] as { id: PoetryLanguage; label: string }[]
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setComposerScript(opt.id)}
                        aria-pressed={composerScript === opt.id}
                        className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                          composerScript === opt.id
                            ? 'bg-[var(--accent-gold)] text-[var(--accent-fg)] font-semibold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Poetic Craft Drawer Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsCraftDrawerOpen((v) => !v)}
                    aria-expanded={isCraftDrawerOpen}
                    className={`px-2.5 py-1 rounded-lg border text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isCraftDrawerOpen
                        ? 'bg-[var(--bg-elevated)] border-[var(--accent-gold)] text-[var(--accent-gold)]'
                        : 'bg-[var(--bg-canvas)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Poetic Craft</span>
                  </button>

                  {/* Web Grounding Toggle */}
                  <button
                    type="button"
                    onClick={() => setUseWebResearch((v) => !v)}
                    aria-pressed={useWebResearch}
                    className={`px-2.5 py-1 rounded-lg border text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                      useWebResearch
                        ? 'bg-[var(--bg-elevated)] border-[var(--accent-gold)] text-[var(--accent-gold)]'
                        : 'bg-[var(--bg-canvas)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Web Grounding</span>
                  </button>
                </div>

                {/* Send or Stop Button */}
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={handleStopGenerating}
                    aria-label="Stop generating"
                    className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Square className="w-3 h-3 fill-rose-300" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    aria-label="Send message"
                    className="px-4 py-1.5 rounded-xl bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[var(--accent-fg)] font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </footer>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-strong)] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <SettingsIcon className="w-4 h-4 text-[var(--accent-gold)]" />
                <h2
                  id="settings-modal-title"
                  className="font-display text-2xl font-semibold text-[var(--text-primary)]"
                >
                  Sukhan AI Settings
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                aria-label="Close settings"
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Theme Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-[var(--text-primary)]">
                    Appearance Theme
                  </div>
                  <div className="text-[var(--text-muted)]">
                    Switch between Midnight Plum Dark and Ivory Parchment Light
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      theme: prev.theme === 'dark' ? 'light' : 'dark',
                    }))
                  }
                  className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-primary)] font-medium inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {settings.theme === 'dark' ? (
                    <>
                      <Moon className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                      <span>Dark Mode</span>
                    </>
                  ) : (
                    <>
                      <Sun className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                      <span>Light Mode</span>
                    </>
                  )}
                </button>
              </div>

              {/* Default Script */}
              <div className="space-y-1.5">
                <label
                  htmlFor="settings-default-script"
                  className="block font-medium text-[var(--text-primary)]"
                >
                  Default Poetry Script
                </label>
                <select
                  id="settings-default-script"
                  value={settings.defaultScript}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      defaultScript: e.target.value as PoetryLanguage,
                    }))
                  }
                  className="w-full rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--text-primary)]"
                >
                  <option value="auto">Auto-Detect from Message</option>
                  <option value="roman_urdu">Roman Urdu</option>
                  <option value="urdu">Urdu Script (اردو نستعلیق)</option>
                  <option value="hindi">Hindi Devanagari (हिन्दी)</option>
                </select>
              </div>

              {/* Poetic Sensibility */}
              <div className="space-y-1.5">
                <label
                  htmlFor="settings-poetic-style"
                  className="block font-medium text-[var(--text-primary)]"
                >
                  Poetic Style &amp; Sensibility
                </label>
                <select
                  id="settings-poetic-style"
                  value={settings.poeticStyle}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      poeticStyle: e.target.value as WritingStyle,
                    }))
                  }
                  className="w-full rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--text-primary)]"
                >
                  <option value="classical">
                    Classical Ustad (Ghalib / Mir Tradition)
                  </option>
                  <option value="modern_literary">
                    Modern Literary (Faiz / Parveen Tradition)
                  </option>
                  <option value="minimal_contemporary">
                    Minimal Contemporary (Jaun Elia Cadence)
                  </option>
                  <option value="sufi_mystic">Sufi &amp; Mystic</option>
                  <option value="revolutionary">
                    Progressive / Inkilaabi
                  </option>
                </select>
              </div>

              {/* Show Translations */}
              <label className="flex items-center justify-between cursor-pointer pt-1">
                <div>
                  <div className="font-medium text-[var(--text-primary)]">
                    Include English Meanings &amp; Craft Notes
                  </div>
                  <div className="text-[var(--text-muted)]">
                    Provide English translations alongside Urdu and Hindi verses
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showTranslations}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      showTranslations: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-[#D4AF6A]"
                />
              </label>
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)] flex justify-end">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-lg bg-[var(--accent-gold)] text-[var(--accent-fg)] text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Farhang Poetic Lexicon Modal */}
      {isFarhangOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Farhang Poetic Lexicon"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
        >
          <div className="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-strong)] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <span className="text-xs uppercase tracking-widest text-[var(--accent-gold)] font-semibold">
                Sukhan Farhang · Poetic Vocabulary
              </span>
              <button
                type="button"
                onClick={() => setIsFarhangOpen(false)}
                aria-label="Close Farhang modal"
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <FarhangView onApplyLexiconTerm={handleApplyLexiconTerm} />
          </div>
        </div>
      )}
    </div>
  );
}
