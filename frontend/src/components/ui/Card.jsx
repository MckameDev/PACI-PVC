export default function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm ${
        hover ? 'hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300' : 'transition-shadow duration-200'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
