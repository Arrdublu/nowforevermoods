export default function NotFound() {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-24">
      <div className="max-w-md w-full text-center space-y-8">
        <h1 className="font-serif text-6xl text-brand-black italic">404</h1>
        <p className="text-brand-muted uppercase tracking-[0.3em] font-bold text-xs ring-1 ring-brand-line p-4">
          Terminal Error: Resource Not Found
        </p>
        <a href="/" className="inline-block bg-brand-black text-white px-8 py-4 uppercase tracking-[0.4em] text-[10px] font-bold">
          Return to Hub
        </a>
      </div>
    </div>
  );
}
