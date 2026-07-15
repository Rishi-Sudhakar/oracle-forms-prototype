import { useState } from 'react'
import '../styles/forms.css'

interface Props {
  onSave: (url: string) => void
}

export default function OrdsConfigBanner({ onSave }: Props) {
  const [input, setInput] = useState('')

  return (
    <div className="f-config-banner" style={{ marginBottom: 8 }}>
      <strong>ORDS URL not configured.</strong>
      {' '}Enter your DB ORDS base URL:{' '}
      <input
        type="text"
        className="f-input"
        style={{ width: 380, marginLeft: 6, marginRight: 6 }}
        placeholder="https://YOUR_DB.adb.REGION.oraclecloudapps.com/ords/admin/ob"
        value={input}
        onChange={e => setInput(e.target.value)}
      />
      <button className="f-btn primary" onClick={() => input.trim() && onSave(input)}>Save</button>
      <div style={{ marginTop: 4, fontSize: 10, color: '#555' }}>
        OCI Console → Autonomous DB → Tool Configuration → ORDS URL. Append <code>/admin/ob</code>
      </div>
    </div>
  )
}
