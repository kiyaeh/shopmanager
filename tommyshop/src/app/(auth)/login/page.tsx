import LoginForm from './LoginForm';

export const metadata = { title: 'Login — Tommy Market' };

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">Tommy Market</h1>
        <LoginForm />
      </div>
    </main>
  );
}
