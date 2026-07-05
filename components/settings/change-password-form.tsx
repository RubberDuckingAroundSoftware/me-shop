'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Result = { kind: 'ok' | 'fail'; message: string } | null;

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    if (newPassword.length < 8) {
      setResult({ kind: 'fail', message: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirm) {
      setResult({ kind: 'fail', message: 'New passwords do not match.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({ kind: 'fail', message: data.error || 'Could not update password.' });
        setSubmitting(false);
        return;
      }
      setResult({ kind: 'ok', message: 'Password updated.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch {
      setResult({ kind: 'fail', message: 'Network error. Try again.' });
    }
    setSubmitting(false);
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-text-primary">Change Password</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Update the password for your account.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Current password
          </label>
          <Input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            New password
          </label>
          <Input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Confirm new password
          </label>
          <Input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Updating…' : 'Update password'}
          </Button>
        </div>

        {result && (
          <div
            className={cn(
              'flex items-start gap-2 rounded-lg px-3 py-2 text-sm',
              result.kind === 'ok'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            )}
          >
            {result.kind === 'ok' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{result.message}</span>
          </div>
        )}
      </form>
    </section>
  );
}
