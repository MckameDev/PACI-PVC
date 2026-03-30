import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, GraduationCap } from 'lucide-react';
import useAuthStore from '../stores/useAuthStore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor, complete todos los campos.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.message || 'Error al conectar con el servidor. Intente nuevamente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-dark via-primary to-accent p-4 relative overflow-hidden">
      {/* Decorative background circles */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 rounded-full bg-green/10 blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 rounded-full bg-orange/10 blur-3xl" />
      <div className="absolute top-[40%] left-[20%] w-64 h-64 rounded-full bg-accent/10 blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="rounded-3xl bg-white/95 backdrop-blur-md px-8 py-10 shadow-2xl shadow-black/20 animate-scale-in">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">PACI PVC</h1>
            <p className="mt-1 text-sm text-secondary">
              Plataforma de Adecuación Curricular Individual
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-medium text-danger animate-fade-in-up">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              id="email"
              label="Correo Electrónico"
              type="email"
              placeholder="nombre@ejemplo.cl"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />

            <Input
              id="password"
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
            >
              Iniciar Sesión
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-white/50">
          Desarrollado por Team PVC{' '}
          <a
            href="https://www.teampvc.cl"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-white/80 transition-colors font-medium"
          >
            www.teampvc.cl
          </a>
        </p>
      </div>
    </div>
  );
}
