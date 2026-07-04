'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Header } from '@/components/shell/header';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LLMConfig } from '@/lib/types';
import { ChangePasswordForm } from './change-password-form';

type TestState =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'ok'; message: string }
  | { status: 'fail'; message: string };

export function SettingsForm({ initial }: { initial: LLMConfig }) {
  const [provider, setProvider] = useState<LLMConfig['provider']>(
    initial.provider
  );
  const [baseURL, setBaseURL] = useState(initial.baseURL);
  const [apiKey, setApiKey] = useState(initial.apiKey ?? '');
  const [model, setModel] = useState(initial.model);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState<TestState>({ status: 'idle' });

  const save = async () => {
    setSaving(true);
    setSaved(false);
    await fetch('/api/settings/llm', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, baseURL, apiKey, model }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const testConnection = async () => {
    // Persist first so the agent service reads the latest config.
    await save();
    setTest({ status: 'testing' });
    try {
      const res = await fetch('/api/settings/test');
      const data = await res.json();
      if (data.ok) {
        const llmStatus = data.health?.llm ?? data.health?.status ?? 'reachable';
        setTest({
          status: 'ok',
          message: `Agent service reachable. LLM: ${llmStatus}`,
        });
      } else {
        setTest({ status: 'fail', message: data.error ?? 'Connection failed.' });
      }
    } catch {
      setTest({
        status: 'fail',
        message: "Couldn't reach the agent service.",
      });
    }
  };

  const showConnFields = provider !== 'none';
  const showApiKey = provider === 'cloud';

  return (
    <>
      <Header
        title="Settings"
        subtitle="Configure the LLM that powers the Rubber Duck."
      />
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-xl space-y-6">
          <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-text-primary">
              LLM Provider
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              meShop routes chat through a local Python agent service. Choose how
              it should reach a model.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">
                  Provider
                </label>
                <Select
                  value={provider}
                  onChange={(e) => {
                    setProvider(e.target.value as LLMConfig['provider']);
                    setTest({ status: 'idle' });
                  }}
                >
                  <option value="ollama">Ollama (local)</option>
                  <option value="cloud">Cloud (Anthropic, OpenAI, …)</option>
                  <option value="none">None (disable chat)</option>
                </Select>
              </div>

              {showConnFields && (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-text-primary">
                      Base URL
                    </label>
                    <Input
                      value={baseURL}
                      onChange={(e) => setBaseURL(e.target.value)}
                      placeholder="http://localhost:11434/v1"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-text-primary">
                      Model
                    </label>
                    <Input
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder={
                        provider === 'ollama'
                          ? 'llama3.2'
                          : 'anthropic/claude-3-haiku'
                      }
                    />
                  </div>

                  {showApiKey && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">
                        API Key
                      </label>
                      <Input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-…"
                      />
                    </div>
                  )}
                </>
              )}

              {provider === 'none' && (
                <p className="rounded-lg bg-surface-hover px-3 py-2 text-sm text-text-secondary">
                  Chat is disabled. The Rubber Duck will prompt you to connect a
                  provider.
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center gap-2">
              <Button onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
              {showConnFields && (
                <Button
                  variant="secondary"
                  onClick={testConnection}
                  disabled={test.status === 'testing' || saving}
                >
                  {test.status === 'testing' && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Test Connection
                </Button>
              )}
              {saved && (
                <span className="text-sm text-accent">Saved ✓</span>
              )}
            </div>

            {test.status === 'ok' && (
              <TestResult ok message={test.message} />
            )}
            {test.status === 'fail' && (
              <TestResult ok={false} message={test.message} />
            )}
          </section>

          <ChangePasswordForm />

          <p className="text-xs text-text-tertiary">
            Config is stored in the database and read by the agent service on the
            next request. For Ollama, make sure it&apos;s running with{' '}
            <code className="rounded bg-surface-hover px-1">ollama serve</code>.
          </p>
        </div>
      </div>
    </>
  );
}

function TestResult({ ok, message }: { ok: boolean; message: string }) {
  return (
    <div
      className={cn(
        'mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-sm',
        ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
      )}
    >
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
}
