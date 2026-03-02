export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 px-6 py-4">
      <div className="flex items-center justify-center text-xs text-secondary">
        <span>
          Desarrollado por Team PVC{' '}
          <a
            href="https://www.teampvc.cl"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:text-primary-light underline underline-offset-2 transition-colors"
          >
            www.teampvc.cl
          </a>
        </span>
      </div>
    </footer>
  );
}
