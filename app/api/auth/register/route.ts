import { NextRequest, NextResponse } from 'next/server';
import { createUser, emailExists } from '@/db/repo';
import { createToken, hashPassword, setSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: 'A valid email is required.' },
      { status: 400 }
    );
  }
  if (!name || name.length > 100) {
    return NextResponse.json(
      { error: 'Name is required (1–100 characters).' },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters.' },
      { status: 400 }
    );
  }

  if (emailExists(email)) {
    return NextResponse.json(
      { error: 'That email is already registered.' },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const user = createUser({ email, name, passwordHash });

  const token = await createToken({
    userId: user.id,
    email: user.email,
    name: user.name,
  });
  await setSessionCookie(token);

  return NextResponse.json(
    { user: { id: user.id, email: user.email, name: user.name } },
    { status: 201 }
  );
}
