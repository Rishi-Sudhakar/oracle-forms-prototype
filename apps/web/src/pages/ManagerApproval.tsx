import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrds } from '../hooks/useOrds'
import FormsWindow from '../components/FormsWindow'
import OrdsConfigBanner from '../components/OrdsConfigBanner'
import MsgBox from '../components/MsgBox'
import '../styles/forms.css'

interface PendingRow {
  requestid: number
  branch: string
  accounttype: string
  firstname: string
  lastname: string
  dob: string
  workphone: string
  email: string
  address: string
  state: string
  zip: string
}

type RowState = 'pending' | 'approved' | 'rejected' | 'loading'

export default function ManagerApproval() {
  const { base, save, configured } = useOrds()
  const navigate = useNavigate()
  const [rows, setRows] = useState<PendingRow[]>([])
  const [rowState, setRowState] = useState<Record<number, RowState>>({})
  const [statusText, setStatusText] = useState("Ready: click REFRESH to query live DB")
  const [liveCount, setLiveCount] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ title: string; body: string } | null>(null)

  const loadPending = useCallback(async () => {
    if (!configured) return
    setLoading(true)
    setStatusText('Querying GROUP1_ACCOUNTREQUEST...')
    try {
      const res = await fetch(`${base}/pending/`, { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: { items?: PendingRow[] } = await res.json()
      const items = data.items ?? []
      setRows(items)
      setRowState({})
      setLiveCount(`${items.length} PENDING`)
      setStatusText(items.length === 0 ? 'No pending requests. All requests processed.' : `${items.length} pending request(s), live from formsproto`)
    } catch (e) {
      const err = e as Error
      setStatusText(`Error: ${err.message}`)
    }
    setLoading(false)
  }, [base, configured])

  async function act(rid: number, action: 'approve' | 'reject') {
    if (!configured) return
    setRowState(p => ({ ...p, [rid]: 'loading' }))
    setStatusText(`${action === 'approve' ? 'Approving' : 'Rejecting'} Request ID ${rid}...`)
    try {
      const res = await fetch(`${base}/${action}/${rid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: '{}',
      })
      const data: { ok?: boolean; error?: string } = await res.json()
      if (data.ok) {
        setRowState(p => ({ ...p, [rid]: action === 'approve' ? 'approved' : 'rejected' }))
        setStatusText(`${action === 'approve' ? 'Approved' : 'Rejected'} Request ID ${rid}: live DB updated`)
        if (action === 'approve') {
          setMsg({ title: 'APPROVAL COMPLETE', body: `Request <strong>${rid}</strong> has been approved.<br>Account number generated via:<br><code style="font-size:10px">AccountType(2) || FirstName(3) || lpad(seq,5,'0')</code><br>New record INSERTed into GRP1_REGISTEREDINFO with password11='0000'.<br><em>Use Check Status page to verify the account number.</em>` })
        } else {
          setMsg({ title: 'REJECTION COMPLETE', body: `Request <strong>${rid}</strong> status set to REJECTED in GROUP1_ACCOUNTREQUEST.` })
        }
      } else {
        setRowState(p => ({ ...p, [rid]: 'pending' }))
        setMsg({ title: 'DB ERROR', body: `Error from pkg_ob_managerapproval: ${data.error ?? 'Unknown'}` })
        setStatusText('Error: see message')
      }
    } catch (e) {
      const err = e as Error
      setRowState(p => ({ ...p, [rid]: 'pending' }))
      setMsg({ title: 'NETWORK ERROR', body: err.message })
      setStatusText('Network error')
    }
  }

  const COLS: Array<[keyof PendingRow, string]> = [
    ['requestid', 'Req ID'], ['branch', 'Branch'], ['accounttype', 'Acct Type'],
    ['firstname', 'First Name'], ['lastname', 'Last Name'],
    ['dob', 'DOB'], ['workphone', 'Work Ph'], ['email', 'Email'],
    ['address', 'Address'], ['state', 'State'], ['zip', 'ZIP'],
  ]

  return (
    <div className="f-body">
      {!configured && <OrdsConfigBanner onSave={save} />}

      <FormsWindow
        title="Oracle Forms Runtime - G1_MANAGERAPPROVAL [online_banking] [LIVE]"
        maxWidth="960px"
        liveBadge="LIVE | ORDS-BACKED | formsproto Autonomous DB 23ai | pkg_ob_managerapproval.approve_request / reject_request"
        liveCount={liveCount}
        statusText={statusText}
        statusItems={['BLOCK: G1_MANAGERAPPROVAL_BLOCK', 'Oracle Forms 14c | ORDS']}
      >
        <div className="f-title-block">
          <div className="f-title-text">MANAGER APPROVAL: PENDING ACCOUNT REQUESTS</div>
          <span className="f-badge">LIVE | GROUP1_ACCOUNTREQUEST WHERE Status='ENTERED'</span>
        </div>

        <div className="f-btn-row" style={{ marginBottom: 8 }}>
          <button className="f-btn primary" onClick={loadPending} disabled={loading || !configured}>REFRESH / QUERY</button>
          <button className="f-btn" onClick={() => navigate('/')}>HOME</button>
          {loading && <span style={{ fontSize: 10, color: '#888', marginLeft: 8 }}>Loading from DB...</span>}
        </div>

        <div className="f-grid">
          {rows.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#888', background: 'white', fontSize: 11 }}>
              {configured ? "Click REFRESH / QUERY to load pending requests from formsproto" : "Configure ORDS URL above first"}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  {COLS.map(([, label]) => <th key={label}>{label}</th>)}
                  <th style={{ minWidth: 160 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const state = rowState[row.requestid] ?? 'pending'
                  const rowCls = state === 'approved' ? 'approved' : state === 'rejected' ? 'rejected' : ''
                  return (
                    <tr key={row.requestid} className={rowCls}>
                      {COLS.map(([key]) => <td key={key}>{String(row[key] ?? '')}</td>)}
                      <td>
                        <button
                          className="f-btn approve"
                          style={{ fontSize: 10, minWidth: 'auto', padding: '0 6px', height: 17 }}
                          disabled={state !== 'pending'}
                          onClick={() => act(row.requestid, 'approve')}
                        >
                          {state === 'approved' ? 'APPROVED' : 'APPROVE'}
                        </button>
                        {' '}
                        <button
                          className="f-btn reject"
                          style={{ fontSize: 10, minWidth: 'auto', padding: '0 6px', height: 17 }}
                          disabled={state !== 'pending'}
                          onClick={() => act(row.requestid, 'reject')}
                        >
                          {state === 'rejected' ? 'REJECTED' : 'REJECT'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ marginTop: 10, fontSize: 10, color: '#888', borderTop: '1px solid #b0b0b0', paddingTop: 6 }}>
          GET /ob/pending/ | SELECT ... FROM GROUP1_ACCOUNTREQUEST WHERE Status='ENTERED'<br />
          POST /ob/approve/:id | pkg_ob_managerapproval.approve_request | UPDATE Status='APPROVED', INSERT GRP1_REGISTEREDINFO<br />
          POST /ob/reject/:id | pkg_ob_managerapproval.reject_request | UPDATE Status='REJECTED'
        </div>
      </FormsWindow>

      {msg && <MsgBox title={msg.title} body={msg.body} onClose={() => setMsg(null)} />}
    </div>
  )
}
