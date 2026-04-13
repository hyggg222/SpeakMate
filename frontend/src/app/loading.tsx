export default function DashboardLoading() {
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

      {/* Skeleton Main */}
      <main className="flex flex-1 overflow-hidden">
        <section className="flex-1 px-6 pt-6 flex flex-col gap-4">
          <div className="h-7 w-48 rounded bg-slate-200 animate-pulse" />
          <div className="h-32 w-full rounded-2xl bg-slate-200 animate-pulse" />
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        </section>

        {/* Skeleton Right panel */}
        <aside className="w-72 flex-shrink-0 px-4 pt-6 flex flex-col gap-3 border-l" style={{ borderColor: 'var(--border)' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-200 animate-pulse" />
          ))}
        </aside>
      </main>
    </div>
  );
}
