import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import FormsWindow from '../components/FormsWindow'
import MsgBox from '../components/MsgBox'
import '../styles/forms.css'

type Status = 'ENTERED' | 'APPROVED' | 'REJECTED'

interface Request {
  status: Status
  firstName: string
  lastName: string
  acctType: string
  acctNum?: string
}

const INITIAL_DB: Record<number, Request> = {
  10: { status: 'ENTERED', firstName: 'Arun', lastName: 'Kumar', acctType: 'SAVINGS' },
  20: { status: 'ENTERED', firstName: 'Priya', lastName: 'Sharma', acctType: 'CURRENT' },
  30: { status: 'APPROVED', firstName: 'Rajesh', lastName: 'Patel', acctType: 'SAVINGS', acctNum: 'SAraj00001' },
  40: { status: 'REJECTED', firstName: 'Sneha', lastName: 'Nair', acctType: 'CURRENT' },
  50: { status: 'ENTERED', firstName: 'Vikram', lastName: 'Singh', acctType: 'SAVINGS' },
}

const TABS = [
  { id: 'account', label: 'G1_ACCOUNTOPENING' },
  { id: 'approval', label: 'G1_MANAGERAPPROVAL' },
  { id: 'status', label: 'G1_CHECKSTATUS1' },
]

const FORM_TITLES: Record<string, string> = {
  account: 'G1_ACCOUNTOPENING',
  approval: 'G1_MANAGERAPPROVAL',
  status: 'G1_CHECKSTATUS1',
}

function FormsLoadingOverlay({ formId, onDone }: { formId: string; onDone: () => void }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); setTimeout(onDone, 200); return 100 }
        return p + 8
      })
    }, 80)
    return () => clearInterval(interval)
  }, [onDone])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#d4d0c8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999, fontFamily: 'Tahoma, Arial, sans-serif' }}>
      {/* Title bar */}
      <div style={{ width: 420, border: '2px solid', borderColor: '#dfdfdf #808080 #808080 #dfdfdf', boxShadow: '2px 2px 0 #000' }}>
        <div style={{ background: 'linear-gradient(to right, #000082, #1084d0)', color: 'white', padding: '3px 6px', fontSize: 11, fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
          <span>Oracle Forms Server</span>
          <span style={{ cursor: 'default' }}>✕</span>
        </div>
        <div style={{ background: '#d4d0c8', padding: '24px 28px' }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontFamily: 'Arial Black, Arial', fontSize: 16, fontWeight: 900, color: '#000080', marginBottom: 4 }}>Oracle Application Framework</div>
            <div style={{ fontSize: 11, color: '#555' }}>Loading form: <strong>{formId}</strong></div>
          </div>
          <div style={{ border: '1px solid', borderColor: '#808080 #dfdfdf #dfdfdf #808080', background: 'white', height: 18, marginBottom: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(to right, #000082, #1084d0)', width: `${progress}%`, transition: 'width 0.1s linear' }} />
          </div>
          <div style={{ fontSize: 10, color: '#888', fontFamily: 'Courier New, monospace', textAlign: 'center' }}>
            {progress < 30 && 'Connecting to Forms Server...'}
            {progress >= 30 && progress < 60 && 'Loading form definition...'}
            {progress >= 60 && progress < 90 && `Initializing ${formId}...`}
            {progress >= 90 && 'Opening form...'}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12, fontSize: 10, color: '#777', fontFamily: 'Courier New, monospace' }}>
        Oracle Forms Runtime -- formsproto [online_banking]
      </div>
    </div>
  )
}

export default function LegacyReplica() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const formParam = searchParams.get('form') ?? 'account'
  const initialTab = formParam === 'approval' ? 'approval' : formParam === 'status' ? 'status' : 'account'

  const isPopup = typeof window !== 'undefined' && window.opener !== null
  const [launching, setLaunching] = useState(isPopup)

  const [activeTab, setActiveTab] = useState(initialTab)
  const [db, setDb] = useState<Record<number, Request>>(INITIAL_DB)
  const [nextReqId, setNextReqId] = useState(60)
  const [msg, setMsg] = useState<{ title: string; body: string } | null>(null)
  const [statusText, setStatusText] = useState('Record: 1/5 | Normal')

  // Account Opening state
  const [acctForm, setAcctForm] = useState({ branch: '', acctType: '', title: '', fname: '', lname: '', dob: '', wphone: '', hphone: '', address: '', state: '', zip: '', email: '' })

  // Check Status state
  const [checkId, setCheckId] = useState('')
  const [checkResult, setCheckResult] = useState<{ html: string } | null>(null)

  function showMsg(body: string) { setMsg({ title: 'Message', body }) }

  function handleTabChange(id: string) {
    setActiveTab(id)
    const blockName = id === 'account' ? 'G1_ACCOUNTOPENING' : id === 'approval' ? 'G1_MANAGERAPPROVAL' : 'G1_CHECKSTATUS1'
    setStatusText(`Record: 1 | Normal -- ${blockName}`)
  }

  function submitAccountOpening() {
    const f = acctForm
    if (!f.branch) { showMsg('BRANCH IS REQUIRED'); return }
    if (!f.acctType) { showMsg('ACCOUNT TYPE IS REQUIRED'); return }
    if (!f.title) { showMsg('TITLE IS REQUIRED'); return }
    if (!f.fname) { showMsg('FIRST NAME IS REQUIRED'); return }
    if (!f.lname) { showMsg('LAST NAME IS REQUIRED'); return }
    if (!f.dob) { showMsg('DATE OF BIRTH IS REQUIRED'); return }
    if (f.wphone.length !== 10 || isNaN(Number(f.wphone))) { showMsg('ENTER VALID NUMBER (Work Phone must be 10 digits)'); return }
    if (f.hphone.length !== 10 || isNaN(Number(f.hphone))) { showMsg('ENTER VALID NUMBER (Home Phone must be 10 digits)'); return }
    if (!f.address) { showMsg('ADDRESS IS REQUIRED'); return }
    if (!f.state) { showMsg('STATE IS REQUIRED'); return }
    if (!f.zip) { showMsg('ZIP IS REQUIRED'); return }
    if (!f.email.includes('@') || !f.email.endsWith('.com')) { showMsg('Please enter a valid email address!'); return }

    const id = nextReqId
    setDb(prev => ({ ...prev, [id]: { status: 'ENTERED', firstName: f.fname, lastName: f.lname, acctType: f.acctType } }))
    setNextReqId(id + 10)
    showMsg(`Application submitted successfully.\nRequest ID: ${id}\nStatus: ENTERED -- awaiting manager approval.\n\n[Calls: pkg_ob_accountopening.submit_account_request]`)
  }

  function approveRow(reqId: number) {
    const req = db[reqId]
    if (!req) return
    const approvedCount = Object.values(db).filter(r => r.acctNum).length + 1
    const seq = String(approvedCount).padStart(5, '0')
    const acctNum = req.acctType.substring(0, 2).toUpperCase() + req.firstName.substring(0, 3) + seq
    setDb(prev => ({ ...prev, [reqId]: { ...prev[reqId]!, status: 'APPROVED', acctNum } }))
    showMsg(`Request ${reqId} APPROVED.\nAccount Number generated: ${acctNum}\n\nINSERT into GRP1_REGISTEREDINFO with password11='0000'\n[Calls: pkg_ob_managerapproval.approve_request]`)
  }

  function rejectRow(reqId: number) {
    setDb(prev => ({ ...prev, [reqId]: { ...prev[reqId]!, status: 'REJECTED' } }))
    showMsg(`Request ${reqId} REJECTED.\nUPDATE GROUP1_ACCOUNTREQUEST SET Status='REJECTED'\n[Calls: pkg_ob_managerapproval.reject_request]`)
  }

  function checkStatus() {
    const rid = parseInt(checkId)
    const req = db[rid]
    if (!req) {
      setCheckResult({ html: `<span style="color:#aa0000">No application found for Request ID: ${checkId || '--'}</span>` })
      return
    }
    if (req.status === 'APPROVED') {
      setCheckResult({ html: `<span style="color:#006600;font-weight:700">APPLICATION APPROVED</span><br>Account Number: <strong>${req.acctNum}</strong><br><br>[pkg_ob_checkstatus.check_request_status -- Status=APPROVED]` })
    } else if (req.status === 'ENTERED') {
      setCheckResult({ html: `<span style="color:#333">APPLICATION PENDING</span><br>Your application is currently under review by the manager.<br><br>[pkg_ob_checkstatus.check_request_status -- Status=ENTERED]` })
    } else {
      setCheckResult({ html: `<span style="color:#aa0000;font-weight:700">APPLICATION REJECTED</span><br>Your application has not been approved. Please visit a branch for assistance.<br><br>[pkg_ob_checkstatus.check_request_status -- Status=REJECTED]` })
    }
  }

  const windowTitle = `Oracle Forms Runtime - ${FORM_TITLES[activeTab] ?? 'G1_ACCOUNTOPENING'} [online_banking]`

  if (launching) {
    return <FormsLoadingOverlay formId={FORM_TITLES[initialTab] ?? 'G1_ACCOUNTOPENING'} onDone={() => setLaunching(false)} />
  }

  return (
    <div className="f-body">
      <div className="f-demo-label" style={{ width: '100%', maxWidth: 780 }}>
        DELIVERABLE 1: Legacy-Faithful Replica -- Oracle Forms UI rebuilt in HTML/CSS -- Calls extracted PL/SQL packages
      </div>

      <FormsWindow
        title={windowTitle}
        maxWidth="780px"
        showToolbar
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        statusText={statusText}
        statusItems={[`BLOCK: ${activeTab === 'account' ? 'G1_ACCOUNTOPENING' : activeTab === 'approval' ? 'G1_MANAGERAPPROVAL' : 'G1_CHECKSTATUS1'}`, 'ORACLE FORMS 10g']}
      >

        {/* ACCOUNT OPENING */}
        {activeTab === 'account' && (
          <div>
            <div className="f-title-block">
              <div className="f-title-text">NEW ACCOUNT OPENING REQUEST</div>
              <div style={{ marginLeft: 'auto', color: '#888', fontSize: 10 }}>Block: G1_ACCOUNTOPENING -- Table: GROUP1_ACCOUNTREQUEST</div>
            </div>

            <div className="f-section">
              <div className="f-section-title">APPLICATION DETAILS</div>
              <div className="f-field-row">
                <div className="f-field-group">
                  <span className="f-label">Request ID</span>
                  <input className="f-input" readOnly value={nextReqId} style={{ width: 60 }} />
                </div>
                <div className="f-field-group">
                  <span className="f-label">Branch <span className="f-req">*</span></span>
                  <select className="f-select" style={{ width: 110 }} value={acctForm.branch} onChange={e => setAcctForm(p => ({ ...p, branch: e.target.value }))}>
                    <option value="">-- select --</option>
                    {['NORTH', 'SOUTH', 'EAST', 'WEST'].map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="f-field-group">
                  <span className="f-label">Account Type <span className="f-req">*</span></span>
                  <select className="f-select" style={{ width: 110 }} value={acctForm.acctType} onChange={e => setAcctForm(p => ({ ...p, acctType: e.target.value }))}>
                    <option value="">-- select --</option>
                    {['SAVINGS', 'CURRENT'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="f-section">
              <div className="f-section-title">PERSONAL INFORMATION</div>
              <div className="f-field-row">
                <div className="f-field-group">
                  <span className="f-label">Title <span className="f-req">*</span></span>
                  <select className="f-select" style={{ width: 60 }} value={acctForm.title} onChange={e => setAcctForm(p => ({ ...p, title: e.target.value }))}>
                    <option value="">--</option>
                    {['MR', 'MRS', 'MISS', 'DR'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="f-field-group">
                  <span className="f-label">First Name <span className="f-req">*</span></span>
                  <input className="f-input" style={{ width: 120 }} maxLength={15} value={acctForm.fname} onChange={e => setAcctForm(p => ({ ...p, fname: e.target.value }))} />
                </div>
                <div className="f-field-group">
                  <span className="f-label">Last Name <span className="f-req">*</span></span>
                  <input className="f-input" style={{ width: 120 }} maxLength={15} value={acctForm.lname} onChange={e => setAcctForm(p => ({ ...p, lname: e.target.value }))} />
                </div>
              </div>
              <div className="f-field-row" style={{ marginTop: 4 }}>
                <div className="f-field-group">
                  <span className="f-label">Date of Birth <span className="f-req">*</span></span>
                  <input className="f-input" style={{ width: 90 }} placeholder="DD-MON-YY" maxLength={9} value={acctForm.dob} onChange={e => setAcctForm(p => ({ ...p, dob: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="f-section">
              <div className="f-section-title">CONTACT INFORMATION</div>
              <div className="f-field-row">
                <div className="f-field-group">
                  <span className="f-label">Work Phone <span className="f-req">*</span></span>
                  <input className="f-input" style={{ width: 100 }} maxLength={10} value={acctForm.wphone} onChange={e => setAcctForm(p => ({ ...p, wphone: e.target.value }))} />
                </div>
                <div className="f-field-group">
                  <span className="f-label">Home Phone <span className="f-req">*</span></span>
                  <input className="f-input" style={{ width: 100 }} maxLength={10} value={acctForm.hphone} onChange={e => setAcctForm(p => ({ ...p, hphone: e.target.value }))} />
                </div>
              </div>
              <div className="f-field-row" style={{ marginTop: 4 }}>
                <div className="f-field-group">
                  <span className="f-label">Address <span className="f-req">*</span></span>
                  <input className="f-input" style={{ width: 220 }} maxLength={30} value={acctForm.address} onChange={e => setAcctForm(p => ({ ...p, address: e.target.value }))} />
                </div>
              </div>
              <div className="f-field-row" style={{ marginTop: 4 }}>
                <div className="f-field-group">
                  <span className="f-label">State <span className="f-req">*</span></span>
                  <input className="f-input" style={{ width: 100 }} maxLength={15} value={acctForm.state} onChange={e => setAcctForm(p => ({ ...p, state: e.target.value }))} />
                </div>
                <div className="f-field-group">
                  <span className="f-label">Zip <span className="f-req">*</span></span>
                  <input className="f-input" style={{ width: 70 }} maxLength={10} value={acctForm.zip} onChange={e => setAcctForm(p => ({ ...p, zip: e.target.value }))} />
                </div>
              </div>
              <div className="f-field-row" style={{ marginTop: 4 }}>
                <div className="f-field-group">
                  <span className="f-label">Email <span className="f-req">*</span></span>
                  <input className="f-input" style={{ width: 200 }} maxLength={30} value={acctForm.email} onChange={e => setAcctForm(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="f-btn-row">
              <button className="f-btn primary" onClick={submitAccountOpening}>SUBMIT</button>
              <button className="f-btn" onClick={() => setAcctForm({ branch: '', acctType: '', title: '', fname: '', lname: '', dob: '', wphone: '', hphone: '', address: '', state: '', zip: '', email: '' })}>CLEAR</button>
              <button className="f-btn" onClick={() => navigate('/')}>HOME</button>
            </div>
          </div>
        )}

        {/* MANAGER APPROVAL */}
        {activeTab === 'approval' && (
          <div>
            <div className="f-title-block">
              <div className="f-title-text">ACCOUNT APPROVAL -- PENDING REQUESTS</div>
              <div style={{ marginLeft: 'auto', color: '#888', fontSize: 10 }}>Block: G1_ACCOUNTREQUEST_B2 -- WHERE Status='ENTERED'</div>
            </div>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 6 }}>Showing ENTERED requests -- pkg_ob_managerapproval.approve_request / reject_request</div>

            <div className="f-grid">
              <table>
                <thead>
                  <tr>
                    {['REQ ID', 'FIRST NAME', 'LAST NAME', 'ACCT TYPE', 'STATUS', 'ACTIONS'].map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(db).map(([idStr, req]) => {
                    const id = parseInt(idStr)
                    const rowClass = req.status === 'APPROVED' ? 'approved' : req.status === 'REJECTED' ? 'rejected' : ''
                    return (
                      <tr key={id} className={rowClass}>
                        <td>{id}</td>
                        <td>{req.firstName}</td>
                        <td>{req.lastName}</td>
                        <td>{req.acctType}</td>
                        <td>{req.status}{req.acctNum ? ` -- ${req.acctNum}` : ''}</td>
                        <td>
                          <button className="f-btn approve" style={{ fontSize: 10, minWidth: 'auto', padding: '0 6px', height: 17 }}
                            disabled={req.status !== 'ENTERED'} onClick={() => approveRow(id)}>APPROVE</button>
                          {' '}
                          <button className="f-btn reject" style={{ fontSize: 10, minWidth: 'auto', padding: '0 6px', height: 17 }}
                            disabled={req.status !== 'ENTERED'} onClick={() => rejectRow(id)}>REJECT</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="f-section" style={{ background: '#fffdf0', borderColor: '#c8c490 #fff8a0 #fff8a0 #c8c490' }}>
              <div className="f-section-title" style={{ color: '#555', fontSize: 10 }}>ALGORITHM: Account# = AccountType(2) || FirstName(3) || lpad(seq,5,'0')</div>
              <div style={{ fontFamily: 'Courier New,monospace', fontSize: 10, color: '#333', marginTop: 4 }}>
                Example: AccountType=SAVINGS, FirstName=Arun -- <strong>SAaru00001</strong>
              </div>
            </div>

            <div className="f-btn-row">
              <button className="f-btn" onClick={() => navigate('/')}>HOME</button>
            </div>
          </div>
        )}

        {/* CHECK STATUS */}
        {activeTab === 'status' && (
          <div>
            <div className="f-title-block">
              <div className="f-title-text">CHECK APPLICATION STATUS</div>
              <div style={{ marginLeft: 'auto', color: '#888', fontSize: 10 }}>Block: G1_CHECKSTATUS1 -- pkg_ob_checkstatus.check_request_status</div>
            </div>

            <div className="f-section">
              <div className="f-field-row">
                <div className="f-field-group">
                  <span className="f-label">Request ID <span className="f-req">*</span></span>
                  <input className="f-input" style={{ width: 80 }} placeholder="e.g. 10" value={checkId}
                    onChange={e => setCheckId(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && checkStatus()} />
                </div>
                <button className="f-btn primary" onClick={checkStatus}>CHECK</button>
              </div>
            </div>

            {checkResult && (
              <div className="f-result-panel">
                <div className="f-section-title">RESULT</div>
                <div dangerouslySetInnerHTML={{ __html: checkResult.html }} style={{ fontSize: 11, lineHeight: 1.8 }} />
              </div>
            )}

            <div style={{ marginTop: 16, fontSize: 10, color: '#888', borderTop: '1px solid #b0b0b0', paddingTop: 8 }}>
              DEMO DATA: Request IDs 10, 20, 50 = ENTERED -- 30 = APPROVED (SAraj00001) -- 40 = REJECTED
            </div>

            <div className="f-btn-row">
              <button className="f-btn" onClick={() => { setCheckId(''); setCheckResult(null) }}>CLEAR</button>
              <button className="f-btn" onClick={() => navigate('/')}>HOME</button>
            </div>
          </div>
        )}
      </FormsWindow>

      {msg && <MsgBox title="Message" body={msg.body.replace(/\n/g, '<br>')} onClose={() => setMsg(null)} />}
    </div>
  )
}
