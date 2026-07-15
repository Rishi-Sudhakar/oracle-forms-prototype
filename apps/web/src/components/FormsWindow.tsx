import '../styles/forms.css'

interface Tab {
  id: string
  label: string
}

interface Props {
  title: string
  maxWidth?: string
  liveBadge?: string
  liveCount?: string
  showToolbar?: boolean
  tabs?: Tab[]
  activeTab?: string
  onTabChange?: (id: string) => void
  statusText: string
  statusItems: string[]
  children: React.ReactNode
}

export default function FormsWindow({
  title,
  maxWidth = '800px',
  liveBadge,
  liveCount,
  showToolbar = false,
  tabs,
  activeTab,
  onTabChange,
  statusText,
  statusItems,
  children,
}: Props) {
  return (
    <div style={{ width: '100%', maxWidth }}>
      {liveBadge && (
        <div className="f-live-badge">
          <span>{liveBadge}</span>
          {liveCount && <span>{liveCount}</span>}
        </div>
      )}

      <div className="f-window">
        <div className="f-title-bar">
          <div className="f-title-left">
            <div className="f-title-icon">F</div>
            <span>{title}</span>
          </div>
          <div className="f-title-btns">
            <div className="f-title-btn">_</div>
            <div className="f-title-btn">□</div>
            <div className="f-title-btn">✕</div>
          </div>
        </div>

        <div className="f-menu-bar">
          {['File', 'Edit', 'Block', 'Field', 'Record', 'Query', 'Window', 'Help'].map(item => (
            <span key={item} className="f-menu-item">{item}</span>
          ))}
        </div>

        {showToolbar && (
          <div className="f-toolbar">
            <div className="f-tb-btn" title="Save">💾</div>
            <div className="f-tb-btn" title="Print">🖨</div>
            <div className="f-tb-sep" />
            <div className="f-tb-btn" title="Previous">◀</div>
            <div className="f-tb-btn" title="Next">▶</div>
            <div className="f-tb-sep" />
            <div className="f-tb-btn" title="Insert">+</div>
            <div className="f-tb-btn" title="Delete">−</div>
            <div className="f-tb-sep" />
            <div className="f-tb-btn" title="Execute Query">▶▶</div>
            <div className="f-tb-btn" title="Clear">✕</div>
          </div>
        )}

        {tabs && tabs.length > 0 && (
          <div className="f-tabs">
            {tabs.map(tab => (
              <div
                key={tab.id}
                className={`f-tab${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => onTabChange?.(tab.id)}
              >
                {tab.label}
              </div>
            ))}
          </div>
        )}

        <div className="f-canvas">{children}</div>

        <div className="f-status-bar">
          <span>{statusText}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {statusItems.map((item, i) => (
              <span key={i} className="f-status-item">{item}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
