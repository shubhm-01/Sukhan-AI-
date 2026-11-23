/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { Capacitor } from '@capacitor/core';
import {
  Menu,
  Plus,
  Send,
  Waves,
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
  Mic,
  MicOff,
} from 'lucide-react';
import { ChatSidebar } from './components/ChatSidebar';
import { ChatMessageBubble } from './components/ChatMessageBubble';
import { FarhangView } from './components/FarhangView';
import { LiveVoiceModal } from './components/LiveVoiceModal';
import { SavedPoemsModal } from './components/SavedPoemsModal';
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
  detectLanguageAndScript,
  detectUserIntent,
} from './utils/poetryLogic';
import {
  resolveApiUrl,
  hasBackendApiAvailable,
  executeResilientChatTurn,
} from './utils/apiClient';
import { supabase, type SupabaseUser } from './lib/supabase';
import {
  deleteChatFromCloud,
  persistChatToCloud,
  persistMessageToCloud,
  syncLocalDataToCloud,
  updateChatInCloud,
  updateMessageInCloud,
} from './lib/cloudSync';
import { AuthModal } from './components/AuthModal';

const STORAGE_CHATS_KEY = 'sukhan_ai_chats_v3';
const STORAGE_ACTIVE_CHAT_KEY = 'sukhan_ai_active_chat_v3';
const STORAGE_SETTINGS_KEY = 'sukhan_ai_settings_v3';

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  defaultScript: 'auto',
  poeticStyle: 'classical',
  showTranslations: true,
  enableWebGrounding: false,
  voice: 'auto',
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
      localStorage.setItem('sukhan_api_base_url', settings.apiBaseUrl?.trim() || '');
    } catch {
      // Ignore storage error
    }
  }, [settings]);

  // Firebase Auth User
  const [user, setUser] = useState<SupabaseUser | null>(null);
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState<boolean>(false);
  const [isSavedPoemsOpen, setIsSavedPoemsOpen] = useState<boolean>(false);
  const closeLiveVoice = useCallback(() => setIsLiveVoiceOpen(false), []);
  const [isFarhangOpen, setIsFarhangOpen] = useState<boolean>(false);
  const [isCraftDrawerOpen, setIsCraftDrawerOpen] = useState<boolean>(false);

  // Composer State
  const [composerText, setComposerText] = useState<string>('');
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const speechRecognitionRef = useRef<any>(null);
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

  // Chat history is stored locally for guests and in authenticated Firestore for signed-in users.
  // The old public /api/chats endpoint trusted a caller-supplied ownerId; the UI no longer uses it.
  const syncChatsToServer = useCallback(async (updatedChats: ChatThread[]) => {
    try {
      localStorage.setItem(STORAGE_CHATS_KEY, JSON.stringify(updatedChats));
    } catch {
      // Ignore storage quota errors; current in-memory chat state remains usable.
    }
  }, []);

  useEffect(() => {
    syncChatsToServer(chats);
  }, [chats, syncChatsToServer]);

  // Supabase Auth listener. Guests continue using localStorage without a cloud connection.
  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setErrorBanner({ message: `Could not restore cloud sign-in: ${error.message}` });
      }
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // On sign-in, merge this device's offline-first history and saved poems into the
  // authenticated account, then hydrate the device with the account's cloud history.
  useEffect(() => {
    if (!authReady || !user) return;
    let cancelled = false;

    const syncAfterSignIn = async () => {
      try {
        const syncedThreads = await syncLocalDataToCloud(user.id, chats);
        if (cancelled) return;
        if (syncedThreads.length > 0) {
          setChats(syncedThreads);
          setActiveChatId((current) =>
            syncedThreads.some((chat) => chat.id === current) ? current : syncedThreads[0].id
          );
        }
      } catch (err) {
        if (!cancelled) {
          setErrorBanner({
            message: `Cloud sync failed. Your chats remain safely stored on this device. ${err instanceof Error ? err.message : ''}`,
          });
        }
      }
    };

    void syncAfterSignIn();
    return () => { cancelled = true; };
  }, [authReady, user?.id]);

  const persistChatToFirestore = async (chat: ChatThread) => {
    if (!authReady || !user) return;
    try {
      await persistChatToCloud(user.id, chat);
    } catch (err) {
      setErrorBanner({
        message: `Could not sync this chat to the cloud. It is still saved locally. ${err instanceof Error ? err.message : ''}`,
      });
    }
  };

  const persistMessageToFirestore = async (chatId: string, msg: ChatMessageItem) => {
    if (!authReady || !user || !msg.content?.trim()) return;
    try {
      await persistMessageToCloud(user.id, chatId, msg);
    } catch (err) {
      setErrorBanner({
        message: `Could not sync this message to the cloud. It is still saved locally. ${err instanceof Error ? err.message : ''}`,
      });
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
            ownerId: user?.id || 'guest',
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
    const ownerId = user?.id || 'guest';
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
      ownerId: user?.id || 'guest',
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

    if (authReady && user) {
      try {
        await updateChatInCloud(user.id, chatId, { title: cleanTitle });
      } catch (err) {
        setErrorBanner({ message: `Could not update cloud chat. Local copy is safe. ${err instanceof Error ? err.message : ''}` });
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

    if (authReady && user) {
      try {
        await updateChatInCloud(user.id, chatId, { saved: nextSaved });
      } catch (err) {
        setErrorBanner({ message: `Could not update cloud chat. Local copy is safe. ${err instanceof Error ? err.message : ''}` });
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
        ownerId: user?.id || 'guest',
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

    if (authReady && user) {
      try {
        await deleteChatFromCloud(user.id, chatId);
      } catch (err) {
        setErrorBanner({ message: `Could not delete the cloud copy. Your local view was updated. ${err instanceof Error ? err.message : ''}` });
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
      ownerId: user?.id || 'guest',
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
      ownerId: user?.id || 'guest',
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

    if (authReady && user) {
      try {
        await updateMessageInCloud(user.id, activeChat.id, messageId, feedback);
      } catch (err) {
        setErrorBanner({ message: `Could not sync message feedback. ${err instanceof Error ? err.message : ''}` });
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

  const handleVoiceInput = async () => {
    if (isVoiceListening) {
      try {
        if (Capacitor.isNativePlatform()) await SpeechRecognition.stop();
        else speechRecognitionRef.current?.stop();
      } catch { /* already stopped */ }
      setIsVoiceListening(false);
      return;
    }

    setErrorBanner(null);
    const language = composerScript === 'urdu' || composerScript === 'roman_urdu'
      ? 'ur-PK'
      : composerScript === 'hindi' ? 'hi-IN' : 'en-IN';

    if (Capacitor.isNativePlatform()) {
      try {
        const available = await SpeechRecognition.available();
        if (!available.available) {
          setErrorBanner({ message: 'Speech recognition is unavailable on this device. Install or enable a speech recognition service in Android settings.' });
          return;
        }
        let permission = await SpeechRecognition.checkPermissions();
        if (permission.speechRecognition !== 'granted') {
          permission = await SpeechRecognition.requestPermissions();
        }
        if (permission.speechRecognition !== 'granted') {
          setErrorBanner({ message: 'Microphone/speech permission was not granted. Allow microphone access in Android app settings, then try Voice again.' });
          return;
        }
        const listener = await SpeechRecognition.addListener('partialResults', (event: { matches?: string[] }) => {
          const transcript = event.matches?.[0]?.trim();
          if (transcript) {
            setComposerText((current) => (current.trim() ? current.trimEnd() + ' ' : '') + transcript);
          }
        });
        speechRecognitionRef.current = { remove: () => listener.remove() };
        setIsVoiceListening(true);
        await SpeechRecognition.start({
          language,
          maxResults: 3,
          partialResults: true,
          popup: true,
          prompt: 'Speak your message',
        });
        setIsVoiceListening(false);
        const activeListener = speechRecognitionRef.current;
        speechRecognitionRef.current = null;
        try { await activeListener?.remove?.(); } catch { /* listener already removed */ }
      } catch (error) {
        setIsVoiceListening(false);
        const message = error instanceof Error ? error.message : String(error || '');
        setErrorBanner({ message: /permission|denied|not.?allowed/i.test(message)
          ? 'Android did not grant microphone/speech permission. Open Settings → Apps → Sukhan AI → Permissions and allow Microphone.'
          : 'Voice input could not start. Check that a speech recognition service and the selected language are available on this device.' });
      }
      return;
    }

    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setErrorBanner({ message: 'Voice typing is not available in this browser. Use the keyboard microphone or install the Android app with native speech support.' });
      return;
    }
    try {
      const recognition = new SpeechRecognitionCtor();
      speechRecognitionRef.current = recognition;
      recognition.lang = language;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) transcript += event.results[i][0]?.transcript || '';
        if (transcript.trim()) setComposerText((current) => (current.trim() ? current.trimEnd() + ' ' : '') + transcript.trim());
      };
      recognition.onerror = (event: any) => {
        setIsVoiceListening(false);
        if (event?.error && event.error !== 'no-speech' && event.error !== 'aborted') {
          setErrorBanner({ message: 'Voice input failed (' + event.error + '). Check microphone permission and speech service settings.' });
        }
      };
      recognition.onend = () => setIsVoiceListening(false);
      recognition.start();
      setIsVoiceListening(true);
    } catch {
      setIsVoiceListening(false);
      setErrorBanner({ message: 'Could not start voice input. Please allow microphone access and check your device speech service.' });
    }
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
        onOpenSavedPoems={() => setIsSavedPoemsOpen(true)}
        user={user}
        onSignIn={() => setIsAuthModalOpen(true)}
        onSignOut={async () => {
          try {
            await supabase?.auth.signOut();
          } catch (err) {
            setErrorBanner({ message: err instanceof Error ? err.message : 'Could not sign out.' });
          }
        }}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Central Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Conversation Header */}
        <header className="relative z-20 flex min-h-16 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/90 px-3 py-2 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            aria-label="Open chat and saved poetry drawer"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] transition-colors hover:border-[var(--accent-gold)] lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-1">
            <h1 className="font-display text-xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-2xl">Sukhan AI</h1>
            <div className="flex items-center gap-1.5">
              <select
                aria-label="Quick language selection"
                value={composerScript}
                onChange={(event) => setComposerScript(event.target.value as PoetryLanguage)}
                className="max-w-[108px] rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-[10px] text-[var(--text-secondary)] outline-none focus:border-[var(--accent-gold)]"
              >
                <option value="auto">Auto language</option>
                <option value="roman_urdu">Roman Urdu</option>
                <option value="urdu">Urdu · اردو</option>
                <option value="hindi">Hindi · हिन्दी</option>
              </select>
              <select
                aria-label="Quick poetry form selection"
                value={craftForm}
                onChange={(event) => setCraftForm(event.target.value as PoetryForm)}
                className="max-w-[92px] rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-[10px] text-[var(--text-secondary)] outline-none focus:border-[var(--accent-gold)]"
              >
                <option value="ghazal">Ghazal</option>
                <option value="shayari">Shayari</option>
                <option value="nazm">Nazm</option>
                <option value="qita">Qita</option>
                <option value="caption">Caption</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNewChat}
            aria-label="Start new chat"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-gold)] text-[var(--accent-fg)] shadow-sm transition-transform hover:scale-105 active:scale-95"
          >
            <Plus className="h-4 w-4" />
          </button>
        </header>

        {/* Scrollable Message Stream */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {!activeChat || activeChat.messages.length === 0 ? (
              /* Minimal welcome screen with quick poetic starters */
              <div className="mx-auto flex max-w-xl flex-col items-center gap-6 py-10 text-center sm:py-16">
                <div className="grid h-14 w-14 place-items-center rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-elevated)]">
                  <Feather className="h-7 w-7 text-[var(--accent-gold)]" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-display text-3xl font-semibold text-[var(--text-primary)] sm:text-4xl">A thought becomes a verse.</h2>
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">Talk naturally, explore literature, or ask Sukhan to write in the language and form you love.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    { label: 'Urdu Ghazal', prompt: 'اردو رسم الخط میں جدائی، شام اور امید پر ایک خوبصورت غزل لکھیں۔' },
                    { label: 'Romantic Shayari', prompt: 'Write romantic two-line shayari in Roman Urdu about an unfinished conversation.' },
                    { label: 'Hindi Veer Ras Kavita', prompt: 'Write a powerful Hindi Veer Ras kavita in Devanagari about courage and self-respect.' },
                    { label: 'Nazm', prompt: 'Write a thoughtful nazm about memories returning with the first monsoon rain.' },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleSendMessage(item.prompt)}
                      className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)]"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              
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
                      voice={settings.voice || 'auto'}
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

        {/* Compact floating composer dock */}
        <footer className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)]/95 px-3 pb-3 pt-2 backdrop-blur-xl sm:px-6 sm:pb-4">
          <div className="mx-auto max-w-3xl space-y-2">
            {showPoetryFollowUpChips && (
              <div className="flex flex-wrap gap-1.5">
                {POETRY_FOLLOW_UP_SUGGESTIONS.slice(0, 4).map((chip) => (
                  <button key={chip} type="button" disabled={isStreaming} onClick={() => handleSendMessage(chip)} className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-[10px] text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-gold)] disabled:opacity-40">{chip}</button>
                ))}
              </div>
            )}

            {isCraftDrawerOpen && (
              <div className="grid grid-cols-1 gap-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-3 sm:grid-cols-3">
                <label className="space-y-1 text-[10px] text-[var(--text-muted)]">
                  <span>Poetic form</span>
                  <select value={craftForm} onChange={(event) => setCraftForm(event.target.value as PoetryForm)} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-2 text-xs text-[var(--text-primary)]">
                    <option value="ghazal">Ghazal</option><option value="shayari">Shayari</option><option value="nazm">Nazm</option><option value="qita">Qita</option><option value="caption">Caption</option>
                  </select>
                </label>
                <label className="space-y-1 text-[10px] text-[var(--text-muted)]">
                  <span>Mood</span>
                  <select value={craftMood} onChange={(event) => setCraftMood(event.target.value as PoetryMood)} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-2 text-xs text-[var(--text-primary)]">
                    <option value="ishq">Ishq</option><option value="hijr">Hijr</option><option value="nostalgia">Nostalgia</option><option value="tasawwuf">Tasawwuf</option><option value="melancholy">Melancholy</option><option value="hope">Hope</option><option value="inkilaab">Inkilaab</option>
                  </select>
                </label>
                <label className="space-y-1 text-[10px] text-[var(--text-muted)]">
                  <span>Optional Radif</span>
                  <input value={craftRadif} onChange={(event) => setCraftRadif(event.target.value)} placeholder="hai abhi / ہے ابھی" className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-2 text-xs text-[var(--text-primary)]" />
                </label>
                <div className="flex items-center justify-between gap-3 sm:col-span-3">
                  <label className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]"><input type="checkbox" checked={useWebResearch} onChange={(event) => setUseWebResearch(event.target.checked)} className="accent-[var(--accent-gold)]" />Use web grounding for this chat</label>
                  <button type="button" onClick={handleInsertCraftPrompt} className="rounded-xl bg-[var(--accent-gold)] px-3 py-2 text-xs font-semibold text-[var(--accent-fg)]">Apply craft</button>
                </div>
              </div>
            )}

            <form onSubmit={(event) => { event.preventDefault(); handleSendMessage(); }} className="flex items-end gap-2 rounded-[1.6rem] border border-[var(--border-strong)] bg-[var(--bg-surface)] p-2 shadow-[0_12px_42px_rgba(0,0,0,.10)] focus-within:border-[var(--accent-gold)]">
              <button type="button" onClick={() => setIsCraftDrawerOpen((value) => !value)} aria-label="Poetic craft options" aria-expanded={isCraftDrawerOpen} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--accent-gold)]">
                <SlidersHorizontal className="h-4 w-4" />
              </button>
              <textarea
                ref={composerRef}
                id="sukhan-chat-input"
                rows={1}
                dir={composerDetection.scriptDirection}
                value={composerText}
                onChange={(event) => {
                  setComposerText(event.target.value);
                  if (errorBanner) setErrorBanner(null);
                  event.target.style.height = 'auto';
                  event.target.style.height = `${Math.min(event.target.scrollHeight, 128)}px`;
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSendMessage(); }
                }}
                placeholder="Message Sukhan AI…"
                className={`max-h-32 min-h-10 flex-1 resize-none self-center bg-transparent px-1 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] ${composerDetection.detected === 'urdu' ? 'font-urdu text-right text-lg' : ''}`}
              />
              <button type="button" onClick={handleVoiceInput} aria-label={isVoiceListening ? 'Stop dictation' : 'Dictate message'} aria-pressed={isVoiceListening} className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors ${isVoiceListening ? 'border-rose-400 bg-rose-500/15 text-rose-400' : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)]'}`}>
                {isVoiceListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <button type="button" onClick={() => setIsLiveVoiceOpen(true)} aria-label="Start live voice conversation" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--accent-gold)] transition-transform hover:scale-105 active:scale-95">
                <Waves className="h-4 w-4" />
              </button>
              {isStreaming ? (
                <button type="button" onClick={handleStopGenerating} aria-label="Stop generating" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-500/15 text-rose-400"><Square className="h-3.5 w-3.5" /></button>
              ) : (
                <button type="submit" disabled={!composerText.trim()} aria-label="Send message" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--accent-gold)] text-[var(--accent-fg)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"><Send className="h-4 w-4" /></button>
              )}
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
              <div className="space-y-2">
                <div>
                  <div className="font-medium text-[var(--text-primary)]">Appearance</div>
                  <div className="text-[var(--text-muted)]">Choose a reading surface</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {([{id:'dark',label:'Dark'},{id:'light',label:'Light'},{id:'warm',label:'Warm paper'}] as const).map((theme) => (
                    <button key={theme.id} type="button" onClick={() => setSettings((prev) => ({...prev,theme:theme.id}))} aria-pressed={settings.theme === theme.id} className={`rounded-xl border px-2 py-2.5 text-xs transition-colors ${settings.theme === theme.id ? 'border-[var(--accent-gold)] bg-[var(--bg-elevated)] text-[var(--accent-gold)]' : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]'}`}>{theme.label}</button>
                  ))}
                </div>
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

              {/* Voice and backend */}
              <div className="space-y-3 border-t border-[var(--border-subtle)] pt-3">
                <div className="space-y-1.5">
                  <label htmlFor="settings-voice" className="block font-medium text-[var(--text-primary)]">Read-aloud voice</label>
                  <select id="settings-voice" value={settings.voice || 'auto'} onChange={(event) => setSettings((prev) => ({...prev,voice:event.target.value}))} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)]">
                    <option value="auto">Auto · match the poem language</option>
                    <option value="ur-PK-UzmaNeural">Urdu · Uzma (Pakistan)</option>
                    <option value="ur-IN-GulNeural">Urdu · Gul (India)</option>
                    <option value="hi-IN-SwaraNeural">Hindi · Swara</option>
                    <option value="hi-IN-MadhurNeural">Hindi · Madhur</option>
                    <option value="en-IN-NeerjaNeural">English · Neerja (India)</option>
                    <option value="en-IN-PrabhatNeural">English · Prabhat (India)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="settings-api-url" className="block font-medium text-[var(--text-primary)]">Backend URL for Android APK</label>
                  <input id="settings-api-url" type="url" value={settings.apiBaseUrl || ''} onChange={(event) => setSettings((prev) => ({...prev,apiBaseUrl:event.target.value}))} placeholder="https://your-service.run.app" className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
                  <p className="text-[10px] leading-4 text-[var(--text-muted)]">Set this to your HTTPS Node backend. Provider API keys are never entered into the app.</p>
                </div>
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
      {isSavedPoemsOpen && <SavedPoemsModal onClose={() => setIsSavedPoemsOpen(false)} />}
      {isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} />}
      {isLiveVoiceOpen && (
        <LiveVoiceModal
          onClose={closeLiveVoice}
          language={composerScript === 'auto' ? (settings.defaultScript || 'ur') : composerScript}
          voice={settings.voice || 'auto'}
        />
      )}
    </div>
  );
}