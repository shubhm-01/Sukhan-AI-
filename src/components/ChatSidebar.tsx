import React, { useState } from 'react';
import {
  Plus,
  Search,
  MessageSquare,
  Bookmark,
  Edit2,
  Trash2,
  Check,
  X,
  Sun,
  Moon,
  Settings,
  BookOpen,
  LogIn,
  LogOut,
  Cloud,
} from 'lucide-react';
import { ChatThread } from '../utils/poetryLogic';
import { User } from '../lib/firebase';

interface ChatSidebarProps {
  chats: ChatThread[];
  activeChatId: string;
  searchQuery: string;
  onChangeSearch: (q: string) => void;
  filterSavedOnly: boolean;
  onToggleFilterSaved: (savedOnly: boolean) => void;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  onToggleSaveChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenFarhangModal: () => void;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats,
  activeChatId,
  searchQuery,
  onChangeSearch,
  filterSavedOnly,
  onToggleFilterSaved,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onToggleSaveChat,
  onDeleteChat,
  theme,
  onToggleTheme,
  onOpenSettings,
  onOpenFarhangModal,
  user,
  onSignIn,
  onSignOut,
  isMobileOpen,
  onCloseMobile,
}) => {
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState<string>('');

  const filteredChats = chats.filter((chat) => {
    if (filterSavedOnly && !chat.saved) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const titleMatch = chat.title.toLowerCase().includes(q);
    const msgMatch = chat.messages.some((m) =>
      m.content.toLowerCase().includes(q)
    );
    return titleMatch && true || msgMatch;
  });

  const handleStartRename = (chat: ChatThread, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitleValue(chat.title);
  };

  const handleCommitRename = (chatId: string, e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.stopPropagation();
    const trimmed = editTitleValue.trim();
    if (trimmed) {
      onRenameChat(chatId, trimmed);
    }
    setEditingChatId(null);
  };

  const sidebarContent = (
    <aside
      aria-label="Conversation History Sidebar"
      className="w-72 h-full flex flex-col bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] select-none shrink-0"
    >
      {/* Top Brand & New Chat */}
      <div className="p-3.5 space-y-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between px-1">
          <a
            href="#chat"
            onClick={(e) => {
              e.preventDefault();
              onNewChat();
            }}
            className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)] hover:text-[var(--accent-gold)] transition-colors whitespace-nowrap"
          >
            Sukhan AI
          </a>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close sidebar"
            className="lg:hidden p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            onNewChat();
            onCloseMobile();
          }}
          className="w-full py-2.5 px-3.5 rounded-lg bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[var(--accent-fg)] font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Search chat history"
            value={searchQuery}
            onChange={(e) => onChangeSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onChangeSearch('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* All vs Saved Filter Tabs */}
        <div
          role="group"
          aria-label="Filter conversations"
          className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]"
        >
          <button
            type="button"
            onClick={() => onToggleFilterSaved(false)}
            aria-pressed={!filterSavedOnly}
            className={`py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              !filterSavedOnly
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            All Chats ({chats.length})
          </button>
          <button
            type="button"
            onClick={() => onToggleFilterSaved(true)}
            aria-pressed={filterSavedOnly}
            className={`py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              filterSavedOnly
                ? 'bg-[var(--bg-elevated)] text-[var(--accent-gold)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Saved ({chats.filter((c) => c.saved).length})
          </button>
        </div>
      </div>

      {/* Scrollable Conversation List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="px-2 py-1 text-[11px] font-medium text-[var(--text-muted)]">
          {filterSavedOnly ? 'Saved Conversations' : 'Recent Conversations'}
        </div>

        {filteredChats.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-[var(--text-muted)]">
            {searchQuery
              ? 'No conversations match your search.'
              : filterSavedOnly
              ? 'No saved conversations yet. Bookmark any chat to keep it here.'
              : 'No conversations yet. Start a new chat above.'}
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isActive = chat.id === activeChatId;
            const isEditing = editingChatId === chat.id;

            return (
              <div
                key={chat.id}
                className={`group relative rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[var(--bg-elevated)] border border-[var(--border-strong)]'
                    : 'hover:bg-[var(--bg-surface)] border border-transparent'
                }`}
              >
                {isEditing ? (
                  <form
                    onSubmit={(e) => handleCommitRename(chat.id, e)}
                    className="flex items-center gap-1 p-1.5"
                  >
                    <input
                      type="text"
                      aria-label="Edit chat title"
                      value={editTitleValue}
                      onChange={(e) => setEditTitleValue(e.target.value)}
                      autoFocus
                      className="flex-1 min-w-0 px-2 py-1 text-xs rounded bg-[var(--bg-canvas)] border border-[var(--accent-gold)] text-[var(--text-primary)] focus:outline-none"
                    />
                    <button
                      type="submit"
                      aria-label="Save chat title"
                      className="p-1 text-[var(--accent-gold)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingChatId(null)}
                      aria-label="Cancel rename"
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between pr-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectChat(chat.id);
                        onCloseMobile();
                      }}
                      className="flex-1 min-w-0 text-left px-2.5 py-2.5 flex items-center gap-2.5 cursor-pointer"
                    >
                      <MessageSquare
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive
                            ? 'text-[var(--accent-gold)]'
                            : 'text-[var(--text-muted)]'
                        }`}
                      />
                      <span
                        className={`text-xs truncate ${
                          isActive
                            ? 'font-semibold text-[var(--text-primary)]'
                            : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {chat.title}
                      </span>
                    </button>

                    {/* Action Icons: Save, Rename, Delete */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSaveChat(chat.id);
                        }}
                        aria-label={
                          chat.saved
                            ? `Remove ${chat.title} from saved`
                            : `Save ${chat.title}`
                        }
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          chat.saved
                            ? 'text-[var(--accent-gold)]'
                            : 'text-[var(--text-muted)] opacity-70 hover:opacity-100 hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <Bookmark
                          className={`w-3 h-3 ${
                            chat.saved ? 'fill-[var(--accent-gold)]' : ''
                          }`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleStartRename(chat, e)}
                        aria-label={`Rename ${chat.title}`}
                        className="p-1 rounded text-[var(--text-muted)] opacity-70 hover:opacity-100 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChat(chat.id);
                        }}
                        aria-label={`Delete ${chat.title}`}
                        className="p-1 rounded text-[var(--text-muted)] opacity-70 hover:opacity-100 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Footer Controls: Farhang Lexicon, Theme, Settings, Auth */}
      <div className="p-3 border-t border-[var(--border-subtle)] space-y-2">
        <button
          type="button"
          onClick={() => {
            onOpenFarhangModal();
            onCloseMobile();
          }}
          className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-2.5 transition-colors cursor-pointer whitespace-nowrap"
        >
          <BookOpen className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
          <span>Farhang &amp; Poetic Lexicon</span>
        </button>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={
              theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'
            }
            className="px-2.5 py-2 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                <span>Dark Mode</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="px-2.5 py-2 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Settings className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>Settings</span>
          </button>
        </div>

        {/* User Cloud Sync Status */}
        <div className="pt-1 flex items-center justify-between gap-2 px-1 text-xs">
          <div className="flex items-center gap-1.5 min-w-0 text-[var(--text-muted)]">
            <Cloud className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0" />
            <span className="truncate">
              {user ? user.displayName || user.email : 'Synced to Local DB'}
            </span>
          </div>

          {user ? (
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-gold)] hover:underline shrink-0 cursor-pointer"
            >
              <LogIn className="w-3 h-3" />
              <span>Cloud Sign In</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Permanent Sidebar */}
      <div className="hidden lg:block h-full shrink-0">{sidebarContent}</div>

      {/* Mobile Slide-Over Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
