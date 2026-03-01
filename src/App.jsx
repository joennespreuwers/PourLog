import { useState } from 'react'
import Layout from './components/Layout'
import Roasteries from './pages/Roasteries'
import Beans from './pages/Beans'
import Recipes from './pages/Recipes'
import Equipment from './pages/Equipment'
import AuthModal from './components/AuthModal'
import AccountDrawer from './components/AccountDrawer'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useAuth } from './hooks/useAuth'
import { useSupabaseData } from './hooks/useSupabaseData'
import { supabase } from './lib/supabase'

const DEFAULT_EQUIPMENT = [
  // Brewers
  { id: 'default-v60',        name: 'Hario V60',        category: 'brewer',       brand: 'Hario',     notes: '', created_at: '' },
  { id: 'default-aeropress',  name: 'Aeropress',        category: 'brewer',       brand: 'Aeropress', notes: '', created_at: '' },
  { id: 'default-chemex',     name: 'Chemex',           category: 'brewer',       brand: 'Chemex',    notes: '', created_at: '' },
  { id: 'default-moka',       name: 'Moka Pot',         category: 'brewer',       brand: 'Bialetti',  notes: '', created_at: '' },
  { id: 'default-frenchpress',name: 'French Press',     category: 'brewer',       brand: '',          notes: '', created_at: '' },
  { id: 'default-espresso',   name: 'Espresso Machine', category: 'brewer',       brand: '',          notes: '', created_at: '' },
  { id: 'default-kalita',     name: 'Kalita Wave',      category: 'brewer',       brand: 'Kalita',    notes: '', created_at: '' },
  { id: 'default-clever',     name: 'Clever Dripper',   category: 'brewer',       brand: 'Clever',    notes: '', created_at: '' },
  // Filter papers
  { id: 'default-v60paper',   name: 'Hario V60 Paper',  category: 'filter_paper', brand: 'Hario',     notes: '', created_at: '' },
  { id: 'default-aropaper',   name: 'Aeropress Paper',  category: 'filter_paper', brand: 'Aeropress', notes: '', created_at: '' },
  { id: 'default-chemexpaper',name: 'Chemex Filter',    category: 'filter_paper', brand: 'Chemex',    notes: '', created_at: '' },
]

export default function App() {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const { user, loading: authLoading, signIn, signUp, signOut, updateProfile, updatePassword } = useAuth()
  const [authOpen, setAuthOpen]       = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  // ── Navigation ─────────────────────────────────────────────────────────────
  const TABS = ['Roasteries', 'Beans', 'Recipes', 'Equipment']
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('pourlog_tab')
    return TABS.includes(saved) ? saved : 'Roasteries'
  })
  const [prevTab, setPrevTab] = useState('Roasteries')

  function handleTabChange(tab) {
    localStorage.setItem('pourlog_tab', tab)
    if (tab !== activeTab) setPrevTab(activeTab)
    setActiveTab(tab)
  }

  // ── Cloud data (roasteries, beans, recipes) ───────────────────────────────
  const {
    roasteries, addRoastery, updateRoastery, deleteRoastery,
    beans,      addBean,      updateBean,      deleteBean,
    recipes,    addRecipe,    updateRecipe,    deleteRecipe,
    syncStatus,
  } = useSupabaseData(user)

  // ── Equipment (localStorage-only) ─────────────────────────────────────────
  const [equipment, setEquipment] = useLocalStorage('pourlog_equipment', DEFAULT_EQUIPMENT)
  const addEquipment    = data     => setEquipment(prev => [...prev, { ...data, id: crypto.randomUUID(), created_at: new Date().toISOString() }])
  const updateEquipment = (id, d)  => setEquipment(prev => prev.map(e => e.id === id ? { ...e, ...d } : e))
  const deleteEquipment = id       => setEquipment(prev => prev.filter(e => e.id !== id))

  // ── Export / Import ────────────────────────────────────────────────────────
  function handleExport() {
    const payload = { version: 1, exported_at: new Date().toISOString(), roasteries, beans, recipes, equipment }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `pourlog-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(data) {
    // Import into Supabase if authenticated, otherwise localStorage only
    if (user) {
      const ups = []
      if (data.roasteries?.length) ups.push(supabase.from('roasteries').upsert(data.roasteries))
      if (data.beans?.length)      ups.push(supabase.from('beans').upsert(data.beans))
      if (data.recipes?.length)    ups.push(supabase.from('recipes').upsert(data.recipes))
      await Promise.all(ups)
    }
    // Always update local state immediately
    if (data.roasteries) { /* handled by Supabase pull — trigger a re-fetch if authed */ }
    if (data.equipment)  setEquipment(data.equipment)
    // For local-only mode, write directly to localStorage state
    if (!user) {
      if (data.roasteries) window.localStorage.setItem('pourlog_roasteries', JSON.stringify(data.roasteries))
      if (data.beans)      window.localStorage.setItem('pourlog_beans',      JSON.stringify(data.beans))
      if (data.recipes)    window.localStorage.setItem('pourlog_recipes',    JSON.stringify(data.recipes))
      window.location.reload()
    }
  }

  if (authLoading) return null // wait for auth state before rendering

  return (
    <>
      <Layout
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onBack={() => handleTabChange(prevTab)}
        user={user}
        syncStatus={syncStatus}
        onAuthOpen={() => setAuthOpen(true)}
        onAccountOpen={() => setAccountOpen(true)}
        onSignOut={signOut}
      >
        {activeTab === 'Roasteries' && (
          <Roasteries roasteries={roasteries} onAdd={addRoastery} onUpdate={updateRoastery} onDelete={deleteRoastery} />
        )}
        {activeTab === 'Beans' && (
          <Beans beans={beans} roasteries={roasteries} onAdd={addBean} onUpdate={updateBean} onDelete={deleteBean} />
        )}
        {activeTab === 'Recipes' && (
          <Recipes recipes={recipes} beans={beans} equipment={equipment} onAdd={addRecipe} onUpdate={updateRecipe} onDelete={deleteRecipe} />
        )}
        {activeTab === 'Equipment' && (
          <Equipment
            equipment={equipment}
            onAdd={addEquipment} onUpdate={updateEquipment} onDelete={deleteEquipment}
            onExport={handleExport}
            onImport={handleImport}
          />
        )}
      </Layout>

      {authOpen && (
        <AuthModal
          onSignIn={signIn}
          onSignUp={signUp}
          onClose={() => setAuthOpen(false)}
        />
      )}

      {user && (
        <AccountDrawer
          open={accountOpen}
          onClose={() => setAccountOpen(false)}
          user={user}
          onUpdateProfile={updateProfile}
          onUpdatePassword={updatePassword}
          onSignOut={signOut}
        />
      )}
    </>
  )
}
