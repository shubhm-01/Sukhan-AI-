import React from 'react';
import { MessageSquare, ArrowRight, Trash2, Plus } from 'lucide-react';
import { PoetrySession } from '../utils/poetryLogic';

interface SessionsViewProps {
  sessions: PoetrySession[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewSession: () => void;
}

export const SessionsView: React.FC<SessionsViewProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onNewSession,
}) => {
  return (
    <section aria-label="Poetry Conversation Sessions" className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#D4AF6A]/15">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#D4AF6A]">
            Continuity &amp; Islah History
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#F5EFE6] mt-1">
            Composition Sessions
          </h1>
          <p className="text-sm text-[#C8BDB0] mt-1 max-w-xl">
            Every poem you compose or refine is preserved as an ongoing literary session. Resume any session to add couplets, adjust meter, or shift script.
          </p>
        </div>

        <button
          type="button"
          onClick={onNewSession}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-[#D4AF6A] hover:bg-[#E5C687] text-[#0B070E] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Start New Session</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sessions.map((session) => {
          const isCurrent = session.id === activeSessionId;
          const poetTurns = session.turns.filter((t) => t.role === 'poet' && t.poem);
          const latestPoem = poetTurns[poetTurns.length - 1]?.poem;
          const firstCouplet = latestPoem?.couplets?.[0]?.lines?.join(' / ') || '';

          return (
            <article
              key={session.id}
              className={`bg-[#130D18] rounded-xl p-6 border transition-colors flex flex-col justify-between space-y-5 diwan-page-shadow ${
                isCurrent ? 'border-[#D4AF6A]' : 'border-[#D4AF6A]/20'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[#8E8276]">
                  <div>
                    <span className="uppercase tracking-wider text-[#D4AF6A]">
                      {session.form}
                    </span>
                    <span aria-hidden="true" className="mx-1.5">·</span>
                    <span>
                      {session.language === 'urdu'
                        ? 'Urdu'
                        : session.language === 'hindi'
                        ? 'Hindi'
                        : 'Roman Urdu'}
                    </span>
                    <span aria-hidden="true" className="mx-1.5">·</span>
                    <span className="font-mono-tabular">
                      {poetTurns.length} {poetTurns.length === 1 ? 'Draft' : 'Drafts'}
                    </span>
                  </div>
                  {isCurrent && (
                    <span className="text-[#D4AF6A] font-medium">
                      Active Session
                    </span>
                  )}
                </div>

                <h2 className="font-display text-2xl font-semibold text-[#F5EFE6]">
                  {session.title}
                </h2>

                {firstCouplet && (
                  <p
                    dir={latestPoem?.scriptDirection || 'ltr'}
                    className={`text-sm text-[#C8BDB0] italic pt-2 border-t border-[#D4AF6A]/10 ${
                      latestPoem?.language === 'urdu' ? 'font-urdu text-base leading-[2.2]' : ''
                    }`}
                  >
                    &ldquo;{firstCouplet}&rdquo;
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-[#D4AF6A]/12 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onSelectSession(session.id)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-[#D4AF6A]/20 hover:bg-[#D4AF6A] text-[#F5EFE6] hover:text-[#0B070E] border border-[#D4AF6A]/40 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Resume in Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {sessions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeleteSession(session.id)}
                    aria-label={`Delete session ${session.title}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#8E8276] hover:text-rose-300 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
