export default function HistoryLoading() {
  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ backgroundColor: 'var(--background)' }}>
      {/* Skeleton Sidebar */}
      <aside className="w-20 flex flex-col items-center py-6 gap-6 border-r" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
        <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
        <div className="flex flex-col gap-4 mt-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-10 h-10 rounded-xl bg-slate-200 animate-pulse" />
          ))}
        </div>
      </aside>

      {/* Skeleton Content */}
      <main className="flex-1 px-[10%] py-16">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="h-8 w-56 rounded bg-slate-200 animate-pulse" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 w-full rounded-2xl bg-slate-200 animate-pulse" />
          ))}
        </div>
      </main>
    </div>
  );
}
