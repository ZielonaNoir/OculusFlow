"use client";

import { useState } from 'react';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { cn } from "@/lib/utils";
import { Icon } from '@iconify/react';

export default function NanoBananaChat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({ api: '/api/nanobanana' }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    
    await sendMessage({
      parts: [{ type: 'text', text: userMessage }]
    });
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30">
            <Icon icon="lucide:banana" className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">NanoBanana Chat</h2>
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "w-1.5 h-1.5 rounded-full animate-pulse",
                isLoading ? "bg-emerald-500" : "bg-zinc-600"
              )} />
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                {isLoading ? 'Processing' : 'Ready'}
              </span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-400"
        >
          <Icon icon="lucide:rotate-ccw" className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
            <Icon icon="lucide:message-square-dashed" className="w-12 h-12 text-zinc-600" />
            <p className="text-sm text-zinc-500">No messages yet. Start a conversation with NanoBanana!</p>
          </div>
        ) : (
          messages.map((message: UIMessage) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                message.role === 'user' 
                  ? "bg-blue-600/20 border-blue-500/30" 
                  : "bg-zinc-800 border-white/10"
              )}>
                <Icon 
                  icon={message.role === 'user' ? "lucide:user" : "lucide:bot"} 
                  className={cn("w-4 h-4", message.role === 'user' ? "text-blue-400" : "text-zinc-400")} 
                />
              </div>
              <div className={cn(
                "rounded-2xl px-4 py-2 max-w-[80%] text-sm leading-relaxed",
                message.role === 'user'
                  ? "bg-blue-600 text-white rounded-tr-sm"
                  : "bg-white/5 text-zinc-200 border border-white/10 rounded-tl-sm whitespace-pre-wrap"
              )}>
                {message.parts.map((part, i) => (
                   part.type === 'text' ? <span key={i}>{part.text}</span> : null
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-6 bg-zinc-900/50 border-t border-white/5">
        <form onSubmit={handleSubmit} className="relative flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors pr-10"
              disabled={isLoading}
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Icon icon="lucide:loader-2" className="w-4 h-4 text-zinc-500 animate-spin" />
              </div>
            )}
          </div>
          {isLoading ? (
            <button
              type="button"
              onClick={() => stop()}
              className="bg-red-600 hover:bg-red-500 text-white p-3 rounded-2xl transition-all shadow-lg shadow-red-600/20 shrink-0"
              title="Stop generating"
            >
              <Icon icon="lucide:square" className="w-5 h-5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="bg-zinc-100 hover:bg-white disabled:opacity-30 disabled:hover:bg-zinc-100 text-zinc-950 p-3 rounded-2xl transition-all shadow-lg shadow-white/10 shrink-0"
            >
              <Icon icon="lucide:send-horizontal" className="w-5 h-5" />
            </button>
          )}
        </form>
        <p className="mt-4 text-[10px] text-center text-zinc-600 uppercase tracking-widest font-medium">
          Powered by Gemini 2.5 Flash
        </p>
      </div>
    </div>
  );
}
