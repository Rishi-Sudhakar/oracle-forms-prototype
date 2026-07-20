import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrds } from '../hooks/useOrds'
import FormsWindow from '../components/FormsWindow'
import OrdsConfigBanner from '../components/OrdsConfigBanner'
import '../styles/forms.css'

interface FormState {
  branch: string; account_type: string; title: string
  first_name: string; last_name: string; dob: string
  work_phone: string; home_phone: string
  address: string; state: string; zip: string; email: string
}

const EMPTY: FormState = {
  branch: '', account_type: '', title: '', first_name: '', last_name: '',
  dob: '', work_phone: '', home_phone: '', address: '', state: '', zip: '', email: '',
}

export default function AccountOpening() {
  const { base, save, configured } = useOrds()
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [status, setStatus] = useState('Enter record details (* required)')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; html: string } | null>(null)

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }))
  }

  async function submit() {
    if (!configured) return
    const required: Array<keyof FormState> = ['branch', 'account_type', 'title', 'first_name', 'last_name', 'dob', 'work_phone', 'address', 'state', 'zip', 'email']
    for (const k of required) {
      if (!form[k]) { setMsg({ ok: false, html: `Error: ${k.replace(/_/g, ' ').toUpperCase()} is required.` }); return }
    }
    if (!/^\d{10}$/.test(form.work_phone)) { setMsg({ ok: false, html: 'Error: WORK PHONE must be exactly 10 digits.' }); return }
    if (form.home_phone && !/^\d{10}$/.test(form.home_phone)) { setMsg({ ok: false, html: 'Error: HOME PHONE must be exactly 10 digits (or leave blank).' }); return }
    if (!form.email.includes('@') || !form.email.endsWith('.com')) { setMsg({ ok: false, html: 'Error: EMAIL must contain @ and end with .com' }); return }

    setLoading(true)
    setStatus('Submitting to formsproto...')
    const body: Record<string, string> = { ...form }
    if (!form.home_phone) delete body.home_phone

    try {
      const res = await fetch(`${base}/requests/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      })
      const data: { ok?: boolean; requestId?: number; requestid?: number; error?: string } = await res.json()
      if (data.ok) {
        const rid = data.requestId ?? data.requestid ?? 'N/A'
        setMsg({ ok: true, html: `<strong>APPLICATION SUBMITTED SUCCESSFULLY</strong><br>Request ID: <strong>${rid}</strong><br>Status: ENTERED (pending manager approval)<br><span style="font-family:Courier New;font-size:10px">INSERTed into GROUP1_ACCOUNTREQUEST (live formsproto)</span>` })
        setStatus(`Record saved. Request ID: ${rid}`)
      } else {
        setMsg({ ok: false, html: `Error from DB: ${data.error ?? 'Unknown error'}` })
        setStatus('Submission failed')
      }
    } catch (e) {
      const err = e as Error
      setMsg({ ok: false, html: `Network/CORS error: ${err.message}<br>Serve via <code>npm run preview</code>, or check ORDS URL.` })
      setStatus('Error')
    }
    setLoading(false)
  }

  return (
    <div className="f-body">
      {!configured && <OrdsConfigBanner onSave={save} />}

      <FormsWindow
        title="Oracle Forms Runtime - G1_ACCOUNTOPENING [online_banking] [LIVE]"
        maxWidth="800px"
        liveBadge="LIVE | ORDS-BACKED | formsproto Autonomous DB 23ai | pkg_ob_accountopening.submit_account_request"
        statusText={status}
        statusItems={['BLOCK: G1_ACCOUNTOPENING', 'Oracle Forms 14c | ORDS']}
      >
        <div className="f-title-block">
          <div className="f-title-text">ACCOUNT OPENING REQUEST FORM</div>
          <span className="f-badge">LIVE | INSERT | GROUP1_ACCOUNTREQUEST</span>
        </div>

        <div className="f-section">
          <div className="f-section-title">BRANCH &amp; ACCOUNT DETAILS</div>
          <div className="f-field-row">
            <div className="f-field-group">
              <span className="f-label">Branch <span className="f-req">*</span></span>
              <select className="f-select" style={{ width: 140 }} value={form.branch} onChange={set('branch')}>
                <option value="">(Select)</option>
                {['NORTH', 'SOUTH', 'EAST', 'WEST', 'CENTRAL'].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="f-field-group">
              <span className="f-label">Account Type <span className="f-req">*</span></span>
              <select className="f-select" style={{ width: 140 }} value={form.account_type} onChange={set('account_type')}>
                <option value="">(Select)</option>
                {['SAVINGS', 'CHECKING', 'CURRENT'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="f-section">
          <div className="f-section-title">PERSONAL INFORMATION</div>
          <div className="f-field-row">
            <div className="f-field-group">
              <span className="f-label">Title <span className="f-req">*</span></span>
              <select className="f-select" style={{ width: 80 }} value={form.title} onChange={set('title')}>
                <option value="">(Select)</option>
                {['Mr', 'Ms', 'Mrs', 'Dr'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="f-field-group">
              <span className="f-label">Date of Birth <span className="f-req">*</span></span>
              <input className="f-input" type="date" style={{ width: 140 }} value={form.dob} onChange={set('dob')} />
            </div>
            <div className="f-field-group">
              <span className="f-label">First Name <span className="f-req">*</span></span>
              <input className="f-input" style={{ width: 160 }} maxLength={50} value={form.first_name} onChange={set('first_name')} />
            </div>
            <div className="f-field-group">
              <span className="f-label">Last Name <span className="f-req">*</span></span>
              <input className="f-input" style={{ width: 160 }} maxLength={50} value={form.last_name} onChange={set('last_name')} />
            </div>
          </div>
        </div>

        <div className="f-section">
          <div className="f-section-title">CONTACT INFORMATION</div>
          <div className="f-field-row">
            <div className="f-field-group">
              <span className="f-label">Work Phone <span className="f-req">*</span></span>
              <input className="f-input" style={{ width: 120 }} maxLength={10} placeholder="10 digits" value={form.work_phone} onChange={set('work_phone')} />
            </div>
            <div className="f-field-group">
              <span className="f-label">Home Phone</span>
              <input className="f-input" style={{ width: 120 }} maxLength={10} placeholder="10 digits" value={form.home_phone} onChange={set('home_phone')} />
            </div>
            <div className="f-field-group">
              <span className="f-label">Email <span className="f-req">*</span></span>
              <input className="f-input" style={{ width: 260 }} maxLength={100} placeholder="user@example.com" value={form.email} onChange={set('email')} />
            </div>
          </div>
        </div>

        <div className="f-section">
          <div className="f-section-title">ADDRESS</div>
          <div className="f-field-row">
            <div className="f-field-group">
              <span className="f-label">Address <span className="f-req">*</span></span>
              <input className="f-input" style={{ width: 340 }} maxLength={200} value={form.address} onChange={set('address')} />
            </div>
          </div>
          <div className="f-field-row">
            <div className="f-field-group">
              <span className="f-label">State <span className="f-req">*</span></span>
              <input className="f-input" style={{ width: 120 }} maxLength={50} value={form.state} onChange={set('state')} />
            </div>
            <div className="f-field-group">
              <span className="f-label">ZIP <span className="f-req">*</span></span>
              <input className="f-input" style={{ width: 80 }} maxLength={10} value={form.zip} onChange={set('zip')} />
            </div>
          </div>
        </div>

        <div className="f-btn-row">
          <button className="f-btn primary" onClick={submit} disabled={loading}>SUBMIT APPLICATION</button>
          <button className="f-btn" onClick={() => { setForm(EMPTY); setMsg(null); setStatus('Form cleared. Enter record details.') }}>CLEAR</button>
          <button className="f-btn" onClick={() => navigate('/')}>HOME</button>
          {loading && <span style={{ fontSize: 10, color: '#888', marginLeft: 8 }}>Submitting to DB...</span>}
        </div>

        {msg && (
          <div style={{ border: `1px solid ${msg.ok ? '#006600' : '#a00'}`, background: msg.ok ? '#dfffdf' : '#ffeee', color: msg.ok ? '#004400' : '#800', padding: '6px 10px', marginTop: 8, fontSize: 11 }}
            dangerouslySetInnerHTML={{ __html: msg.html }} />
        )}

        <div style={{ marginTop: 10, fontSize: 10, color: '#888', borderTop: '1px solid #b0b0b0', paddingTop: 6 }}>
          POST /ob/requests/ | pkg_ob_accountopening.submit_account_request | INSERT GROUP1_ACCOUNTREQUEST
        </div>
      </FormsWindow>
    </div>
  )
}
