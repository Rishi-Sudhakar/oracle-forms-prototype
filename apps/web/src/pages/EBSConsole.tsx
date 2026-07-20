import { useNavigate } from 'react-router-dom'

interface AppEntry {
  name: string
  legacyTab: 'account' | 'approval' | 'status'
  modernPath?: string
}

const CUSTOMER_APPS: AppEntry[] = [
  { name: 'New Account Opening',        legacyTab: 'account', modernPath: '/live/account-opening' },
  { name: 'Check Application Status',   legacyTab: 'status',  modernPath: '/live/check-status' },
  { name: 'Customer Login',             legacyTab: 'account' },
  { name: 'Transaction Entry',          legacyTab: 'account' },
  { name: 'Transaction History',        legacyTab: 'account' },
  { name: 'Online Banking Enrollment',  legacyTab: 'account' },
  { name: 'Interest Calculator',        legacyTab: 'account' },
]

const MANAGER_APPS: AppEntry[] = [
  { name: 'Account Approval Queue',        legacyTab: 'approval', modernPath: '/live/manager-approval' },
  { name: 'Customer Application Detail',   legacyTab: 'approval' },
  { name: 'Manager Login',                 legacyTab: 'approval' },
]

function getBaseUrl() {
  return window.location.href.replace(/#.*/, '')
}

function launchFormsPopup(tab: string, name: string) {
  const url = `${getBaseUrl()}#/legacy?form=${tab}`
  const popup = window.open(
    url,
    `forms_${tab}_${name.replace(/\s/g, '_')}`,
    'width=860,height=720,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=yes',
  )
  if (!popup) alert('Popup blocked. Please allow popups for this site to launch Oracle Forms.')
}

function openModernTab(path: string) {
  window.open(`${getBaseUrl()}#${path}`, '_blank', 'noopener,noreferrer')
}

function AppList({ apps, title }: { apps: AppEntry[]; title: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        background: '#0572CE', color: 'white',
        padding: '10px 20px', fontWeight: 700, fontSize: 13,
        borderRadius: '6px 6px 0 0',
      }}>
        {title}
      </div>
      <div style={{ border: '1px solid #e0e5ea', borderTop: 'none', borderRadius: '0 0 6px 6px', overflow: 'hidden', background: 'white' }}>
        {apps.map((app, i) => (
          <div
            key={app.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '11px 20px',
              borderBottom: i < apps.length - 1 ? '1px solid #f0f2f5' : 'none',
              background: i % 2 === 1 ? '#fafbfc' : 'white',
            }}
          >
            <span style={{ fontSize: 14, color: '#1d2c3e', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
              {app.name}
            </span>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => launchFormsPopup(app.legacyTab, app.name)}
                style={{
                  background: 'white', color: '#3d4f63',
                  border: '1px solid #c0c8d5', borderRadius: 4,
                  padding: '5px 14px', fontSize: 13, cursor: 'pointer',
                  fontFamily: "'Segoe UI', system-ui, sans-serif",
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f0f2f5')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}
              >
                Open
              </button>
              {app.modernPath && (
                <button
                  onClick={() => openModernTab(app.modernPath!)}
                  style={{
                    background: '#0572CE', color: 'white',
                    border: '1px solid #0462b5', borderRadius: 4,
                    padding: '5px 14px', fontSize: 13, cursor: 'pointer',
                    fontFamily: "'Segoe UI', system-ui, sans-serif",
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#0462b5')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#0572CE')}
                >
                  {app.name} (Beta)
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function EBSConsole() {
  const navigate = useNavigate()

  return (
    <div
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", background: '#f0f2f5' }}
    >
      {/* Top header */}
      <header style={{ background: 'white', height: 56, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16, borderBottom: '1px solid #e0e5ea', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flexShrink: 0 }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#5a6a7d', padding: '4px 6px', borderRadius: 4 }}>
          &#9776;
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#cc0000', color: 'white', fontWeight: 800, fontSize: 13, padding: '3px 8px', borderRadius: 3, fontFamily: 'Arial Black, Arial, sans-serif', letterSpacing: '-0.3px' }}>
            ORACLE
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1d2c3e', lineHeight: 1.2 }}>E-Business Suite</div>
            <div style={{ fontSize: 11, color: '#6b7a8d' }}>Online Banking</div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => navigate('/pipeline')}
          style={{ background: '#0572CE', color: 'white', border: '1px solid #0462b5', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontFamily: "'Segoe UI', system-ui, sans-serif", fontWeight: 700, padding: '5px 12px', letterSpacing: '0.5px' }}
        >
          AI PIPELINE
        </button>
        <button
          onClick={() => navigate('/audit')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0572CE', fontSize: 13, fontFamily: "'Segoe UI', system-ui, sans-serif", fontWeight: 600 }}
        >
          Audit
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a6a8a', fontSize: 13, fontFamily: "'Segoe UI', system-ui, sans-serif", fontWeight: 600 }}
        >
          AI Analysis
        </button>
        <div style={{ width: 1, height: 28, background: '#e0e5ea' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0572CE', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
            M
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1d2c3e', lineHeight: 1.2 }}>Manager</div>
            <div style={{ fontSize: 11, color: '#6b7a8d' }}>Online Banking Mgr</div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <aside style={{ width: 220, background: '#1d2c3e', color: 'white', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid #2d3e55' }}>
            <div style={{ fontSize: 10, color: '#7a9ab8', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>Application</div>
            <div style={{ fontSize: 13, color: '#e0eaf5', fontWeight: 600, marginTop: 4 }}>Online Banking Manager</div>
          </div>
          <nav style={{ flex: 1, overflowY: 'auto', paddingTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', background: '#243d56', borderLeft: '3px solid #0572CE', cursor: 'pointer' }}>
              <span style={{ fontSize: 13, color: 'white', fontWeight: 600 }}>Navigator</span>
            </div>
            {['Account Operations', 'Manager Workspace', 'Reports', 'Administration'].map(item => (
              <div
                key={item}
                style={{ padding: '9px 19px', cursor: 'pointer', fontSize: 13, color: '#b8ccd8', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#243d56')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {item}
              </div>
            ))}
          </nav>
          <div style={{ borderTop: '1px solid #2d3e55', padding: '10px 0 4px' }}>
            <div style={{ fontSize: 10, color: '#7a9ab8', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600, padding: '0 16px 6px' }}>Responsibilities</div>
            <div style={{ padding: '7px 16px', background: '#243d56', borderLeft: '3px solid #0572CE', cursor: 'pointer', fontSize: 13, color: 'white', fontWeight: 600 }}>
              Online Banking Manager
            </div>
            {['System Administrator', 'General Ledger', 'AP Manager'].map(r => (
              <div
                key={r}
                style={{ padding: '7px 19px', cursor: 'pointer', fontSize: 12, color: '#8aabcc', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#243d56')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {r}
              </div>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: 'auto', background: '#f0f2f5' }}>
          <div style={{ background: 'white', borderBottom: '1px solid #e0e5ea', padding: '16px 28px' }}>
            <div style={{ fontSize: 12, color: '#6b7a8d', marginBottom: 4 }}>
              Home &rsaquo; Navigator &rsaquo; Online Banking Manager
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1d2c3e' }}>Navigator: Online Banking Manager</div>
          </div>

          <div style={{ padding: 28 }}>
            <AppList apps={CUSTOMER_APPS} title="Customer Applications" />
            <AppList apps={MANAGER_APPS} title="Manager Applications" />
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer style={{ background: '#1d2c3e', color: '#8aabcc', padding: '8px 24px', fontSize: 11, display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
        <span>Oracle E-Business Suite | formsproto environment</span>
        <span>Modernization prototype | Galent | 2026</span>
      </footer>
    </div>
  )
}
