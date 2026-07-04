import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUserPassword } from '@/db/repo';
import { getCurrentUser, hashPassword, verifyPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const currentPassword =
    typeof body?.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword =
    typeof body?.newPassword === 'string' ? body.newPassword : '';

  const user = getUserById(authUser.id);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ok = await verifyPassword(currentPassword, user.password);
  if (!ok) {
    return NextResponse.json(
      { error: 'Current password is incorrect' },
      { status: 401 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: 'New password must be at least 8 characters.' },
      { status: 400 }
    );
  }

  const hash = await hashPassword(newPassword);
  updateUserPassword(user.id, hash);

  // JWT stays valid — the user remains logged in.
  return NextResponse.json({ success: true });
}
