import { Link } from 'react-router-dom'

function Section({ title, children }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-serif text-xl font-medium" style={{ color: 'var(--color-espresso)' }}>{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}

function Q({ q, children }) {
  return (
    <div className="rounded-xl p-5 flex flex-col gap-2" style={{ backgroundColor: '#fff', border: '1px solid var(--color-border)' }}>
      <p className="text-sm font-medium" style={{ color: 'var(--color-espresso)' }}>{q}</p>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-stone)' }}>{children}</p>
    </div>
  )
}

function Step({ n, title, children }) {
  return (
    <div className="flex gap-4">
      <span
        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium mt-0.5"
        style={{ backgroundColor: 'var(--color-espresso)', color: 'var(--color-paper)' }}
      >
        {n}
      </span>
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium" style={{ color: 'var(--color-espresso)' }}>{title}</p>
        {children && <p className="text-sm leading-relaxed" style={{ color: 'var(--color-stone)' }}>{children}</p>}
      </div>
    </div>
  )
}

export default function HelpPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-paper)' }}>
      {/* Nav */}
      <header className="px-6 py-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: '#fff' }}>
        <Link to="/" className="font-serif text-lg font-medium" style={{ color: 'var(--color-espresso)' }}>Pourlog</Link>
        <nav className="flex items-center gap-4">
          <Link to="/welcome" className="text-sm" style={{ color: 'var(--color-stone)' }}>About</Link>
          <Link
            to="/"
            className="px-4 py-1.5 rounded-md text-sm font-medium"
            style={{ backgroundColor: 'var(--color-espresso)', color: 'var(--color-paper)' }}
          >
            Open app
          </Link>
        </nav>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-12 flex flex-col gap-12 w-full">
        <div>
          <h1 className="font-serif text-4xl font-medium mb-2" style={{ color: 'var(--color-espresso)' }}>Help</h1>
          <p className="text-sm" style={{ color: 'var(--color-stone)' }}>Everything you need to know about Pourlog.</p>
        </div>

        {/* Getting started */}
        <Section title="Getting started">
          <Step n={1} title="No account needed">
            Open the app and start adding roasteries, beans and recipes right away. Everything is saved locally in your browser.
          </Step>
          <Step n={2} title="Sign up to sync">
            Create an account and your data syncs to the cloud automatically. Access it from any device.
          </Step>
          <Step n={3} title="Start with roasteries">
            Add the roasteries you buy from first — then link beans to them, and recipes to beans.
          </Step>
        </Section>

        {/* Tabs */}
        <Section title="The three tabs">
          <Q q="Roasteries">
            Log every roastery you've tried. Add country, city, website, rating, notes and a photo. Roasteries are the top of the chain — beans belong to them.
          </Q>
          <Q q="Beans">
            Track individual bags. Origin, farm, variety, process, roast level, altitude, harvest & roast dates, price and SCA flavour notes. Link each bag to its roastery.
          </Q>
          <Q q="Recipes">
            Every brew you want to remember. Brewer, filter, grinder, dose, yield, water temp, grind setting, brew time and step-by-step instructions. Link a recipe to the bean it uses.
          </Q>
        </Section>

        {/* Equipment */}
        <Section title="Equipment">
          <Q q="What is the Equipment tab?">
            A list of your gear — brewers, grinders, filter papers and accessories. Equipment syncs to the cloud just like roasteries, beans and recipes, so it’s available on all your devices. When adding a recipe you can pick from your equipment to fill in the brewer and filter fields.
          </Q>
          <Q q="How do I transfer my equipment to a new device?">
            Just sign in — your equipment will sync automatically. You can also Export and Import your full data as JSON from the Equipment tab.
          </Q>
        </Section>

        {/* Flavour notes */}
        <Section title="Flavour notes">
          <Q q="Where do the flavour tags come from?">
            The tasting notes are based on the SCA Coffee Flavour Wheel (2016). Browse by category in the dropdown, or type to search any note.
          </Q>
          <Q q="Can I add custom notes?">
            Not currently — only SCA wheel descriptors are supported to keep things consistent.
          </Q>
        </Section>

        {/* Sharing */}
        <Section title="Sharing">
          <Q q="How do I share a recipe or bean?">
            Open the detail view for any recipe, bean or roastery and tap the share icon. You get a public link and a QR code. Anyone with the link can view it — no account needed.
          </Q>
          <Q q="Can someone import what I shared?">
            Yes. On any shared page there’s an “Add to my Pourlog” or “Copy this technique” button that adds the item to the visitor’s own log as a <strong>Cloned</strong> item.
          </Q>
        </Section>

        {/* Cloned items */}
        <Section title="Cloned items">
          <Q q="What is a Cloned item?">
            When you import a roastery or bean from someone else’s share link, it appears in your log with a <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium align-middle" style={{ backgroundColor: '#e0e7ff', color: '#3730a3' }}>Cloned</span> badge. It syncs to your account so you see it on all your devices, but it’s read-only — the original belongs to someone else.
          </Q>
          <Q q="Can I edit a Cloned item?">
            Not directly. Open the detail view and tap <strong>Clone</strong> to create your own editable copy with a new ID. The original Cloned entry stays as a reference.
          </Q>
          <Q q="Can I delete a Cloned item?">
            Yes — you can remove it from your library at any time. It only affects your own log; the original in the other person’s account is untouched.
          </Q>
        </Section>

        {/* Favourites */}
        <Section title="Favourites & profile">
          <Q q="How do favourites work?">
            Tap the heart icon on any card to mark it as a favourite. Favourites appear on your public profile page grouped and filterable by type.
          </Q>
          <Q q="How do I find my profile URL?">
            Open the account panel (click your name in the top-right). You can set a custom handle — your profile will then be at pourlog.net/u/yourhandle.
          </Q>
        </Section>

        {/* Sync */}
        <Section title="Sync & offline">
          <Q q="What does the coloured dot in the header mean?">
            Green – synced with cloud. Blue – currently syncing. Orange – sync is disabled. Grey – local only (not signed in). Red – sync error.
          </Q>
          <Q q="Does it work offline?">
            Yes. Pourlog is a Progressive Web App. All your local data is available offline instantly. Changes sync to the cloud when you're back online.
          </Q>
          <Q q="Can I install it as an app?">
            Yes — use "Add to Home Screen" in your browser. On desktop, look for the install icon in the address bar.
          </Q>
        </Section>

        <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <Link to="/" className="text-sm" style={{ color: 'var(--color-roast)' }}>← Open Pourlog</Link>
        </div>
      </div>

      <footer className="mt-auto border-t px-6 py-5 flex items-center justify-between text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-stone)' }}>
        <div>
          <span className="font-serif" style={{ color: 'var(--color-espresso)' }}>Pourlog</span>
          <p className="mt-0.5">© 2026 <a href="https://joennespreuwers.be" target="_blank" rel="noopener noreferrer" className="hover:underline">Joenne Spreuwers</a> · Made with (too much) caffeine ☕</p>
        </div>
        <nav className="flex gap-5">
          <Link to="/welcome" className="hover:underline">About</Link>
          <Link to="/" className="hover:underline">App</Link>
        </nav>
      </footer>
    </div>
  )
}
