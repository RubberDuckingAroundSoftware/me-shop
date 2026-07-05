'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Send, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatTime, nowIso } from '@/lib/utils';
import type { ChatMessage, Conversation } from '@/lib/types';
import type { ToolProps } from './tool-registry';

interface ChatError {
  code: string;
  message: string;
}

export function RubberDuck({ project }: ToolProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [error, setError] = useState<ChatError | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load (or create) the project's conversation.
  const initConversation = async () => {
    setLoading(true);
    const res = await fetch(`/api/conversations?projectId=${project.id}`);
    const { conversations } = await res.json();
    if (conversations.length > 0) {
      setConversation(conversations[0]);
      setMessages(conversations[0].messages);
    } else {
      const created = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      }).then((r) => r.json());
      setConversation(created.conversation);
      setMessages([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    initConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, streamText, streaming]);

  const persist = async (message: ChatMessage) => {
    if (!conversation) return;
    await fetch(`/api/conversations/${conversation.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
  };

  const newConversation = async () => {
    const created = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: project.id }),
    }).then((r) => r.json());
    setConversation(created.conversation);
    setMessages([]);
    setError(null);
    setStreamText('');
  };

  const send = async () => {
    const text = input.trim();
    if (!text || streaming || !conversation) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: nowIso(),
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setError(null);
    setStreaming(true);
    setStreamText('');
    await persist(userMessage);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          projectId: project.id,
          conversationId: conversation.id,
        }),
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assembled = '';
      let buffer = '';
      let sawError: ChatError | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse complete SSE events (separated by a blank line). The agent
        // service frames events with CRLF (`\r\n\r\n`), so tolerate both.
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? '';
        for (const evt of events) {
          const line = evt
            .split(/\r?\n/)
            .find((l) => l.startsWith('data:'));
          if (!line) continue;
          const json = line.slice(5).trim();
          if (!json) continue;
          try {
            const data = JSON.parse(json);
            if (data.type === 'token') {
              assembled += data.content ?? '';
              setStreamText(assembled);
            } else if (data.type === 'done') {
              if (data.content) assembled = data.content;
            } else if (data.type === 'error') {
              sawError = {
                code: data.code ?? 'error',
                message: data.content ?? 'Something went wrong.',
              };
            }
          } catch {
            // ignore malformed chunk
          }
        }
      }

      if (sawError) {
        setError(sawError);
        setStreaming(false);
        setStreamText('');
        return;
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: assembled,
        timestamp: nowIso(),
      };
      setMessages((m) => [...m, assistantMessage]);
      setStreamText('');
      setStreaming(false);
      await persist(assistantMessage);
    } catch {
      setError({
        code: 'network',
        message:
          "Couldn't reach the chat service. Check that the app and agent service are running.",
      });
      setStreaming(false);
      setStreamText('');
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium text-text-primary">
            Rubber Duck
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={newConversation}>
          <Plus className="h-3.5 w-3.5" />
          New Conversation
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {loading ? (
            <p className="text-center text-sm text-text-tertiary">Loading…</p>
          ) : messages.length === 0 && !streaming ? (
            <div className="pt-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent-light text-accent">
                <MessageCircle className="h-6 w-6" />
              </div>
              <p className="text-sm text-text-secondary">
                Think out loud about <strong>{project.name}</strong>. I know your
                catalog and can help you weigh decisions.
              </p>
            </div>
          ) : (
            messages.map((m, i) => <Bubble key={i} message={m} />)
          )}

          {streaming && (
            <Bubble
              message={{
                role: 'assistant',
                content: streamText,
                timestamp: nowIso(),
              }}
              pending={streamText.length === 0}
            />
          )}

          {error && <ErrorPanel error={error} />}
        </div>
      </div>

      <div className="border-t border-border bg-surface px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Ask the duck anything about this project…"
            disabled={streaming}
            className="max-h-32 flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
          />
          <Button
            onClick={send}
            disabled={!input.trim() || streaming}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  message,
  pending,
}: {
  message: ChatMessage;
  pending?: boolean;
}) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-xl px-4 py-2.5 text-sm',
          isUser
            ? 'bg-accent text-white'
            : 'border border-border bg-surface text-text-primary'
        )}
      >
        {pending ? (
          <span className="flex gap-1 py-1">
            <span className="h-1.5 w-1.5 animate-dot rounded-full bg-text-tertiary" />
            <span
              className="h-1.5 w-1.5 animate-dot rounded-full bg-text-tertiary"
              style={{ animationDelay: '0.15s' }}
            />
            <span
              className="h-1.5 w-1.5 animate-dot rounded-full bg-text-tertiary"
              style={{ animationDelay: '0.3s' }}
            />
          </span>
        ) : (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
      </div>
    </div>
  );
}

function ErrorPanel({ error }: { error: ChatError }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
        <div className="text-sm">
          <p className="text-text-primary">{error.message}</p>
          {error.code === 'no_provider' && (
            <Link
              href="/settings"
              className="mt-2 inline-block font-medium text-accent hover:underline"
            >
              Go to Settings →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
