import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/db/repo';
import { createToken, setSessionCookie, verifyPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  // Generic 401 — never reveal whether the email or the password was wrong.
  const invalid = () =>
    NextResponse.json(
      { error: 'Invalid email or password.' },
      { status: 401 }
    );

  if (!email || !password) return invalid();

  const user = getUserByEmail(email);
  if (!user) return invalid();

  const ok = await verifyPassword(password, user.password);
  if (!ok) return invalid();

  const token = await createToken({
    userId: user.id,
    email: user.email,
    name: user.name,
  });
  await setSessionCookie(token);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
  });
}
