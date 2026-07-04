import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { RegisterForm } from '@/components/auth/register-form';

export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Start building your shopping projects."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
