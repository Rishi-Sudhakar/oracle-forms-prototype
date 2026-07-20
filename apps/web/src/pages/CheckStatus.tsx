import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrds } from '../hooks/useOrds'
import FormsWindow from '../components/FormsWindow'
import OrdsConfigBanner from '../components/OrdsConfigBanner'
import '../styles/forms.css'

export default function CheckStatus() {
  const { base, save, configured } = useOrds()
  const navigate = useNavigate()
  const [reqId, setReqId] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusText, setStatusText] = useState('Ready')
  const [result, setResult] = useState<{ html: string } | null>(null)

  async function check() {
    if (!reqId.trim() || isNaN(Number(reqId))) { alert('Enter a numeric Request ID'); return }
    if (!configured) return

    setLoading(true)
    setResult(null)
    setStatusText('Querying DB...')
    try {
      const res = await fetch(`${base}/status/${reqId}`, { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: { items?: Array<{ status?: string; accountnumber?: string; statusmessage?: string; requestid?: number }> } = await res.json()
      const items = data.items ?? []

      if (items.length === 0) {
        setResult({ html: `<span style="color:#aa0000">No application found for Request ID: ${reqId}</span>` })
        setStatusText(`Query complete: 0 rows returned`)
        return
      }

      const r = items[0]!
      const status = (r.status ?? '').toUpperCase()
      const acctNum = r.accountnumber ?? ''
      const statusMsg = r.statusmessage ?? ''

      let color = '#333', icon = 'PENDING'
      if (status === 'APPROVED') { color = '#006600'; icon = 'APPROVED' }
      if (status === 'REJECTED') { color = '#aa0000'; icon = 'REJECTED' }

      setResult({ html: `<span style="color:${color};font-weight:700">${icon}</span><br>${statusMsg}<br>${acctNum ? `<strong>Account Number: ${acctNum}</strong><br>` : ''}<span style="color:#888;font-family:Courier New,monospace;font-size:10px">Request ID: ${r.requestid ?? reqId} (live from formsproto)</span>` })
      setStatusText(`Query complete: ${items.length} row(s) returned`)
    } catch (e) {
      const err = e as Error
      setResult({ html: `<span style="color:#aa0000">CORS or network error: ${err.message}<br>Check ORDS URL and ensure the DB is reachable.</span>` })
      setStatusText('Error')
    }
    setLoading(false)
  }

  return (
    <div className="f-body">
      {!configured && <OrdsConfigBanner onSave={save} />}

      <FormsWindow
        title="Oracle Forms Runtime - G1_CHECKSTATUS1 [online_banking] [LIVE]"
        maxWidth="700px"
        liveBadge="LIVE | ORDS-BACKED | formsproto Autonomous DB 23ai | pkg_ob_checkstatus.check_request_status"
        statusText={statusText}
        statusItems={['BLOCK: G1_CHECKSTATUS1', 'Oracle Forms 14c | ORDS']}
      >
        <div className="f-title-block">
          <div className="f-title-text">CHECK APPLICATION STATUS</div>
          <span className="f-badge">LIVE | ORDS</span>
        </div>

        <div className="f-section">
          <div className="f-field-row">
            <div className="f-field-group">
              <span className="f-label">Request ID <span className="f-req">*</span></span>
              <input
                className="f-input"
                style={{ width: 80 }}
                placeholder="e.g. 10"
                value={reqId}
                onChange={e => setReqId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && check()}
              />
            </div>
            <button className="f-btn primary" onClick={check} disabled={loading || !configured}>CHECK</button>
            {loading && <span style={{ fontSize: 10, color: '#888', marginLeft: 8 }}>Querying DB...</span>}
          </div>
        </div>

        {result && (
          <div className="f-result-panel">
            <div className="f-section-title">RESULT: live from GROUP1_ACCOUNTREQUEST + GRP1_REGISTEREDINFO</div>
            <div dangerouslySetInnerHTML={{ __html: result.html }} style={{ fontSize: 11, lineHeight: 1.8 }} />
          </div>
        )}

        <div className="f-btn-row">
          <button className="f-btn" onClick={() => { setReqId(''); setResult(null); setStatusText('Ready') }}>CLEAR</button>
          <button className="f-btn" onClick={() => navigate('/')}>HOME</button>
        </div>

        <div style={{ marginTop: 12, fontSize: 10, color: '#888', borderTop: '1px solid #b0b0b0', paddingTop: 6 }}>
          GET /ob/status/:id | SELECT Status, Account_Number FROM GROUP1_ACCOUNTREQUEST LEFT JOIN GRP1_REGISTEREDINFO
        </div>
      </FormsWindow>
    </div>
  )
}
