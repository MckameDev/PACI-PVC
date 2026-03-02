import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
        <AlertTriangle className="h-8 w-8 text-warning" />
      </div>
      <h1 className="text-4xl font-bold text-slate-900">404</h1>
      <p className="mt-2 text-sm text-secondary">La página que buscas no existe.</p>
      <Link to="/" className="mt-6">
        <Button variant="primary" size="md">
          <Home className="h-4 w-4" />
          Volver al Dashboard
        </Button>
      </Link>
    </div>
  );
}
