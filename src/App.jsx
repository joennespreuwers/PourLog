import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useSearchParams, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Roasteries from './pages/Roasteries'
import Beans from './pages/Beans'
import Recipes from './pages/Recipes'
import Equipment from './pages/Equipment'
import AuthModal from './components/AuthModal'
import AccountDrawer from './components/AccountDrawer'
import ShareRecipe from './pages/ShareRecipe'
import ShareBean from './pages/ShareBean'
import ShareRoastery from './pages/ShareRoastery'
import ProfilePage from './pages/ProfilePage'
import WelcomePage from './pages/WelcomePage'
import HelpPage from './pages/HelpPage'
import LoginPage from './pages/LoginPage'
import { useAuth } from './hooks/useAuth'
import { useSupabaseData } from './hooks/useSupabaseData'
import { supabase } from './lib/supabase'

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

  // ── All data (roasteries, beans, recipes, equipment) ─────────────────────
  const {
    roasteries, addRoastery, updateRoastery, deleteRoastery,
    beans,      addBean,      updateBean,      deleteBean,
    recipes,    addRecipe,    updateRecipe,    deleteRecipe,
    equipment,  addEquipment, updateEquipment, deleteEquipment,
    syncStatus, pullAll,
  } = useSupabaseData(user)

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
    const stripImported = arr => arr?.map(({ imported: _i, ...rest }) => rest) ?? []
    const ups = []
    if (data.roasteries?.length) ups.push(supabase.from('roasteries').upsert(stripImported(data.roasteries), { onConflict: 'id' }))
    if (data.beans?.length)      ups.push(supabase.from('beans').upsert(stripImported(data.beans), { onConflict: 'id' }))
    if (data.recipes?.length)    ups.push(supabase.from('recipes').upsert(stripImported(data.recipes), { onConflict: 'id' }))
    // Filter out legacy 'default-' prefixed IDs from old exports (they're not valid UUIDs)
    const userEq = (data.equipment ?? []).filter(e => !e.id?.startsWith('default-'))
    if (userEq.length)           ups.push(supabase.from('equipment').upsert(userEq, { onConflict: 'id' }))
    await Promise.all(ups)
    await pullAll()
  }

  if (authLoading) return null // wait for auth state before rendering

  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/welcome" element={<Navigate to="/" replace />} />
      <Route path="/login"   element={<LoginPage />} />
      <Route path="/help"    element={<HelpPage />} />
      <Route path="/share/recipe/:id" element={<ShareRecipe />} />
      <Route path="/share/bean/:id"   element={<ShareBean />} />
      <Route path="/share/roastery/:id" element={<ShareRoastery />} />
      <Route path="/u/:handle" element={<ProfilePage />} />
      <Route path="/app" element={<MainApp

        user={user} authLoading={authLoading}
        authOpen={authOpen} setAuthOpen={setAuthOpen}
        accountOpen={accountOpen} setAccountOpen={setAccountOpen}
        activeTab={activeTab} handleTabChange={handleTabChange}
        prevTab={prevTab}
        roasteries={roasteries} addRoastery={addRoastery} updateRoastery={updateRoastery} deleteRoastery={deleteRoastery}
        beans={beans} addBean={addBean} updateBean={updateBean} deleteBean={deleteBean}
        recipes={recipes} addRecipe={addRecipe} updateRecipe={updateRecipe} deleteRecipe={deleteRecipe}
        equipment={equipment} addEquipment={addEquipment} updateEquipment={updateEquipment} deleteEquipment={deleteEquipment}
        syncStatus={syncStatus}
        signIn={signIn} signUp={signUp} signOut={signOut}
        updateProfile={updateProfile} updatePassword={updatePassword}
        handleExport={handleExport} handleImport={handleImport}
      />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}

function MainApp({
  user, authOpen, setAuthOpen, accountOpen, setAccountOpen,
  activeTab, handleTabChange, prevTab,
  roasteries, addRoastery, updateRoastery, deleteRoastery,
  beans, addBean, updateBean, deleteBean,
  recipes, addRecipe, updateRecipe, deleteRecipe,
  equipment, addEquipment, updateEquipment, deleteEquipment,
  syncStatus, signIn, signUp, signOut, updateProfile, updatePassword,
  handleExport, handleImport,
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const [copyRecipe, setCopyRecipe] = useState(null)

  useEffect(() => {
    document.title = activeTab === 'Roasteries' ? 'Roasteries | PourLog'
      : activeTab === 'Beans'      ? 'Beans | PourLog'
      : activeTab === 'Recipes'    ? 'Recipes | PourLog'
      : activeTab === 'Equipment'  ? 'Equipment | PourLog'
      : 'PourLog'
  }, [activeTab])

  useEffect(() => {
    const copyId    = searchParams.get('copy_recipe')
    const followR   = searchParams.get('follow_recipe')
    const importR   = searchParams.get('import_roastery')
    const importB   = searchParams.get('import_bean')
    if (!copyId && !followR && !importR && !importB) return
    setSearchParams({}, { replace: true })

    import('./lib/supabase').then(({ supabase }) => {
      if (copyId) {
        handleTabChange('Recipes')
        supabase.from('recipes').select('*').eq('id', copyId).single().then(({ data }) => {
          if (data) setCopyRecipe(data)
        })
      }
      if (followR) {
        handleTabChange('Recipes')
        supabase.from('recipes').select('*').eq('id', followR).single().then(({ data }) => {
          if (data) addRecipe({ ...data, is_favorite: false, imported: true })
        })
      }
      if (importR) {
        handleTabChange('Roasteries')
        supabase.from('roasteries').select('*').eq('id', importR).single().then(({ data }) => {
          if (data) addRoastery({ ...data, is_favorite: false, imported: true })
        })
      }
      if (importB) {
        handleTabChange('Beans')
        supabase.from('beans').select('*').eq('id', importB).single().then(({ data }) => {
          if (data) addBean({ ...data, is_favorite: false, imported: true })
        })
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auth gate — must be signed in to use the main app ────────────────────
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />

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
          <Recipes recipes={recipes} beans={beans} roasteries={roasteries} equipment={equipment} onAdd={addRecipe} onUpdate={updateRecipe} onDelete={deleteRecipe} copyRecipe={copyRecipe} onCopyConsumed={() => setCopyRecipe(null)} />
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
