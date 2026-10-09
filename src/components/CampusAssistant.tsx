import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  X,
  Send,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Loader2,
  HelpCircle,
  Check,
} from 'lucide-react';

export type AppPage = 'maintenance' | 'vault' | 'events' | 'attendance';

interface SuggestedAction {
  page: AppPage;
  label: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestedActions?: SuggestedAction[];
  isError?: boolean;
  timestamp: string;
}

interface CampusAssistantProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  isDark?: boolean;
}

const SUGGESTED_QUESTIONS = [
  'What events are coming up?',
  'Find my academic resources.',
  'How do I report a maintenance issue?',
  'How does attendance work?',
  'What can I do on this website?',
];

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome-msg',
  role: 'assistant',
  content:
    "Hello! I'm your Campus Assistant. I can help you find notes in the Academic Vault, check upcoming campus events, understand digital attendance, or guide you on reporting maintenance issues. How can I assist you today?",
  suggestedActions: [
    { page: 'events', label: 'Open Campus Events' },
    { page: 'vault', label: 'Open Academic Vault' },
    { page: 'maintenance', label: 'Open Maintenance Hub' },
    { page: 'attendance', label: 'Open Digital Attendance' },
  ],
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

export const CampusAssistant: React.FC<CampusAssistantProps> = ({
  onNavigate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [navFeedback, setNavFeedback] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build conversation history for context
      const history = messages
        .filter(m => !m.isError && m.id !== 'welcome-msg')
        .slice(-6)
        .map(m => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          history,
        }),
      });

      if (!res.ok) {
        throw new Error('Service response not ok');
      }

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply || "I'm here to help. You can explore the modules using the navigation menu.",
        suggestedActions: data.suggestedActions || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Campus Assistant error:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content:
          'Campus Assistant is temporarily unavailable. Please try again shortly or use the website navigation directly.',
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: SuggestedAction) => {
    onNavigate(action.page);
    setNavFeedback(action.label);
    setTimeout(() => {
      setNavFeedback(null);
    }, 2500);
  };

  return (
    <>
      {/* Floating Launch Button (Requirement 2) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Campus Assistant"
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-indigo-400/30"
        >
          <span className="text-base select-none">🤖</span>
          <span className="font-semibold tracking-tight">Campus Assistant</span>
        </button>
      )}

      {/* Compact Chat Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Campus Assistant Chat"
          className="fixed bottom-6 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 h-[540px] max-h-[85vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-white backdrop-blur-xs">
                <Bot className="w-5 h-5 text-indigo-100" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-white tracking-tight leading-tight">Campus Assistant</h3>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[11px] text-indigo-200 font-medium leading-none mt-0.5">
                  Sapthagiri NPS University
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close Campus Assistant"
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Action Toast */}
          {navFeedback && (
            <div className="bg-emerald-50 dark:bg-emerald-950/80 border-b border-emerald-200 dark:border-emerald-800 px-3 py-1.5 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Navigated to: {navFeedback}</span>
              </div>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 bg-slate-50/70 dark:bg-slate-950/60">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : msg.isError
                      ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 rounded-bl-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-bl-xs'
                  }`}
                >
                  {msg.isError && (
                    <div className="flex items-center gap-1.5 font-semibold text-xs mb-1 text-rose-600 dark:text-rose-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Notice
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Navigation Action Buttons (Requirement 6) */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap gap-1.5">
                      {msg.suggestedActions.map((action, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleActionClick(action)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 transition-colors cursor-pointer"
                        >
                          <span>{action.label}</span>
                          <ArrowRight className="w-3 h-3 text-indigo-500" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl rounded-bl-xs px-3.5 py-2.5 text-xs text-slate-600 dark:text-slate-300 shadow-xs flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                  <span>Checking campus records...</span>
                </div>
              </div>
            )}

            {/* Suggested Questions Section */}
            {messages.length <= 2 && (
              <div className="pt-2">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  <HelpCircle className="w-3 h-3 text-indigo-500" />
                  <span>Suggested questions:</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTED_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleSendMessage(q)}
                      className="text-left text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/70 transition-colors flex items-center justify-between group disabled:opacity-50 cursor-pointer"
                    >
                      <span>{q}</span>
                      <Sparkles className="w-3 h-3 text-indigo-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input & Send Form */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Ask about events, vault, complaints..."
              disabled={isLoading}
              className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              aria-label="Send message"
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 transition-all cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
