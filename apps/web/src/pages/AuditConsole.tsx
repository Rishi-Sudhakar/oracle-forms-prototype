import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = 'INFO' | 'PASS' | 'WARN' | 'BLOCK' | 'AGENT'
type EnfMode = 'Advisory' | 'Monitor' | 'Block'

interface LogEntry {
  id: number
  ts: string
  severity: Severity
  agent: string
  message: string
}

interface PolicyCheck {
  framework: string
  rule: string
  status: 'PASS' | 'WARN' | 'FAIL'
  lastChecked: string
}

interface TraceEntry {
  action: string
  why: string
  who: string
  when: string
  rule: string
  mode: 'Fully AI' | 'AI with Validation' | 'Human Leads'
}

// ─── Static data ──────────────────────────────────────────────────────────────

const POLICY_CHECKS: PolicyCheck[] = [
  { framework: 'SOX',   rule: 'Manager approval workflow integrity',         status: 'PASS', lastChecked: '14s ago' },
  { framework: 'GDPR',  rule: 'Article 5 - data minimisation on account records', status: 'PASS', lastChecked: '29s ago' },
  { framework: 'GDPR',  rule: 'Article 17 - retention policy enforcement',   status: 'WARN', lastChecked: '1m ago' },
  { framework: 'PCI',   rule: 'No plaintext credentials in PL/SQL packages',  status: 'PASS', lastChecked: '2m ago' },
  { framework: 'SOX',   rule: 'Segregation of duties: submit vs approve',     status: 'PASS', lastChecked: '2m ago' },
  { framework: 'HIPAA', rule: 'Audit trail completeness on all writes',       status: 'PASS', lastChecked: '3m ago' },
  { framework: 'ISO 27001', rule: 'Access control on ORDS endpoints',         status: 'WARN', lastChecked: '4m ago' },
]

const ENDPOINTS = [
  { path: 'POST /ob/requests/',        pkg: 'pkg_ob_accountopening',    status: 'UP',   latency: '38ms',  calls: 142 },
  { path: 'GET  /ob/requests/',        pkg: 'pkg_ob_managerapproval',   status: 'UP',   latency: '22ms',  calls: 87 },
  { path: 'PUT  /ob/requests/:id',     pkg: 'pkg_ob_managerapproval',   status: 'UP',   latency: '41ms',  calls: 63 },
  { path: 'GET  /ob/status/:id',       pkg: 'pkg_ob_checkstatus',       status: 'UP',   latency: '19ms',  calls: 208 },
]

const TRACE: TraceEntry[] = [
  { action: 'Generated account number for RequestId 1090',  why: 'Manager approved via approval queue',   who: 'pkg_ob_managerapproval.approve_request', when: '2m ago',  rule: 'SOX: Manager Approval Required', mode: 'AI with Validation' },
  { action: 'Inserted row GROUP1_ACCOUNTREQUEST',           why: 'Customer submitted new account form',   who: 'pkg_ob_accountopening.submit_account_request', when: '4m ago', rule: 'GDPR Art.5: Minimisation', mode: 'Fully AI' },
  { action: 'Flagged G1_MANAGERLOGINPAGE hardcoded creds',  why: 'Static analysis: credentials in trigger body', who: 'audit-agent/static-scan',         when: '6m ago', rule: 'PCI: No plaintext credentials', mode: 'Human Leads' },
  { action: 'Regression suite run on pkg_ob_checkstatus',   why: 'Scheduled post-deploy verification',    who: 'audit-agent/test-runner',              when: '11m ago', rule: 'SOX: Change Management', mode: 'AI with Validation' },
]

// ─── Log entry pool (cycles deterministically) ────────────────────────────────

const LOG_POOL: Omit<LogEntry, 'id' | 'ts'>[] = [
  { severity: 'AGENT', agent: 'schema-watcher',  message: 'Schema drift check: GROUP1_ACCOUNTREQUEST column set unchanged since last deploy' },
  { severity: 'PASS',  agent: 'policy-engine',   message: 'SOX: manager approval gate intact on all APPROVE calls to pkg_ob_managerapproval' },
  { severity: 'INFO',  agent: 'call-tracer',     message: 'POST /ob/requests/ invoked by session 0xA4F2 | pkg_ob_accountopening.submit_account_request | 1 row inserted' },
  { severity: 'AGENT', agent: 'static-scan',     message: 'Scanning pkg_ob_accountopening for SQL injection vectors: 0 findings' },
  { severity: 'WARN',  agent: 'policy-engine',   message: 'GDPR Art.17: no retention policy enforced on GROUP1_ACCOUNTREQUEST. Flagged for human review.' },
  { severity: 'PASS',  agent: 'test-runner',     message: 'Regression suite pkg_ob_checkstatus: 8/8 assertions passed against formsproto Autonomous DB' },
  { severity: 'INFO',  agent: 'call-tracer',     message: 'GET /ob/status/1087 invoked | check_request_status returned Status=APPROVED in 19ms' },
  { severity: 'AGENT', agent: 'sequence-guard',  message: 'Monitoring RequestId generation: sequence-based, no MAX+1 race condition detected' },
  { severity: 'PASS',  agent: 'policy-engine',   message: 'PCI: plaintext password scan across pkg_ob_* packages: 0 hits (G1_MANAGERLOGINPAGE excluded, already flagged)' },
  { severity: 'INFO',  agent: 'siem-relay',      message: 'Batch of 12 audit events forwarded to Splunk HEC endpoint | last ack 200 OK' },
  { severity: 'AGENT', agent: 'schema-watcher',  message: 'Index GRP1_REGISTEREDINFO.ACCOUNT_NUMBER verified present: no full-table scan risk on approval path' },
  { severity: 'WARN',  agent: 'policy-engine',   message: 'ISO 27001: ORDS endpoint /ob/requests/ lacks rate-limiting header. Advisory raised.' },
  { severity: 'PASS',  agent: 'test-runner',     message: 'Regression suite pkg_ob_managerapproval: approve + reject paths confirmed | account number format CU[name3][seq5] stable' },
  { severity: 'INFO',  agent: 'call-tracer',     message: 'PUT /ob/requests/1091 | reject_request called | Status set REJECTED | 41ms' },
  { severity: 'AGENT', agent: 'static-scan',     message: 'Checking pkg_ob_accountopening email validation: LIKE pattern flagged as insufficient. Recommendation logged.' },
  { severity: 'PASS',  agent: 'policy-engine',   message: 'SOX: segregation of duties check: no session has called both submit_account_request and approve_request in same auth context' },
  { severity: 'INFO',  agent: 'siem-relay',      message: 'Traceability matrix flushed: 4 new entries written | what/why/who/when/rule recorded for all AI actions' },
  { severity: 'AGENT', agent: 'schema-watcher',  message: 'Monitoring column GRP1_REGISTEREDINFO.password11: value set without hashing detected in G1_MANAGERLOGINPAGE flow. Flag persists.' },
]

function nowTs() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const SEV_STYLE: Record<Severity, { bg: string; color: string; label: string }> = {
  INFO:  { bg: '#1e3a5f', color: '#7ab8f5', label: 'INFO ' },
  PASS:  { bg: '#0a3326', color: '#34d399', label: 'PASS ' },
  WARN:  { bg: '#3d2a00', color: '#fbbf24', label: 'WARN ' },
  BLOCK: { bg: '#3d0a0a', color: '#f87171', label: 'BLOCK' },
  AGENT: { bg: '#1a1a2e', color: '#a78bfa', label: 'AGENT' },
}

function SevPill({ s }: { s: Severity }) {
  const st = SEV_STYLE[s]
  return (
    <span style={{ background: st.bg, color: st.color, fontWeight: 700, fontSize: 10, padding: '2px 6px', borderRadius: 3, letterSpacing: '0.5px', flexShrink: 0, fontFamily: 'monospace' }}>
      {st.label}
    </span>
  )
}

function PolicyRow({ p }: { p: PolicyCheck }) {
  const c = p.status === 'PASS' ? '#34d399' : p.status === 'WARN' ? '#fbbf24' : '#f87171'
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderBottom: '1px solid #1e2a38' }}>
      <span style={{ color: c, fontSize: 15, flexShrink: 0, marginTop: 1 }}>{p.status === 'PASS' ? '✓' : p.status === 'WARN' ? '!' : '✗'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: '#e0eaf5', lineHeight: 1.4 }}>{p.rule}</div>
        <div style={{ fontSize: 10, color: '#4a6a8a', marginTop: 2 }}>{p.framework} &middot; {p.lastChecked}</div>
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: c, flexShrink: 0 }}>{p.status}</span>
    </div>
  )
}

function ModeChip({ mode }: { mode: TraceEntry['mode'] }) {
  const col = mode === 'Fully AI' ? '#a78bfa' : mode === 'AI with Validation' ? '#60a5fa' : '#34d399'
  return <span style={{ fontSize: 10, fontWeight: 700, color: col, background: col + '22', padding: '2px 7px', borderRadius: 3, whiteSpace: 'nowrap' }}>{mode}</span>
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AuditConsole() {
  const navigate = useNavigate()
  const [enfMode, setEnfMode] = useState<EnfMode>('Monitor')
  const [log, setLog] = useState<LogEntry[]>(() => {
    const seed = LOG_POOL.slice(0, 6).map((e, i) => ({ ...e, id: i, ts: nowTs() }))
    return seed
  })
  const [, setPoolIdx] = useState(6)
  const [agentRunning, setAgentRunning] = useState(true)
  const [checkCount, setCheckCount] = useState(74)
  const [eventCount, setEventCount] = useState(3218)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!agentRunning) return
    const id = setInterval(() => {
      setPoolIdx(prev => {
        const idx = prev % LOG_POOL.length
        const entry: LogEntry = { ...LOG_POOL[idx], id: Date.now(), ts: nowTs() }
        setLog(l => [...l.slice(-80), entry])
        setCheckCount(c => c + (Math.random() > 0.6 ? 1 : 0))
        setEventCount(c => c + Math.floor(Math.random() * 3) + 1)
        return prev + 1
      })
    }, 2800)
    return () => clearInterval(id)
  }, [agentRunning])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

  const ENF_COLOR: Record<EnfMode, string> = { Advisory: '#fbbf24', Monitor: '#60a5fa', Block: '#f87171' }
  const passCount = POLICY_CHECKS.filter(p => p.status === 'PASS').length
  const warnCount = POLICY_CHECKS.filter(p => p.status === 'WARN').length

  return (
    <div style={{ minHeight: '100vh', background: '#0b1420', color: '#e0eaf5', fontFamily: "'Segoe UI', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{ background: '#0f1e30', borderBottom: '2px solid #000', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <div style={{ background: '#cc0000', color: 'white', fontWeight: 800, fontSize: 12, padding: '3px 7px', borderRadius: 3, fontFamily: 'Arial Black, sans-serif', letterSpacing: '-0.3px', flexShrink: 0 }}>
          ORACLE
        </div>
        <div style={{ width: 1, height: 28, background: '#1e3a5f' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: agentRunning ? '#34d399' : '#6b7a8d', display: 'inline-block', boxShadow: agentRunning ? '0 0 6px #34d399' : 'none', flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '0.5px' }}>AI GOVERNANCE AGENT</span>
          <span style={{ fontSize: 11, color: '#4a6a8a', fontFamily: 'monospace' }}>audit-agent/v1.0 | formsproto</span>
        </div>
        <div style={{ flex: 1 }} />

        {/* Enforcement mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#4a6a8a', fontWeight: 600 }}>ENFORCEMENT</span>
          {(['Advisory', 'Monitor', 'Block'] as EnfMode[]).map(m => (
            <button
              key={m}
              onClick={() => setEnfMode(m)}
              style={{
                background: enfMode === m ? ENF_COLOR[m] + '22' : 'transparent',
                border: `1px solid ${enfMode === m ? ENF_COLOR[m] : '#1e3a5f'}`,
                color: enfMode === m ? ENF_COLOR[m] : '#4a6a8a',
                borderRadius: 4, padding: '3px 10px', fontSize: 11,
                fontWeight: 700, cursor: 'pointer', fontFamily: "'Segoe UI', sans-serif",
                letterSpacing: '0.3px',
              }}
            >
              {m}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 28, background: '#1e3a5f' }} />

        {/* Agent toggle */}
        <button
          onClick={() => setAgentRunning(r => !r)}
          style={{ background: agentRunning ? '#0a3326' : '#1e3a5f', border: `1px solid ${agentRunning ? '#34d399' : '#4a6a8a'}`, color: agentRunning ? '#34d399' : '#9ab8cc', borderRadius: 4, padding: '4px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Segoe UI', sans-serif" }}
        >
          {agentRunning ? 'RUNNING' : 'PAUSED'}
        </button>
        <div style={{ width: 1, height: 28, background: '#1e3a5f' }} />
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0572CE', fontSize: 13, fontWeight: 600, fontFamily: "'Segoe UI', sans-serif" }}
        >
          Navigator
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a6a8a', fontSize: 13, fontWeight: 600, fontFamily: "'Segoe UI', sans-serif" }}
        >
          AI Analysis
        </button>
      </header>

      {/* Stat bar */}
      <div style={{ background: '#0d1928', borderBottom: '1px solid #1e2a38', padding: '10px 24px', display: 'flex', gap: 32, flexShrink: 0 }}>
        {[
          { label: 'POLICIES CHECKED', value: checkCount, color: '#60a5fa' },
          { label: 'EVENTS LOGGED', value: eventCount.toLocaleString(), color: '#a78bfa' },
          { label: 'PASSING', value: `${passCount}/${POLICY_CHECKS.length}`, color: '#34d399' },
          { label: 'WARNINGS', value: warnCount, color: '#fbbf24' },
          { label: 'ENDPOINTS UP', value: `${ENDPOINTS.length}/${ENDPOINTS.length}`, color: '#34d399' },
          { label: 'MODE', value: enfMode.toUpperCase(), color: ENF_COLOR[enfMode] },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, color: '#4a6a8a', fontWeight: 700, letterSpacing: '0.8px' }}>{s.label}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: 'monospace', lineHeight: 1 }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 360px', overflow: 'hidden' }}>

        {/* Left: agent log */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #1e2a38', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid #1e2a38', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#4a6a8a', letterSpacing: '0.8px' }}>LIVE AGENT LOG</span>
            {agentRunning && <span style={{ fontSize: 10, color: '#34d399', fontFamily: 'monospace' }}>streaming</span>}
          </div>
          <div
            ref={logRef}
            style={{ flex: 1, overflowY: 'auto', padding: '8px 0', fontFamily: 'monospace', fontSize: 12 }}
          >
            {log.map(entry => (
              <div
                key={entry.id}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '5px 16px', borderBottom: '1px solid #0d1928' }}
              >
                <span style={{ color: '#2d4a6a', flexShrink: 0, fontSize: 11, marginTop: 1 }}>{entry.ts}</span>
                <SevPill s={entry.severity} />
                <span style={{ color: '#4a8ab8', flexShrink: 0, minWidth: 100, fontSize: 11 }}>{entry.agent}</span>
                <span style={{ color: '#b8d0e8', lineHeight: 1.5, fontSize: 11 }}>{entry.message}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: panels */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Policy compliance */}
          <div style={{ flex: '0 0 auto', borderBottom: '1px solid #1e2a38' }}>
            <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid #1e2a38' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#4a6a8a', letterSpacing: '0.8px' }}>POLICY COMPLIANCE</span>
            </div>
            <div style={{ padding: '0 16px', maxHeight: 240, overflowY: 'auto' }}>
              {POLICY_CHECKS.map(p => <PolicyRow key={p.framework + p.rule} p={p} />)}
            </div>
          </div>

          {/* ORDS endpoints */}
          <div style={{ flex: '0 0 auto', borderBottom: '1px solid #1e2a38' }}>
            <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid #1e2a38' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#4a6a8a', letterSpacing: '0.8px' }}>MONITORED ENDPOINTS</span>
            </div>
            <div style={{ padding: '8px 0' }}>
              {ENDPOINTS.map(ep => (
                <div key={ep.path} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderBottom: '1px solid #0d1928' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', flexShrink: 0, boxShadow: '0 0 4px #34d399' }} />
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7ab8f5', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.path}</span>
                  <span style={{ fontSize: 10, color: '#4a6a8a', fontFamily: 'monospace' }}>{ep.latency}</span>
                  <span style={{ fontSize: 10, color: '#34d399', fontFamily: 'monospace', fontWeight: 700 }}>{ep.calls}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Traceability matrix */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid #1e2a38', flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#4a6a8a', letterSpacing: '0.8px' }}>TRACEABILITY MATRIX</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {TRACE.map((t, i) => (
                <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid #0d1928' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#e0eaf5', lineHeight: 1.4, flex: 1 }}>{t.action}</span>
                    <ModeChip mode={t.mode} />
                  </div>
                  <div style={{ fontSize: 10, color: '#4a6a8a', lineHeight: 1.6 }}>
                    <span style={{ color: '#2d6a4a' }}>WHY</span> {t.why}<br />
                    <span style={{ color: '#2d4a8a' }}>WHO</span> <span style={{ fontFamily: 'monospace', color: '#5a8ab8' }}>{t.who}</span><br />
                    <span style={{ color: '#6a4a2a' }}>RULE</span> {t.rule} &middot; <span style={{ color: '#2d4a6a' }}>{t.when}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#0d1928', borderTop: '1px solid #1e2a38', padding: '7px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: '#2d4a6a', flexShrink: 0 }}>
        <span style={{ fontFamily: 'monospace' }}>SIEM: Splunk HEC &middot; Microsoft Sentinel &middot; Datadog &middot; Elastic</span>
        <span>Policy frameworks: SOX &middot; GDPR &middot; PCI-DSS &middot; ISO 27001 &middot; HIPAA &middot; NIST AI RMF</span>
        <span style={{ fontFamily: 'monospace' }}>Galent Governance Platform &middot; formsproto &middot; 2026</span>
      </div>
    </div>
  )
}
