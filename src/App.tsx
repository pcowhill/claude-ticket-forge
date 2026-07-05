import { AppProvider, useApp } from './state/AppStore'
import { Sidebar } from './components/Sidebar'
import { ForgeScreen } from './screens/ForgeScreen'
import { RepoContextScreen } from './screens/RepoContextScreen'
import { TemplatesScreen } from './screens/TemplatesScreen'
import { ExportScreen } from './screens/ExportScreen'

function Main() {
  const { screen } = useApp()
  return (
    <main className="main">
      {screen === 'forge' && <ForgeScreen />}
      {screen === 'repo-context' && <RepoContextScreen />}
      {screen === 'templates' && <TemplatesScreen />}
      {screen === 'export' && <ExportScreen />}
    </main>
  )
}

export default function App() {
  return (
    <AppProvider>
      <div className="app">
        <Sidebar />
        <Main />
      </div>
    </AppProvider>
  )
}
