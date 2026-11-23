import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛒</span>
          <span className="text-white font-bold text-xl tracking-tight">Tommy Market</span>
        </div>
        <Link
          href="/login"
          className="rounded-lg bg-white text-zinc-900 px-4 py-2 text-sm font-semibold hover:bg-zinc-100 transition-colors"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 border border-indigo-500/30 px-4 py-1.5 text-sm text-indigo-300 font-medium">
            🇪🇹 Built for Ethiopian food shops
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
            Replace daily chat reports<br />
            <span className="text-indigo-400">with a real system</span>
          </h1>

          <p className="text-zinc-400 text-lg max-w-lg mx-auto leading-relaxed">
            Track sales, inventory, transfers and credit in real time. 
            Ethiopian calendar dates, Amharic item labels, and offline support built in.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="rounded-xl bg-indigo-600 text-white px-8 py-4 text-base font-bold hover:bg-indigo-500 transition-colors min-h-[52px] flex items-center justify-center"
            >
              Get Started →
            </Link>
            <a
              href="#features"
              className="rounded-xl border border-zinc-600 text-zinc-300 px-8 py-4 text-base font-medium hover:border-zinc-400 hover:text-white transition-colors min-h-[52px] flex items-center justify-center"
            >
              See Features
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20 bg-zinc-900/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-12">Everything your shop needs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '💵', title: 'Cash, Transfer & Credit', desc: 'Record any payment split. Transfer receipts require screenshot upload and admin verification.' },
              { icon: '📦', title: 'Inventory Tracking', desc: 'Real-time stock levels updated on every sale and purchase. Weighted average cost calculated automatically.' },
              { icon: '📅', title: 'Ethiopian Calendar', desc: 'All dates displayed in Ethiopian (Ge\'ez) calendar by default, with a toggle for Gregorian.' },
              { icon: '📄', title: 'Daily PDF Reports', desc: 'Admin and Sales PDFs generated on day close. Amharic item names print correctly with Noto Sans Ethiopic.' },
              { icon: '📶', title: 'Works Offline', desc: 'Create sales when internet is down. They sync automatically when connection is restored.' },
              { icon: '🔐', title: 'Role-Based Access', desc: 'SALES staff see stock and totals only. Cost prices, profit and reports are ADMIN-only — enforced server-side.' },
            ].map(f => (
              <div key={f.title} className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-6 space-y-3">
                <span className="text-3xl">{f.icon}</span>
                <h3 className="font-semibold text-white">{f.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 text-center">
        <div className="max-w-xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold text-white">Ready to get started?</h2>
          <p className="text-zinc-400">Sign in with your username and password provided by your admin.</p>
          <Link
            href="/login"
            className="inline-flex rounded-xl bg-indigo-600 text-white px-8 py-4 text-base font-bold hover:bg-indigo-500 transition-colors"
          >
            Sign In to Tommy Market
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-6 text-center text-zinc-600 text-sm">
        Tommy Market · Sales, Inventory & Transfer Verification for Ethiopian Food Shops
      </footer>
    </main>
  );
}
