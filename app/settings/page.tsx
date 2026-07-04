import { redirect } from 'next/navigation';
import { getLlmConfig } from '@/db/repo';
import { getCurrentUser } from '@/lib/auth';
import { SettingsForm } from '@/components/settings/settings-form';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return <SettingsForm initial={getLlmConfig(user.id)} />;
}
