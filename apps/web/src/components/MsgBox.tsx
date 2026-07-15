import '../styles/forms.css'

interface Props {
  title: string
  body: string
  onClose: () => void
}

export default function MsgBox({ title, body, onClose }: Props) {
  return (
    <div className="f-overlay" onClick={onClose}>
      <div className="f-msgbox" onClick={e => e.stopPropagation()}>
        <div className="f-msgbox-title">
          <span>{title}</span>
          <span style={{ cursor: 'pointer' }} onClick={onClose}>✕</span>
        </div>
        <div className="f-msgbox-body" dangerouslySetInnerHTML={{ __html: body }} />
        <div className="f-msgbox-btns">
          <button className="f-btn" onClick={onClose} style={{ minWidth: 60 }}>OK</button>
        </div>
      </div>
    </div>
  )
}
