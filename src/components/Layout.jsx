import { Settings, ChevronLeft } from 'lucide-react'

const TABS = ['Roasteries', 'Beans', 'Recipes']

const isSettings = tab => tab === 'Equipment'

const SYNC_DOT = {
  local:    { color: 'var(--color-stone)',   title: 'Local only' },
  syncing:  { color: '#f59e0b',              title: 'Syncing…' },
  synced:   { color: '#22c55e',              title: 'Synced' },
  error:    { color: '#ef4444',              title: 'Sync error' },
}

export default function Layout({ activeTab, onTabChange, onBack, user, syncStatus = 'local', onAuthOpen, onAccountOpen, onSignOut, children }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-paper)' }}>
      <header
        className="sticky top-0 z-10 border-b"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-paper) 95%, transparent)',
          borderColor: 'var(--color-border)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="max-w-5xl mx-auto px-6 flex items-center h-14 gap-2">
          {/* Back arrow — mobile only, shown in Equipment */}
          {isSettings(activeTab) && (
            <button
              onClick={onBack}
              className="sm:hidden flex items-center gap-1 text-sm font-medium py-1.5 pr-2 rounded-md cursor-pointer shrink-0"
              style={{ color: 'var(--color-stone)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-cream)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              aria-label="Back"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          )}
          {/* Wordmark */}
          <span
            className="font-serif text-lg font-medium tracking-tight select-none"
            style={{ color: 'var(--color-espresso)' }}
          >
            Pourlog
          </span>

          {/* Nav tabs — centred, hidden on mobile */}
          <nav className="hidden sm:flex gap-0.5 mx-auto">
            {TABS.map(tab => {
              const active = activeTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => onTabChange(tab)}
                  className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer"
                  style={{
                    color: active ? 'var(--color-roast)' : 'var(--color-stone)',
                    backgroundColor: active ? 'var(--color-cream)' : 'transparent',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.color = 'var(--color-espresso)'
                      e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-cream) 50%, transparent)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.color = 'var(--color-stone)'
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  {tab}
                </button>
              )
            })}
          </nav>

          {/* Spacer on mobile so gear icon stays right */}
          <div className="flex-1 sm:hidden" />

          {/* Sync dot */}
          {(() => {
            const dot = SYNC_DOT[syncStatus] ?? SYNC_DOT.local
            return (
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                title={dot.title}
                style={{ backgroundColor: dot.color, transition: 'background-color 0.4s' }}
              />
            )
          })()}

          {/* Auth button */}
          {user ? (
            <button
              onClick={onAccountOpen}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer max-w-36 truncate"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-stone)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-cream)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              title={user.email}
            >
              <span className="truncate">
                {user.user_metadata?.display_name || user.email}
              </span>
            </button>
          ) : (
            <button
              onClick={onAuthOpen}
              className="px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-stone)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-cream)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Sign in
            </button>
          )}

          {/* Equipment / gear icon */}
          <button
            onClick={() => onTabChange('Equipment')}
            className="w-8 h-8 flex items-center justify-center rounded-md text-base cursor-pointer transition-colors"
            title="Equipment"
            style={{
              color: activeTab === 'Equipment' ? 'var(--color-roast)' : 'var(--color-stone)',
              backgroundColor: activeTab === 'Equipment' ? 'var(--color-cream)' : 'transparent',
            }}
            onMouseEnter={e => {
              if (activeTab !== 'Equipment') e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-cream) 50%, transparent)'
            }}
            onMouseLeave={e => {
              if (activeTab !== 'Equipment') e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 pb-24 sm:pb-10">
        {children}
      </main>

      {/* Mobile bottom tab bar — hidden on Equipment/settings */}
      <nav
        className={`${isSettings(activeTab) ? 'hidden' : 'sm:hidden'} fixed bottom-0 left-0 right-0 z-10 flex border-t`}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-paper) 97%, transparent)',
          borderColor: 'var(--color-border)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {TABS.map(tab => {
          const active = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className="flex-1 py-3 text-xs font-medium cursor-pointer"
              style={{
                color: active ? 'var(--color-roast)' : 'var(--color-stone)',
                borderTop: active ? '2px solid var(--color-roast)' : '2px solid transparent',
              }}
            >
              {tab}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
