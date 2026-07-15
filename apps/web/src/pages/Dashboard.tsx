import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrds } from '../hooks/useOrds'
import { MODULES } from '../data/modules'
import type { Complexity, PkgStatus } from '../data/modules'

const COMPLEXITY_COLORS: Record<Complexity, string> = {
  Trivial: 'bg-[#e8e8e8] text-black',
  Low: 'bg-[#cce4ff] text-[#003db8]',
  Medium: 'bg-[#ffd6e0] text-[#aa0028]',
  High: 'bg-[#F5E642] text-black',
}

function PkgLabel({ status, pkg }: { status: PkgStatus; pkg?: string }) {
  if (status === 'extracted')
    return <span className="font-mono text-[10px] font-bold text-[#1a6eff]">{pkg}</span>
  if (status === 'flagged')
    return <span className="font-mono text-[10px] font-bold text-[#FF1F5A]">not generated -- see security findings</span>
  return <span className="font-mono text-[10px] text-[#aaa]">no package -- no extractable logic</span>
}

export default function Dashboard() {
  const [openModule, setOpenModule] = useState<number | null>(null)
  const { base, save } = useOrds()
  const [ordsInput, setOrdsInput] = useState(base)
  const [savedMsg, setSavedMsg] = useState(base ? 'URL already configured' : '')
  const navigate = useNavigate()

  function handleSaveOrds() {
    if (!ordsInput.trim()) return
    save(ordsInput)
    setSavedMsg('Saved. Live pages will use this URL.')
  }

  function toggleModule(i: number) {
    setOpenModule(prev => (prev === i ? null : i))
  }

  return (
    <div className="font-[Arial,Helvetica,sans-serif] bg-white text-black leading-snug">

      {/* HEADER */}
      <header className="bg-black text-[#F5E642] px-10 py-10 border-b-4 border-[#F5E642]">
        <div className="font-mono text-[11px] tracking-[3px] text-[#777] mb-3.5">
          AI-ASSISTED LEGACY MODERNIZATION -- GALENT -- 2026-07-08
        </div>
        <div
          className="font-black text-[clamp(36px,6vw,60px)] leading-none"
          style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}
        >
          ORACLE FORMS <span className="text-[#FF1F5A]">--&gt;</span> APEX
        </div>
        <div className="font-mono text-[12px] tracking-wide text-[#777] mt-4">
          MODULE: online_banking -- formsproto Oracle Autonomous DB 23ai
        </div>
        <div className="text-[13px] text-[#999] mt-2.5 max-w-[640px]">
          One AI agent, one pass: parse the legacy app, cross-reference the live schema, extract the logic, stand up a real API, and hand it to any frontend.
        </div>
      </header>

      {/* PIPELINE */}
      <section className="px-10 py-12 border-b-[3px] border-black bg-[#fffdf0]">
        <div className="font-mono text-[10px] tracking-[3px] font-bold text-[#888] mb-2.5">THE PIPELINE</div>
        <div
          className="text-[clamp(22px,3vw,30px)] font-black mb-8"
          style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}
        >
          How an AI agent takes this from .fmb file to live app
        </div>
        <div className="flex items-stretch gap-0 flex-wrap md:flex-nowrap">
          {[
            { n: '01', tag: '.FMB XML -- .SQL', title: 'Drop the legacy files', desc: 'Point the agent at the exported Forms XML and the target schema DDL. Nothing to upload; it reads local files directly.' },
            { n: '02', tag: 'MCP -- SQLcl', title: 'Agent analyzes and cross-references', desc: 'Parses every trigger and block, then queries the live DB over MCP to catch schema mismatches before they cause a runtime failure.' },
            { n: '03', tag: 'GATE', title: 'Analysis report generated', desc: 'The agent hands back a full report: modules found, logic extracted, schema bugs, security issues. Migration does not proceed until this is reviewed.', link: '#report', linkLabel: 'VIEW THE REPORT' },
            { n: '04', tag: 'PL/SQL -- ORDS', title: 'Extract logic, expose as API', desc: 'Once approved, business logic becomes PL/SQL packages, compiled into the DB. Agent then defines ORDS REST endpoints over MCP, with no manual console clicks.' },
            { n: '05', tag: 'ANY STACK', title: 'Build the frontend', desc: 'Wire any UI to those same REST endpoints: this React app, Oracle APEX Builder, hand-rolled HTML, whatever the team already knows.' },
            { n: '06', tag: 'LIVE DEMO', title: 'A working app', desc: 'End-to-end, clickable, backed by the real database. Try both the legacy simulation and the live rebuild below.', final: true },
          ].map((step, i, arr) => (
            <div key={step.n} className="flex items-stretch">
              <div className={`flex-1 bg-white border-[3px] ${step.final ? 'border-[#1A6EFF] shadow-[5px_5px_0_#1A6EFF]' : 'border-black shadow-[5px_5px_0_#000]'} p-5 flex flex-col gap-2.5 min-w-[140px]`}>
                <span
                  className={`text-[34px] font-black leading-none ${step.final ? 'text-[#cfe0ff]' : 'text-[#e8e8e8]'}`}
                  style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}
                >
                  {step.n}
                </span>
                <span className={`font-mono text-[9px] tracking-wide font-bold px-2 py-0.5 border-[1.5px] w-fit ${step.final ? 'border-[#1A6EFF] text-[#1A6EFF]' : 'border-black'}`}>
                  {step.tag}
                </span>
                <div className="font-black text-[14px]" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>{step.title}</div>
                <div className="text-[12px] text-[#444] leading-snug">{step.desc}</div>
                {step.link && (
                  <a href={step.link} className="mt-auto pt-1.5 font-mono text-[10.5px] font-bold tracking-wide text-[#FF1F5A] hover:underline">
                    {step.linkLabel}
                  </a>
                )}
              </div>
              {i < arr.length - 1 && (
                <div className="flex items-center justify-center w-6 shrink-0 text-[20px] font-black text-[#FF1F5A]">
                  &rarr;
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* STATS */}
      <div id="report" className="grid grid-cols-2 md:grid-cols-4 border-b-[3px] border-black">
        {[
          { num: '12', label: 'MODULES ANALYZED', sub: 'All 12 .fmb XML exports processed', bg: 'bg-[#F5E642] text-black' },
          { num: '08', label: 'PACKAGES GENERATED', sub: 'PL/SQL extracted, validated, committed', bg: 'bg-[#FF1F5A] text-white' },
          { num: '05', label: 'SCHEMA BUGS CAUGHT', sub: '2 would break production silently', bg: 'bg-[#1A6EFF] text-white' },
          { num: '~40', label: 'HOURS SAVED', sub: 'vs. manual analysis + extraction', bg: 'bg-black text-[#F5E642]' },
        ].map((s, i, arr) => (
          <div key={s.label} className={`${s.bg} px-8 py-9 flex flex-col gap-1.5 ${i < arr.length - 1 ? 'border-r-[3px] border-black' : ''}`}>
            <span className="font-black text-[clamp(44px,5vw,64px)] leading-none tabular-nums" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>{s.num}</span>
            <span className="font-mono text-[11px] font-bold tracking-[2px]">{s.label}</span>
            <span className="text-[12px] opacity-65 mt-0.5">{s.sub}</span>
          </div>
        ))}
      </div>

      {/* CHARTS */}
      <section className="px-10 py-12 border-b-[3px] border-black">
        <div className="font-mono text-[10px] tracking-[3px] font-bold text-[#888] mb-2.5">ANALYSIS REPORT -- STEP 03 OUTPUT</div>
        <div className="font-black text-[clamp(22px,3vw,30px)] mb-8" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>
          What the agent found across 12 modules
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-8">

          {/* Bar chart */}
          <div className="border-[3px] border-black shadow-[5px_5px_0_#000] p-7">
            <div className="font-mono text-[10px] tracking-[2px] font-bold text-[#444] mb-6">COMPLEXITY DISTRIBUTION</div>
            <div className="flex items-end gap-4 h-44 mb-4">
              {[
                { count: 1, label: 'HIGH', note: 'MANAGER APPROVAL', color: 'bg-[#F5E642]', h: '25%' },
                { count: 4, label: 'MEDIUM', note: 'acct opening, tx entry, etc.', color: 'bg-[#ffd6e0]', h: '100%' },
                { count: 4, label: 'LOW', note: 'login, status check, etc.', color: 'bg-[#cce4ff]', h: '100%' },
                { count: 3, label: 'TRIVIAL', note: 'nav-only, read-only', color: 'bg-[#e8e8e8]', h: '75%' },
              ].map(bar => (
                <div key={bar.label} className="flex-1 flex flex-col items-center h-full justify-end gap-2">
                  <div className={`w-full border-2 border-black flex items-start justify-center pt-1.5 ${bar.color}`} style={{ height: bar.h }}>
                    <span className="font-black text-[22px]" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>{bar.count}</span>
                  </div>
                  <div className="font-mono text-[10px] tracking-wide text-center font-bold">{bar.label}</div>
                  <div className="text-[10px] text-[#888] text-center leading-tight">{bar.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Donut chart */}
          <div className="border-[3px] border-black shadow-[5px_5px_0_#000] p-7">
            <div className="font-mono text-[10px] tracking-[2px] font-bold text-[#444] mb-6">EXTRACTION STATUS</div>
            <div className="flex flex-col items-center gap-6">
              <div
                className="w-[170px] h-[170px] rounded-full border-2 border-black relative shrink-0"
                style={{ background: 'conic-gradient(#F5E642 0% 66.67%, #1A6EFF 66.67% 91.67%, #FF1F5A 91.67% 100%)' }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[88px] h-[88px] bg-white rounded-full border-2 border-black flex flex-col items-center justify-center">
                  <span className="font-black text-[24px] leading-none" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>8</span>
                  <span className="font-mono text-[8px] tracking-wide">PACKAGES</span>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 w-full">
                {[
                  { color: '#F5E642', label: '8 packages extracted', pct: '67%' },
                  { color: '#1A6EFF', label: '3 stubs (pure navigation)', pct: '25%' },
                  { color: '#FF1F5A', label: '1 flagged (security issue)', pct: '8%' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-2.5 text-[12px]">
                    <div className="w-[18px] h-[18px] border-2 border-black shrink-0" style={{ background: l.color }} />
                    <span>{l.label}</span>
                    <span className="font-mono text-[11px] font-bold ml-auto">{l.pct}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SCHEMA BUGS */}
      <section className="px-10 py-12 border-b-[3px] border-black bg-[#fffdf0]">
        <div className="font-mono text-[10px] tracking-[3px] font-bold text-[#888] mb-2.5">AUTOMATED SCHEMA VALIDATION</div>
        <div className="font-black text-[clamp(22px,3vw,30px)] mb-8" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>
          5 mismatches caught by cross-referencing Forms XML against live DB
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr>
                {['#', 'SEVERITY', 'TYPE', 'IN SQL SCRIPT', 'FORMS XML REFERENCES', 'CONSEQUENCE IF UNPATCHED'].map(h => (
                  <th key={h} className="font-mono text-[10px] tracking-[2px] text-left px-3.5 py-2.5 bg-black text-[#F5E642] border-2 border-black">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { n: 1, sev: 'CRITICAL', sevColor: '#FF1F5A', type: 'Column type', inScript: 'Account_Number NUMBER(6)', formsRef: "Approval inserts 'CUJoh00001' (alphanumeric)", consequence: 'ORA-01722 at every approval. Application silently broken in production.' },
                { n: 2, sev: 'CRITICAL', sevColor: '#FF1F5A', type: 'FK target', inScript: 'REFERENCES GRP1_ACCOUNTREQUEST', formsRef: 'Table is GROUP1_ACCOUNTREQUEST', consequence: 'Schema DDL fails: FK target does not exist. Tables never created.' },
                { n: 3, sev: 'HIGH', sevColor: '#FF8C00', type: 'Column name', inScript: 'password VARCHAR2(10)', formsRef: 'All DML references PASSWORD11', consequence: 'ORA-00904: login fails, registration fails, every auth operation errors.' },
                { n: 4, sev: 'HIGH', sevColor: '#FF8C00', type: 'Table name', inScript: 'GROUP1_ACCOUNTREQUEST', formsRef: 'G1_ACCOUNTREQUEST', consequence: 'Account-opening and approval DML target a non-existent table name.' },
                { n: 5, sev: 'HIGH', sevColor: '#FF8C00', type: 'Table name', inScript: 'GRP1_REGISTEREDINFO', formsRef: 'G1_REGISTEREDINFO', consequence: 'Login, registration, approval DML target a non-existent table name.' },
              ].map(row => (
                <tr key={row.n}>
                  <td className="px-3.5 py-3 border-2 border-black text-[13px]">{row.n}</td>
                  <td className="px-3.5 py-3 border-2 border-black">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 tracking-wide text-white" style={{ background: row.sevColor }}>{row.sev}</span>
                  </td>
                  <td className="px-3.5 py-3 border-2 border-black text-[13px]">{row.type}</td>
                  <td className="px-3.5 py-3 border-2 border-black"><code className="font-mono text-[12px] bg-[#f0f0f0] px-1">{row.inScript}</code></td>
                  <td className="px-3.5 py-3 border-2 border-black text-[13px]">{row.formsRef}</td>
                  <td className="px-3.5 py-3 border-2 border-black text-[13px]">{row.consequence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECURITY FINDINGS */}
      <section className="px-10 py-12 border-b-[3px] border-black">
        <div className="font-mono text-[10px] tracking-[3px] font-bold text-[#888] mb-2.5">SECURITY AUDIT</div>
        <div className="font-black text-[clamp(22px,3vw,30px)] mb-8" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>
          Issues a code review would miss, found in trigger logic
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              stripe: '#FF1F5A', sevLabel: 'CRITICAL', sevColor: '#FF1F5A',
              title: 'Hardcoded Manager Credentials',
              desc: <>Password <code className="font-mono text-[12px] bg-[#ffe8ee] px-1">"ADMIN123"</code> is embedded plaintext in a WHEN-BUTTON-PRESSED trigger inside the compiled .fmb binary. Any developer who opens Forms Builder extracts it immediately.</>,
              fix: 'FIX -- Replace entirely with APEX workspace authentication. Apply MANAGER role authorization scheme to approval page. Do not move this credential to PL/SQL.',
            },
            {
              stripe: '#FF8C00', sevLabel: 'HIGH', sevColor: '#CC6A00',
              title: 'Plaintext Password Storage',
              desc: <>Customer passwords stored as <code className="font-mono text-[12px] bg-[#fff5e0] px-1">VARCHAR2(10)</code> plaintext in <code className="font-mono text-[12px] bg-[#fff5e0] px-1">GRP1_REGISTEREDINFO.password11</code>. Any DBA or unrestricted SELECT exposes all credentials.</>,
              fix: 'FIX -- APEX_UTIL.GET_HASH before storage, or use APEX End User Account management (handles hashing natively).',
            },
            {
              stripe: '#F5C518', sevLabel: 'MEDIUM', sevColor: '#8B6914',
              title: 'Universal Default Password',
              desc: <>Every approved account is inserted with <code className="font-mono text-[12px] bg-[#fffce0] px-1">password11 = '0000'</code>. All new customers share the same initial credential until they manually self-register online.</>,
              fix: 'FIX -- Generate random temporary password on approval. Email to customer. Enforce password change on first login.',
            },
          ].map(f => (
            <div key={f.title} className="border-[3px] border-black shadow-[5px_5px_0_#000] overflow-hidden">
              <div className="h-2" style={{ background: f.stripe }} />
              <div className="p-5">
                <div className="font-mono text-[10px] tracking-[2px] font-bold mb-2.5" style={{ color: f.sevColor }}>
                  {f.sevLabel}
                </div>
                <div className="font-black text-[16px] mb-3 leading-snug" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>{f.title}</div>
                <div className="text-[13px] leading-relaxed text-[#333]">{f.desc}</div>
                <div className="mt-3 font-mono text-[11px] text-[#555] border-t border-[#ddd] pt-2.5 leading-snug">{f.fix}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MODULE GRID */}
      <section className="px-10 py-12 pb-0 border-b-0">
        <div className="font-mono text-[10px] tracking-[3px] font-bold text-[#888] mb-2.5">FULL MODULE BREAKDOWN</div>
        <div className="font-black text-[clamp(22px,3vw,30px)] mb-4" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>
          All 12 modules: click to expand extracted logic
        </div>
      </section>
      <div className="border-t-[3px] border-l-[3px] border-black">
        <div className="grid grid-cols-1 md:grid-cols-3">
          {MODULES.map((m, i) => (
            <div key={m.file} className="border-r-[3px] border-b-[3px] border-black">
              <div
                className="px-4 py-4 flex items-start justify-between gap-2.5 cursor-pointer select-none hover:bg-[#fafafa]"
                onClick={() => toggleModule(i)}
              >
                <div>
                  <div className="font-mono text-[12px] font-bold break-all">{m.file}</div>
                  {m.alias && <div className="font-mono text-[10px] text-[#888] mt-0.5">FormModule: {m.alias}</div>}
                </div>
                <div className="flex items-start gap-1.5 shrink-0">
                  <span className={`font-mono text-[9px] tracking-wide font-bold px-1.5 py-0.5 border-[1.5px] border-black ${COMPLEXITY_COLORS[m.complexity]}`}>
                    {m.complexity.toUpperCase()}
                  </span>
                  <span className="font-black text-[16px] text-[#bbb] leading-none">{openModule === i ? '−' : '+'}</span>
                </div>
              </div>
              <div className="px-4 pb-3.5 font-mono text-[10px]">
                <PkgLabel status={m.pkgStatus} pkg={m.pkg} />
              </div>
              {openModule === i && (
                <div className="border-t-2 border-black bg-[#fffdf4] px-4 py-4">
                  <p className="text-[12px] text-[#333] mb-3 leading-snug">{m.purpose}</p>
                  {m.logic.length > 0 ? (
                    <>
                      <div className="font-mono text-[9px] tracking-[2px] text-[#999] mb-1.5">EXTRACTED LOGIC</div>
                      <ul className="flex flex-col gap-1.5 list-none">
                        {m.logic.map((l, li) => (
                          <li key={li} className="font-mono text-[11px] text-[#222] pl-3.5 relative leading-snug before:content-['>'] before:absolute before:left-0 before:text-[#FF1F5A] before:font-black">{l}</li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <em className="font-mono text-[11px] text-[#bbb]">No extractable logic in this module</em>
                  )}
                  {m.tables.length > 0 && (
                    <div className="mt-2.5 font-mono text-[10px] flex flex-wrap gap-1 items-center">
                      <span className="text-[#999]">TABLES</span>
                      {m.tables.map(t => (
                        <span key={t} className="bg-black text-[#F5E642] px-1.5 py-0.5 text-[10px]">{t}</span>
                      ))}
                    </div>
                  )}
                  {m.note && (
                    <div className="mt-2.5 font-mono text-[10px] text-[#777] border-t border-[#e8e8e0] pt-2 leading-snug">{m.note}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* TRY IT */}
      <section className="px-10 py-12 border-t-[3px] border-b-[3px] border-black">
        <div className="font-mono text-[10px] tracking-[3px] font-bold text-[#888] mb-2.5">REPORT REVIEWED -- MIGRATION COMPLETE</div>
        <div className="font-black text-[clamp(22px,3vw,30px)] mb-8" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>
          Try the legacy simulation side by side with the live rebuild
        </div>

        {/* ORDS config */}
        <div className="flex items-center gap-2.5 flex-wrap bg-[#F5E642] border-[3px] border-black shadow-[5px_5px_0_#000] px-4 py-3 mb-7 font-mono text-[12px]">
          <span className="font-bold">ORDS URL (for the live pages)</span>
          <input
            type="text"
            className="font-mono text-[12px] px-2 py-1.5 border-2 border-black bg-white w-[380px] max-w-full"
            placeholder="https://YOUR_DB.adb.REGION.oraclecloudapps.com/ords/admin/ob"
            value={ordsInput}
            onChange={e => setOrdsInput(e.target.value)}
          />
          <button
            className="font-mono text-[11px] font-bold bg-black text-[#F5E642] border-2 border-black px-4 py-1.5 cursor-pointer hover:opacity-85"
            onClick={handleSaveOrds}
          >
            SAVE TO BROWSER
          </button>
          {savedMsg && <span className="text-[10px] text-[#444]">{savedMsg}</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          {/* Legacy sim column */}
          <div>
            <div className="font-black text-[14px] tracking-wide pb-2 mb-1.5 border-b-[3px] border-[#999] text-[#777]" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>[ LEGACY UI SIMULATION ]</div>
            <div className="font-mono text-[10px] text-[#999] mb-3.5">HARDCODED -- NO NETWORK CALLS -- JS-only replica</div>
            {['Account Opening', 'Manager Approval', 'Check Status'].map(label => (
              <button
                key={label}
                className="block w-full text-left no-underline border-[2.5px] border-[#aaa] shadow-[4px_4px_0_#aaa] px-4 py-3.5 mb-2.5 bg-white cursor-pointer hover:-translate-x-[3px] hover:-translate-y-[3px] transition-transform duration-75"
                onClick={() => navigate('/legacy')}
              >
                <div className="font-black text-[14px] text-[#444]" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>{label}</div>
                <div className="font-mono text-[10px] text-[#888] mt-1">SIMULATED -- G1_{label.replace(' ', '').toUpperCase()} -- see Legacy tab</div>
              </button>
            ))}
          </div>

          {/* Live column */}
          <div>
            <div className="font-black text-[14px] tracking-wide pb-2 mb-1.5 border-b-[3px] border-[#1A6EFF] text-[#1A6EFF]" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>LIVE -- ORDS -- formsproto</div>
            <div className="font-mono text-[10px] text-[#999] mb-3.5">REAL DB CALLS -- Oracle Autonomous DB 23ai -- pkg_ob_* packages</div>
            {[
              { label: 'Account Opening', sub: 'POST /ob/requests/ -- pkg_ob_accountopening -- INSERT GROUP1_ACCOUNTREQUEST', to: '/live/account-opening' },
              { label: 'Manager Approval', sub: 'GET /ob/pending/ + POST /ob/approve|reject/:id -- pkg_ob_managerapproval', to: '/live/manager-approval' },
              { label: 'Check Status', sub: 'GET /ob/status/:id -- pkg_ob_checkstatus -- GROUP1_ACCOUNTREQUEST + GRP1_REGISTEREDINFO', to: '/live/check-status' },
            ].map(link => (
              <button
                key={link.label}
                className="block w-full text-left border-[2.5px] border-[#1A6EFF] shadow-[4px_4px_0_#1A6EFF] px-4 py-3.5 mb-2.5 bg-white cursor-pointer hover:-translate-x-[3px] hover:-translate-y-[3px] transition-transform duration-75"
                onClick={() => navigate(link.to)}
              >
                <div className="font-black text-[14px] text-[#1A6EFF]" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>{link.label}</div>
                <div className="font-mono text-[10px] text-[#888] mt-1">{link.sub}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black text-[#555] px-10 py-5 font-mono text-[11px] flex justify-between flex-wrap gap-2">
        <span>ORACLE FORMS MODERNIZATION PIPELINE -- module: online_banking</span>
        <span>DB: formsproto Autonomous DB 23ai -- generated 2026-07-07</span>
      </footer>
    </div>
  )
}
