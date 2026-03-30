export default function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-white/50 backdrop-blur-sm px-6 py-3">
      <div className="flex items-center justify-center text-xs text-secondary">
        <span>
          Desarrollado por Team PVC{' '}
          <a
            href="https://www.teampvc.cl"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:text-accent underline underline-offset-2 transition-colors"
          >
            www.teampvc.cl
          </a>
        </span>
      </div>
    </footer>
  );
}
