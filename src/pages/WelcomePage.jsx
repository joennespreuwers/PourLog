import { Link } from 'react-router-dom'

const FEATURES = [
  {
    emoji: '🫘',
    title: 'Track your beans',
    description: 'Log roasteries and individual bags — origin, process, roast level, flavour notes. Everything in one place.',
  },
  {
    emoji: '📋',
    title: 'Save your recipes',
    description: 'Capture every V60, Aeropress or espresso recipe down to dose, yield, grind, time and step-by-step instructions.',
  },
  {
    emoji: '☁️',
    title: 'Sync everywhere',
    description: 'Your journal lives in the cloud. Sign in on any device and everything is right there — nothing lost, nothing duplicated.',
  },
  {
    emoji: '🔗',
    title: 'Share anything',
    description: 'Every recipe, bean and roastery has a public share link with a QR code. Send it to a friend in seconds.',
  },
  {
    emoji: '⭐',
    title: 'Rate & favourite',
    description: "Star your best cups and heart the things you love. Your profile page shows everything you've curated.",
  },
  {
    emoji: '⚗️',
    title: 'Track your gear',
    description: 'Log your brewers, grinders and filter papers. Link equipment directly to recipes so you always know what you used.',
  },
]

export default function WelcomePage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-paper)' }}>
      {/* Nav */}
      <header className="px-6 py-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: '#fff' }}>
        <Link to="/" className="font-serif text-lg font-medium" style={{ color: 'var(--color-espresso)' }}>PourLog</Link>
        <nav className="flex items-center gap-4">
          <Link to="/help" className="text-sm" style={{ color: 'var(--color-stone)' }}>Help</Link>
          <Link
            to="/app"
            className="px-4 py-1.5 rounded-md text-sm font-medium"
            style={{ backgroundColor: 'var(--color-espresso)', color: 'var(--color-paper)' }}
          >
            Open app
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 py-20 gap-6 max-w-2xl mx-auto">
        <h1 className="font-serif text-5xl font-medium leading-tight" style={{ color: 'var(--color-espresso)' }}>
          Your specialty coffee journal.
        </h1>
        <p className="text-lg leading-relaxed" style={{ color: 'var(--color-stone)' }}>
          Log the roasteries you love, the beans you've tasted, and the recipes that nailed it.
          Stop guessing why Tuesday's cup was perfect.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link
            to="/app"
            className="px-6 py-3 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'var(--color-espresso)', color: 'var(--color-paper)' }}
          >
            Start logging for free
          </Link>
          <Link
            to="/help"
            className="px-6 py-3 rounded-xl text-sm font-medium"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-espresso)', backgroundColor: '#fff' }}
          >
            How it works
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t mx-6" style={{ borderColor: 'var(--color-border)' }} />

      {/* Features grid */}
      <section className="max-w-4xl mx-auto px-6 py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {FEATURES.map(f => (
          <div key={f.title} className="flex flex-col gap-2">
            <span className="text-2xl">{f.emoji}</span>
            <h3 className="font-serif text-lg font-medium" style={{ color: 'var(--color-espresso)' }}>{f.title}</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-stone)' }}>{f.description}</p>
          </div>
        ))}
      </section>

      {/* CTA band */}
      <section
        className="mx-6 mb-16 rounded-2xl px-8 py-12 flex flex-col items-center text-center gap-5"
        style={{ backgroundColor: 'var(--color-espresso)' }}
      >
        <h2 className="font-serif text-3xl font-medium" style={{ color: 'var(--color-paper)' }}>
          Ready to brew better?
        </h2>
        <p className="text-sm max-w-md leading-relaxed" style={{ color: 'color-mix(in srgb, var(--color-paper) 70%, transparent)' }}>
          Create a free account and start tracking your favourite coffees right away.
        </p>
        <Link
          to="/app"
          className="px-6 py-3 rounded-xl text-sm font-medium"
          style={{ backgroundColor: 'var(--color-paper)', color: 'var(--color-espresso)' }}
        >
          Open PourLog →
        </Link>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t px-6 py-5 flex items-center justify-between text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-stone)' }}>
        <div>
          <span className="font-serif" style={{ color: 'var(--color-espresso)' }}>PourLog</span>
          <p className="mt-0.5">© 2026 <a href="https://joennespreuwers.be" target="_blank" rel="noopener noreferrer" className="hover:underline">Joenne Spreuwers</a> · Made with (too much) caffeine ☕</p>
        </div>
        <nav className="flex gap-5">
          <Link to="/help" className="hover:underline">Help</Link>
          <Link to="/app" className="hover:underline">App</Link>
        </nav>
      </footer>
    </div>
  )
}
