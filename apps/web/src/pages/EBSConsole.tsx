import { useNavigate } from 'react-router-dom'
import type { Complexity } from '../data/modules'

/* -----------------------------------------------------------------------
   Oracle EBS R12-style Navigator
   Left panel: Responsibilities | Right panel: Function list per responsibility
   Legacy forms  -> popup window (mimics Java Forms Applet launch)
   Modernized apps -> new browser tab
----------------------------------------------------------------------- */

interface NavFunc {
  formId: string
  title: string
  description: string
  complexity: Complexity
  legacyTab: 'account' | 'approval' | 'status'
  modernPath?: string
}

const FUNCTIONS: NavFunc[] = [
  {
    formId: 'G1_ACCOUNTOPENING',
    title: 'New Account Opening',
    description: 'Submit a new bank account application. Collects personal, contact and address details.',
    complexity: 'Medium',
    legacyTab: 'account',
    modernPath: '/live/account-opening',
  },
  {
    formId: 'G1_CHECKSTATUS',
    title: 'Check Application Status',
    description: 'Look up the status of an existing account application by Request ID.',
    complexity: 'Low',
    legacyTab: 'status',
    modernPath: '/live/check-status',
  },
  {
    formId: 'G1_LOGIN',
    title: 'Customer Login',
    description: 'Authenticate an existing account holder before accessing transaction screens.',
    complexity: 'Low',
    legacyTab: 'account',
  },
  {
    formId: 'G1_TRANSACTIONENTRY',
    title: 'Transaction Entry',
    description: 'Submit a debit, credit, or cheque payment for an active account.',
    complexity: 'Medium',
    legacyTab: 'account',
  },
  {
    formId: 'G1_TRANSACTIONDETAILS',
    title: 'Transaction History',
    description: 'Date-range report of all transactions for a given account number.',
    complexity: 'Low',
    legacyTab: 'account',
  },
  {
    formId: 'G1_ONLINEREGISTRATION',
    title: 'Online Banking Enrollment',
    description: 'Set a login password for an approved account. Enables self-service portal access.',
    complexity: 'Medium',
    legacyTab: 'account',
  },
  {
    formId: 'G1_INTERESTCALCULATOR',
    title: 'Interest Calculator',
    description: 'Simple interest estimator for 7 loan product types. No DB interaction.',
    complexity: 'Medium',
    legacyTab: 'account',
  },
]

const MANAGER_FUNCTIONS: NavFunc[] = [
  {
    formId: 'G1_MANAGERAPPROVAL',
    title: 'Account Approval Queue',
    description: 'View all ENTERED requests and approve or reject each. Generates account number on approval.',
    complexity: 'High',
    legacyTab: 'approval',
    modernPath: '/live/manager-approval',
  },
  {
    formId: 'G1_CUSTOMERDETAIL',
    title: 'Customer Application Detail',
    description: 'Read-only view of a single account request. Launched from approval queue.',
    complexity: 'Trivial',
    legacyTab: 'approval',
  },
  {
    formId: 'G1_MANAGERLOGINPAGE',
    title: 'Manager Login',
    description: 'Authentication gate for manager workflow. NOTE: hardcoded credentials -- see security findings.',
    complexity: 'Low',
    legacyTab: 'approval',
  },
]

const COMPLEXITY_PILL: Record<Complexity, string> = {
  Trivial: 'bg-[#e8e8e8] text-[#555]',
  Low:     'bg-[#dceeff] text-[#0044aa]',
  Medium:  'bg-[#fff0cc] text-[#7a4800]',
  High:    'bg-[#fde8e8] text-[#900]',
}

function getBaseUrl() {
  return window.location.href.replace(/#.*/, '')
}

function launchFormsPopup(tab: string, formId: string) {
  const url = `${getBaseUrl()}#/legacy?form=${tab}`
  const popup = window.open(
    url,
    `forms_${formId}`,
    'width=860,height=720,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=yes',
  )
  if (!popup) alert('Popup blocked -- please allow popups for this site to launch Oracle Forms.')
}

function openModernTab(path: string) {
  window.open(`${getBaseUrl()}#${path}`, '_blank', 'noopener,noreferrer')
}

function FunctionTable({ fns, title }: { fns: NavFunc[]; title: string }) {
  return (
    <div className="mb-6">
      {/* section header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2c5a9e] text-white text-[11px] font-bold border border-[#1a3a6e]">
        <span className="text-[#b8d0f0]">&#9654;</span>
        {title}
      </div>

      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-[#d6e4f2] text-[#1a3a5f] border-b border-[#8ba7c7]">
            <th className="text-left px-3 py-1.5 font-bold border-r border-[#8ba7c7] w-[180px]">FORM</th>
            <th className="text-left px-3 py-1.5 font-bold border-r border-[#8ba7c7]">DESCRIPTION</th>
            <th className="text-left px-3 py-1.5 font-bold border-r border-[#8ba7c7] w-[72px]">COMPLEXITY</th>
            <th className="text-center px-3 py-1.5 font-bold border-r border-[#8ba7c7] w-[120px]">LEGACY (FORMS)</th>
            <th className="text-center px-3 py-1.5 font-bold w-[130px]">MODERNIZED</th>
          </tr>
        </thead>
        <tbody>
          {fns.map((fn, i) => (
            <tr
              key={fn.formId}
              className={`border-b border-[#c4d9ee] hover:bg-[#e6f0fb] transition-colors ${i % 2 === 1 ? 'bg-[#f5f8fd]' : 'bg-white'}`}
            >
              <td className="px-3 py-2 border-r border-[#c4d9ee] align-middle">
                <span className="font-mono text-[10px] text-[#003399] font-bold">{fn.formId}</span>
                <div className="text-[10px] text-[#555] mt-0.5">{fn.title}</div>
              </td>
              <td className="px-3 py-2 border-r border-[#c4d9ee] align-middle text-[#333]">
                {fn.description}
              </td>
              <td className="px-3 py-2 border-r border-[#c4d9ee] align-middle text-center">
                <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${COMPLEXITY_PILL[fn.complexity]}`}>
                  {fn.complexity.toUpperCase()}
                </span>
              </td>

              {/* LEGACY LAUNCH */}
              <td className="px-2 py-2 border-r border-[#c4d9ee] align-middle text-center">
                <button
                  onClick={() => launchFormsPopup(fn.legacyTab, fn.formId)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold cursor-pointer border border-[#a06010] text-white rounded-sm"
                  style={{ background: 'linear-gradient(to bottom, #f0a030, #d48520)' }}
                  title="Opens Oracle Forms applet in a popup window"
                >
                  <span>&#9632;</span> LAUNCH FORMS
                </button>
              </td>

              {/* MODERNIZED LAUNCH */}
              <td className="px-2 py-2 align-middle text-center">
                {fn.modernPath ? (
                  <button
                    onClick={() => openModernTab(fn.modernPath!)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold cursor-pointer border border-[#1a3a6e] text-white rounded-sm"
                    style={{ background: 'linear-gradient(to bottom, #2a6dd9, #1a4aaa)' }}
                    title="Opens the modernized ORDS-backed app in a new browser tab"
                  >
                    <span>&#10132;</span> OPEN APP
                  </button>
                ) : (
                  <span className="text-[10px] text-[#aaa] italic">not yet modernized</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function EBSConsole() {
  const navigate = useNavigate()
  const today = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date())

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12, background: '#e9eef5' }}>

      {/* ---- ORACLE HEADER ---- */}
      <div className="bg-[#1e3c6e] text-white px-4 py-0 flex items-stretch justify-between" style={{ minHeight: 48 }}>
        <div className="flex items-center gap-3">
          {/* Oracle logo approximation */}
          <div className="flex items-center gap-1.5">
            <div className="bg-[#cc0000] text-white font-black text-[14px] px-2 py-0.5 rounded-full" style={{ fontFamily: 'Arial Black, Arial', letterSpacing: '-0.5px' }}>
              ORACLE
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-white font-bold text-[13px]">E-Business Suite</span>
              <span className="text-[#8ab4d8] text-[9px] tracking-wide">RELEASE 12.2</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-[#8ab4d8]">
          <span>User: <strong className="text-white">MANAGER</strong></span>
          <span className="text-[#8ab4d8]">|</span>
          <span>Responsibility: <strong className="text-white">Online Banking Manager</strong></span>
          <span className="text-[#8ab4d8]">|</span>
          <span className="text-[#8ab4d8]">{today}</span>
        </div>
      </div>

      {/* ---- NAV TABS ---- */}
      <div className="bg-[#e0eaf6] border-b border-[#8ba7c7] px-2 flex items-end gap-0 text-[11px]">
        {['Home', 'Navigator', 'Worklist', 'Settings', 'Diagnostics'].map((tab, i) => (
          <div
            key={tab}
            className={`px-4 py-1.5 border-t border-x border-[#8ba7c7] cursor-pointer select-none ${
              i === 1
                ? 'bg-white font-bold text-[#1e3c6e] border-b-white -mb-px z-10'
                : 'bg-[#d0dff0] text-[#1e3c6e] hover:bg-[#e0ecff]'
            }`}
          >
            {tab}
          </div>
        ))}
        {/* spacer then analysis link */}
        <div className="ml-auto pb-1.5 flex items-center gap-3 text-[10px]">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-[#003399] underline cursor-pointer hover:text-[#cc0000] bg-transparent border-0"
          >
            View AI Modernization Analysis Report
          </button>
        </div>
      </div>

      {/* ---- BREADCRUMB ---- */}
      <div className="bg-[#f0f4f9] border-b border-[#c4d9ee] px-4 py-1 text-[11px] text-[#555]">
        <span className="text-[#003399] cursor-pointer hover:underline">Home</span>
        <span className="mx-1 text-[#aaa]">&gt;</span>
        <span className="text-[#003399] cursor-pointer hover:underline">Navigator</span>
        <span className="mx-1 text-[#aaa]">&gt;</span>
        <span className="text-[#333] font-bold">Online Banking Manager</span>
      </div>

      {/* ---- MAIN AREA ---- */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR - Responsibilities */}
        <div className="w-52 shrink-0 bg-white border-r border-[#8ba7c7] flex flex-col">
          <div className="bg-[#2c5a9e] text-white text-[11px] font-bold px-3 py-1.5 border-b border-[#1a3a6e]">
            RESPONSIBILITIES
          </div>
          <div className="flex-1 overflow-y-auto text-[11px]">
            {/* selected responsibility */}
            <div className="flex items-start gap-1 px-3 py-2 bg-[#dce8fa] border-b border-[#c4d9ee] text-[#1a3a5f] font-bold cursor-pointer">
              <span className="text-[#cc6600] font-black mt-0.5">&#9658;</span>
              <span>Online Banking Manager</span>
            </div>
            {/* placeholder others */}
            {['System Administrator', 'General Ledger Super User', 'AP Manager', 'Purchasing Agent'].map(r => (
              <div key={r} className="flex items-start gap-1 px-3 py-2 border-b border-[#eef3f9] text-[#555] cursor-pointer hover:bg-[#f0f5fb]">
                <span className="text-[#8ba7c7] mt-0.5">&#9658;</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT MAIN - Functions */}
        <div className="flex-1 overflow-y-auto">

          {/* Panel header */}
          <div className="flex items-center justify-between bg-[#2c5a9e] text-white px-4 py-1.5 border-b border-[#1a3a6e]">
            <div className="text-[12px] font-bold">Navigator -- Online Banking Manager</div>
            <div className="flex items-center gap-4 text-[10px] text-[#b8d0f0]">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(to bottom, #f0a030, #d48520)', border: '1px solid #a06010' }} />
                <span>LEGACY (Forms Applet -- popup)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(to bottom, #2a6dd9, #1a4aaa)', border: '1px solid #1a3a6e' }} />
                <span>MODERNIZED (ORDS-backed -- new tab)</span>
              </div>
            </div>
          </div>

          <div className="p-4">
            <FunctionTable fns={FUNCTIONS} title="ONLINE BANKING -- CUSTOMER FUNCTIONS" />
            <FunctionTable fns={MANAGER_FUNCTIONS} title="ONLINE BANKING -- MANAGER FUNCTIONS" />

            {/* Note about modules with no demo form */}
            <div className="mt-2 px-3 py-2 bg-[#fffbe6] border border-[#e8d48a] text-[10px] text-[#6a5000]">
              <strong>Note:</strong> Navigation-only forms (G1_HOMEPAGE, G1_CUSTOMERHOMEPAGE) are not listed -- they contain no business logic and are replaced by this Navigator in the modernized stack.
            </div>

            {/* Module complexity summary */}
            <div className="mt-4 border border-[#c4d9ee] bg-white">
              <div className="bg-[#d6e4f2] text-[#1a3a5f] text-[11px] font-bold px-3 py-1.5 border-b border-[#c4d9ee]">
                AI ANALYSIS SUMMARY -- online_banking module
              </div>
              <div className="grid grid-cols-4 divide-x divide-[#c4d9ee] text-center">
                {[
                  { num: '12', label: 'Forms analyzed' },
                  { num: '8', label: 'PL/SQL packages generated' },
                  { num: '5', label: 'Schema bugs caught' },
                  { num: '3', label: 'Security issues flagged' },
                ].map(s => (
                  <div key={s.label} className="px-4 py-3">
                    <div className="text-[22px] font-black text-[#1e3c6e]" style={{ fontFamily: 'Arial Black, Arial' }}>{s.num}</div>
                    <div className="text-[10px] text-[#555] mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#c4d9ee] px-3 py-1.5 text-[10px] text-[#555] flex items-center justify-between">
                <span>DB: formsproto Oracle Autonomous Database 23ai -- migrating to Oracle AI Database 26ai</span>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-[#003399] underline cursor-pointer hover:text-[#cc0000] bg-transparent border-0 text-[10px]"
                >
                  Full analysis report &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- FOOTER ---- */}
      <div className="bg-[#1e3c6e] text-[#8ab4d8] px-4 py-1.5 text-[10px] flex justify-between">
        <span>Oracle E-Business Suite Release 12.2 -- formsproto environment</span>
        <span>Modernization prototype -- Galent -- 2026-07-08</span>
      </div>
    </div>
  )
}
