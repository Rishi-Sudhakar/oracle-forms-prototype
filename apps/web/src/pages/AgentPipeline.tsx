import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { unzipSync } from 'fflate'

type Step = 'upload' | 'analyzing' | 'review' | 'generating' | 'done'

interface AnalysisResult {
  modules: Array<{ name: string; type: string; triggerCount: number; fieldCount: number }>
  automationScore: number
  interventionItems: Array<{ severity: 'HIGH' | 'MEDIUM' | 'LOW'; description: string; reason: string }>
  stats: { totalTriggers: number; totalFields: number; plsqlProcedures: number; tablesReferenced: string[]; blockCount?: number }
  summary: string
  agentLog?: string[]
  autogenReview?: { riskFindings: string; migrationStrategy: string }
  parallelAgentResults?: Record<string, string>
}

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Forms Version="12.2.1.0.0">
  <FormModule Name="ONLINE_BANKING_MAIN">
    <Block Name="CUSTOMERS" QueryDataSourceName="CUSTOMERS">
      <Item Name="CUST_ID" ItemType="TEXT" DataType="NUMBER" ColumnName="CUST_ID" Prompt="Customer ID" Required="Y" Length="10"/>
      <Item Name="FIRST_NAME" ItemType="TEXT" DataType="CHAR" ColumnName="FIRST_NAME" Prompt="First Name" Required="Y" Length="50"/>
      <Item Name="LAST_NAME" ItemType="TEXT" DataType="CHAR" ColumnName="LAST_NAME" Prompt="Last Name" Required="Y" Length="50"/>
      <Item Name="EMAIL" ItemType="TEXT" DataType="CHAR" ColumnName="EMAIL" Prompt="Email" Length="100">
        <Trigger Name="WHEN-VALIDATE-ITEM" TriggerText="IF :CUSTOMERS.EMAIL IS NOT NULL THEN IF NOT REGEXP_LIKE(:CUSTOMERS.EMAIL, &apos;^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$&apos;) THEN MESSAGE(&apos;Invalid email format.&apos;); RAISE FORM_TRIGGER_FAILURE; END IF; END IF;"/>
      </Item>
      <Item Name="PHONE" ItemType="TEXT" DataType="CHAR" ColumnName="PHONE" Prompt="Phone" Length="20"/>
      <Item Name="DOB" ItemType="TEXT" DataType="DATE" ColumnName="DOB" Prompt="Date of Birth"/>
      <Item Name="ACCOUNT_TYPE" ItemType="LIST" DataType="CHAR" ColumnName="ACCOUNT_TYPE" Prompt="Account Type"/>
      <Item Name="SUBMIT_BTN" ItemType="PUSH BUTTON" Prompt="Submit Application"/>
      <Item Name="CLEAR_BTN" ItemType="PUSH BUTTON" Prompt="Clear Form"/>
      <Trigger Name="WHEN-NEW-RECORD-INSTANCE" TriggerText="DEFAULT_VALUE(&apos;PENDING&apos;, &apos;CUSTOMERS.STATUS&apos;); SET_ITEM_PROPERTY(&apos;CUSTOMERS.CUST_ID&apos;, ENABLED, PROPERTY_FALSE);"/>
      <Trigger Name="KEY-COMMIT" TriggerText="BEGIN VALIDATE_CUSTOMER_PKG.validate_and_save(p_first_name =&gt; :CUSTOMERS.FIRST_NAME, p_last_name =&gt; :CUSTOMERS.LAST_NAME, p_email =&gt; :CUSTOMERS.EMAIL, p_phone =&gt; :CUSTOMERS.PHONE, p_dob =&gt; :CUSTOMERS.DOB); COMMIT_FORM; MESSAGE(&apos;Customer application submitted successfully.&apos;); EXCEPTION WHEN OTHERS THEN ROLLBACK; MESSAGE(&apos;Error: &apos; || SQLERRM); RAISE FORM_TRIGGER_FAILURE; END;"/>
    </Block>
    <Block Name="ACCOUNTS" QueryDataSourceName="ACCOUNTS">
      <Item Name="ACCOUNT_NUM" ItemType="TEXT" DataType="CHAR" ColumnName="ACCOUNT_NUM" Prompt="Account Number" Required="Y" Length="20"/>
      <Item Name="BALANCE" ItemType="TEXT" DataType="NUMBER" ColumnName="BALANCE" Prompt="Balance"/>
      <Item Name="STATUS" ItemType="TEXT" DataType="CHAR" ColumnName="STATUS" Prompt="Status"/>
      <Trigger Name="POST-QUERY" TriggerText="GO_ITEM(&apos;ACCOUNTS.ACCOUNT_NUM&apos;); SYNCHRONIZE;"/>
    </Block>
    <Trigger Name="WHEN-NEW-FORM-INSTANCE" TriggerText="SET_WINDOW_PROPERTY(FORMS_MDI_WINDOW, TITLE, &apos;Online Banking - Account Management&apos;); GO_BLOCK(&apos;CUSTOMERS&apos;); EXECUTE_QUERY; SYNCHRONIZE;"/>
    <Trigger Name="WHEN-BUTTON-PRESSED" TriggerText="IF :SYSTEM.TRIGGER_ITEM = &apos;CUSTOMERS.SUBMIT_BTN&apos; THEN DO_KEY(&apos;COMMIT&apos;); ELSIF :SYSTEM.TRIGGER_ITEM = &apos;CUSTOMERS.CLEAR_BTN&apos; THEN CLEAR_BLOCK(ASK_COMMIT); SYNCHRONIZE; END IF;"/>
    <ProgramUnit Name="VALIDATE_CUSTOMER_PKG" ProgramUnitType="Package Body" ProgramUnitText="PACKAGE BODY VALIDATE_CUSTOMER_PKG IS PROCEDURE validate_and_save(p_first_name IN VARCHAR2, p_last_name IN VARCHAR2, p_email IN VARCHAR2, p_phone IN VARCHAR2, p_dob IN DATE) IS v_cust_id NUMBER; v_count NUMBER; BEGIN IF p_first_name IS NULL OR p_last_name IS NULL THEN RAISE_APPLICATION_ERROR(-20001, &apos;First name and last name are required.&apos;); END IF; SELECT COUNT(*) INTO v_count FROM CUSTOMERS WHERE EMAIL = p_email; IF v_count &gt; 0 THEN RAISE_APPLICATION_ERROR(-20002, &apos;Email address already registered.&apos;); END IF; SELECT NVL(MAX(CUST_ID), 0) + 1 INTO v_cust_id FROM CUSTOMERS; INSERT INTO CUSTOMERS (CUST_ID, FIRST_NAME, LAST_NAME, EMAIL, PHONE, DOB, STATUS, CREATED_DATE) VALUES (v_cust_id, p_first_name, p_last_name, p_email, p_phone, p_dob, &apos;PENDING&apos;, SYSDATE); INSERT INTO ACCOUNTS (ACCOUNT_NUM, CUSTOMER_ID, ACCOUNT_TYPE, BALANCE, STATUS) VALUES (LPAD(v_cust_id, 10, &apos;0&apos;) || &apos;-SAV&apos;, v_cust_id, &apos;SAVINGS&apos;, 0, &apos;PENDING&apos;); COMMIT; EXCEPTION WHEN OTHERS THEN ROLLBACK; RAISE; END validate_and_save; END VALIDATE_CUSTOMER_PKG;"/>
  </FormModule>
</Forms>`

const SAMPLE_SQL = `CREATE TABLE CUSTOMERS (
  CUST_ID    NUMBER PRIMARY KEY,
  FIRST_NAME VARCHAR2(50) NOT NULL,
  LAST_NAME  VARCHAR2(50) NOT NULL,
  EMAIL      VARCHAR2(100) UNIQUE,
  PHONE      VARCHAR2(20),
  DOB        DATE,
  STATUS     VARCHAR2(20) DEFAULT 'PENDING',
  CREATED_DATE DATE DEFAULT SYSDATE
);
CREATE TABLE ACCOUNTS (
  ACCOUNT_NUM  VARCHAR2(20) PRIMARY KEY,
  CUSTOMER_ID  NUMBER REFERENCES CUSTOMERS(CUST_ID),
  ACCOUNT_TYPE VARCHAR2(20) CHECK (ACCOUNT_TYPE IN ('SAVINGS','CHECKING','CD')),
  BALANCE      NUMBER(15,2) DEFAULT 0,
  STATUS       VARCHAR2(20) DEFAULT 'PENDING',
  CREATED_DATE DATE DEFAULT SYSDATE
);`

const SEV_COLOR: Record<string, string> = {
  HIGH: 'bg-[#FF1F5A] text-white',
  MEDIUM: 'bg-[#F5E642] text-black',
  LOW: 'bg-[#e8e8e8] text-black',
}

function StepIndicator({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'upload', label: '01 UPLOAD' },
    { key: 'analyzing', label: '02 ANALYZE' },
    { key: 'review', label: '03 REVIEW' },
    { key: 'generating', label: '04 GENERATE' },
    { key: 'done', label: '05 DONE' },
  ]
  const order = steps.map(s => s.key)
  const currentIdx = order.indexOf(current)

  return (
    <div className="flex items-center gap-0 px-10 py-6 border-b-[3px] border-black bg-white overflow-x-auto">
      {steps.map((s, i) => {
        const idx = order.indexOf(s.key)
        const done = idx < currentIdx
        const active = idx === currentIdx
        return (
          <div key={s.key} className="flex items-center">
            <div className={`
              px-4 py-2 border-[3px] border-black font-mono text-[11px] font-bold tracking-[2px] whitespace-nowrap
              ${active ? 'bg-[#F5E642] shadow-[4px_4px_0_#000]' : done ? 'bg-black text-[#F5E642]' : 'bg-white text-[#aaa]'}
            `}>
              {done ? '✓ ' : ''}{s.label}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-[3px] ${idx < currentIdx ? 'bg-black' : 'bg-[#ddd]'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function AgentPipeline() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('upload')
  const [xmlContent, setXmlContent] = useState('')
  const [sqlContent, setSqlContent] = useState('')
  const [fileNames, setFileNames] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [comments, setComments] = useState('')
  const [generatedHtml, setGeneratedHtml] = useState('')
  const [genCharCount, setGenCharCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)

  const processFile = useCallback(async (file: File) => {
    setError(null)
    const name = file.name.toLowerCase()

    if (name.endsWith('.zip')) {
      const buf = new Uint8Array(await file.arrayBuffer())
      const unzipped = unzipSync(buf)
      let xml = ''
      let sql = ''
      const names: string[] = []
      for (const [path, data] of Object.entries(unzipped)) {
        const p = path.toLowerCase()
        const text = new TextDecoder('utf-8').decode(data)
        if (p.endsWith('.xml') || p.endsWith('.fmb')) { xml += text + '\n'; names.push(path) }
        if (p.endsWith('.sql')) { sql += text + '\n'; names.push(path) }
      }
      if (!xml) { setError('No .xml file found in ZIP.'); return }
      setXmlContent(xml); setSqlContent(sql); setFileNames(names)
    } else if (name.endsWith('.xml')) {
      const text = await file.text()
      setXmlContent(text); setFileNames([file.name])
    } else if (name.endsWith('.sql')) {
      const text = await file.text()
      setSqlContent(text); setFileNames(prev => [...prev, file.name])
    } else {
      setError('Unsupported file type. Upload a .zip, .xml, or .sql file.')
    }
  }, [])

  function loadSample() {
    setXmlContent(SAMPLE_XML)
    setSqlContent(SAMPLE_SQL)
    setFileNames(['ONLINE_BANKING_MAIN_fmb.xml', 'schema.sql'])
    setError(null)
  }

  async function runAnalysis() {
    if (!xmlContent) return
    setStep('analyzing')
    setError(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xmlContent, sqlContent }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}: ${await res.text()}`)
      const data: AnalysisResult = await res.json()
      setAnalysis(data)
      setStep('review')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
      setStep('upload')
    }
  }

  async function runGeneration() {
    if (!analysis) return
    setStep('generating')
    setGeneratedHtml('')
    setGenCharCount(0)
    setError(null)
    try {
      const res = await fetch('/api/modernize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xmlContent, sqlContent, analysis, comments }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}: ${await res.text()}`)
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let html = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        html += chunk
        setGeneratedHtml(html)
        setGenCharCount(html.length)
      }
      setStep('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
      setStep('review')
    }
  }

  function openPreview() {
    if (!generatedHtml) return
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const blob = new Blob([generatedHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    previewUrlRef.current = url
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function downloadHtml() {
    if (!generatedHtml) return
    const blob = new Blob([generatedHtml], { type: 'text/html' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `modernized-${analysis?.modules?.[0]?.name?.toLowerCase() || 'oracle-forms'}.html`
    a.click()
  }

  function reset() {
    setStep('upload')
    setXmlContent(''); setSqlContent(''); setFileNames([])
    setAnalysis(null); setComments(''); setGeneratedHtml(''); setGenCharCount(0)
    setError(null)
  }

  const scoreColor = analysis
    ? analysis.automationScore >= 70 ? '#1A6EFF'
      : analysis.automationScore >= 40 ? '#F5E642'
      : '#FF1F5A'
    : '#000'

  return (
    <div className="font-[Arial,Helvetica,sans-serif] bg-white text-black min-h-screen flex flex-col">

      {/* HEADER */}
      <header className="bg-black text-[#F5E642] px-10 py-8 border-b-4 border-[#F5E642] flex-shrink-0">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="font-mono text-[10px] tracking-[3px] text-[#777] mb-2">
              AI MODERNIZATION PIPELINE | GALENT | 2026
            </div>
            <div
              className="font-black text-[clamp(28px,5vw,52px)] leading-none"
              style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}
            >
              AGENT PIPELINE
            </div>
            <div className="font-mono text-[11px] text-[#777] mt-2 tracking-wide">
              LANGGRAPH + LLAMAINDEX + AUTOGEN + CLAUDE OPUS 4.8
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="border-[2px] border-[#F5E642] text-[#F5E642] px-4 py-2 text-[12px] font-bold font-mono tracking-[1px] hover:bg-[#F5E642] hover:text-black transition-colors"
            >
              AI ANALYSIS
            </button>
            <button
              onClick={() => navigate('/')}
              className="border-[2px] border-[#555] text-[#555] px-4 py-2 text-[12px] font-bold font-mono tracking-[1px] hover:border-[#F5E642] hover:text-[#F5E642] transition-colors"
            >
              EBS CONSOLE
            </button>
          </div>
        </div>
      </header>

      <StepIndicator current={step} />

      {/* ERROR BANNER */}
      {error && (
        <div className="mx-10 mt-6 border-[3px] border-[#FF1F5A] bg-[#fff0f3] p-4 shadow-[4px_4px_0_#FF1F5A]">
          <span className="font-mono text-[11px] font-bold text-[#FF1F5A] tracking-[2px] block mb-1">ERROR</span>
          <span className="text-[13px] text-[#cc0033]">{error}</span>
        </div>
      )}

      {/* STEP: UPLOAD */}
      {step === 'upload' && (
        <div className="flex-1 px-10 py-10">
          <div className="font-mono text-[10px] tracking-[3px] font-bold text-[#888] mb-2">STEP 01</div>
          <div
            className="text-[clamp(22px,3vw,34px)] font-black mb-2"
            style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}
          >
            UPLOAD ORACLE FORMS FILES
          </div>
          <div className="text-[13px] text-[#666] mb-8 max-w-[560px]">
            Upload a ZIP containing Oracle Forms XML export (.xml) and optional database schema (.sql).
            The LangGraph pipeline will run 4 parallel Claude agents, then LlamaIndex and Autogen review.
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-[3px] border-dashed cursor-pointer p-12 text-center max-w-[560px] transition-all
              ${dragOver ? 'border-[#1A6EFF] bg-[#f0f6ff] shadow-[6px_6px_0_#1A6EFF]' : 'border-black hover:shadow-[6px_6px_0_#000] hover:bg-[#fffdf0]'}
            `}
          >
            <div className="font-black text-[18px] mb-2" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>
              DROP ZIP / XML / SQL HERE
            </div>
            <div className="font-mono text-[11px] text-[#888] tracking-[1px]">
              or click to browse
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,.xml,.sql"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }}
            />
          </div>

          {/* Files loaded */}
          {fileNames.length > 0 && (
            <div className="mt-4 max-w-[560px] border-[3px] border-black p-4 shadow-[4px_4px_0_#000]">
              <div className="font-mono text-[10px] tracking-[2px] font-bold mb-2">FILES LOADED</div>
              {fileNames.map(n => (
                <div key={n} className="font-mono text-[12px] text-[#1A6EFF]">{n}</div>
              ))}
              {xmlContent && (
                <div className="mt-2 text-[12px] text-[#888]">
                  XML: {(xmlContent.length / 1024).toFixed(1)}KB
                  {sqlContent && ` | SQL: ${(sqlContent.length / 1024).toFixed(1)}KB`}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-4 mt-8 flex-wrap">
            <button
              onClick={loadSample}
              className="border-[3px] border-black px-6 py-3 font-mono text-[12px] font-bold tracking-[2px] hover:bg-black hover:text-[#F5E642] transition-colors shadow-[4px_4px_0_#000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
            >
              LOAD SAMPLE DATA
            </button>
            {xmlContent && (
              <button
                onClick={runAnalysis}
                className="border-[3px] border-black bg-black text-[#F5E642] px-8 py-3 font-mono text-[12px] font-bold tracking-[2px] hover:bg-[#F5E642] hover:text-black transition-colors shadow-[4px_4px_0_#F5E642]"
              >
                RUN ANALYSIS
              </button>
            )}
          </div>

          {/* How it works */}
          <div className="mt-12 max-w-[680px]">
            <div className="font-mono text-[10px] tracking-[3px] font-bold text-[#888] mb-4">HOW IT WORKS</div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { n: '1', label: 'PARSE XML', desc: 'Oracle Forms XML parsed into structured blocks, triggers, and PL/SQL' },
                { n: '2', label: 'PARALLEL AGENTS', desc: '4 Claude agents run concurrently via LangGraph: triggers, blocks, PL/SQL, risks' },
                { n: '3', label: 'RAG INDEX', desc: 'LlamaIndex indexes all PL/SQL code and queries for critical migration patterns' },
                { n: '4', label: 'MULTI-AGENT REVIEW', desc: 'Autogen Risk Analyst + Migration Strategist conduct structured review' },
              ].map(item => (
                <div key={item.n} className="border-[3px] border-black p-4 shadow-[3px_3px_0_#000]">
                  <div className="font-black text-[28px] text-[#F5E642] bg-black inline-block px-2 mb-2"
                    style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>{item.n}</div>
                  <div className="font-mono text-[10px] font-bold tracking-[1px] mb-1">{item.label}</div>
                  <div className="text-[12px] text-[#666]">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP: ANALYZING */}
      {step === 'analyzing' && (
        <div className="flex-1 px-10 py-12">
          <div className="font-mono text-[10px] tracking-[3px] font-bold text-[#888] mb-2">STEP 02</div>
          <div
            className="text-[clamp(22px,3vw,34px)] font-black mb-6"
            style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}
          >
            RUNNING AI AGENT PIPELINE
          </div>
          <div className="max-w-[520px] space-y-3">
            {[
              { label: 'FORMS XML PARSER', detail: 'Extracting blocks, triggers, program units' },
              { label: 'LANGGRAPH PIPELINE', detail: 'Initializing StateGraph with 5 nodes' },
              { label: 'TRIGGER ANALYZER', detail: 'Claude Opus 4.8 analyzing triggers (parallel)' },
              { label: 'BLOCK ANALYZER', detail: 'Claude Opus 4.8 analyzing fields and schema (parallel)' },
              { label: 'PLSQL CLASSIFIER', detail: 'Claude Opus 4.8 classifying program units (parallel)' },
              { label: 'RISK DETECTOR', detail: 'Claude Opus 4.8 detecting semantic patterns (parallel)' },
              { label: 'LLAMAINDEX', detail: 'Indexing PL/SQL + querying for critical patterns' },
              { label: 'AUTOGEN REVIEW', detail: 'Risk Analyst + Migration Strategist multi-agent' },
            ].map((item, i) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="w-5 h-5 border-[2px] border-black flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-[#F5E642] animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
                </div>
                <div>
                  <span className="font-mono text-[11px] font-bold tracking-[1px]">{item.label}</span>
                  <span className="font-mono text-[11px] text-[#888] ml-3">{item.detail}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 font-mono text-[11px] text-[#888] tracking-[1px]">
            This takes 30-90 seconds. Claude Opus 4.8 with extended thinking...
          </div>
        </div>
      )}

      {/* STEP: REVIEW */}
      {step === 'review' && analysis && (
        <div className="flex-1 px-10 py-10">
          <div className="font-mono text-[10px] tracking-[3px] font-bold text-[#888] mb-2">STEP 03</div>
          <div
            className="text-[clamp(22px,3vw,34px)] font-black mb-8"
            style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}
          >
            ANALYSIS RESULTS
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Automation Score */}
            <div className="border-[3px] border-black shadow-[6px_6px_0_#000] p-6">
              <div className="font-mono text-[10px] tracking-[3px] font-bold text-[#888] mb-2">AUTOMATION SCORE</div>
              <div
                className="font-black leading-none mb-1"
                style={{ fontFamily: "'Arial Black', Arial, sans-serif", fontSize: 'clamp(56px,8vw,80px)', color: scoreColor }}
              >
                {analysis.automationScore}
              </div>
              <div className="font-mono text-[11px] text-[#888]">out of 100</div>
              <div className={`mt-3 px-3 py-1 font-mono text-[10px] font-bold inline-block ${
                analysis.automationScore >= 70 ? 'bg-[#1A6EFF] text-white'
                : analysis.automationScore >= 40 ? 'bg-[#F5E642] text-black'
                : 'bg-[#FF1F5A] text-white'
              }`}>
                {analysis.automationScore >= 70 ? 'GOOD CANDIDATE' : analysis.automationScore >= 40 ? 'PARTIAL REVIEW' : 'MANUAL REQUIRED'}
              </div>
            </div>

            {/* Stats */}
            <div className="border-[3px] border-black shadow-[6px_6px_0_#000] p-6">
              <div className="font-mono text-[10px] tracking-[3px] font-bold text-[#888] mb-4">STATS</div>
              <div className="space-y-2">
                {[
                  { label: 'TRIGGERS', val: analysis.stats.totalTriggers },
                  { label: 'FIELDS', val: analysis.stats.totalFields },
                  { label: 'PL/SQL UNITS', val: analysis.stats.plsqlProcedures },
                  { label: 'TABLES', val: analysis.stats.tablesReferenced.length },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold tracking-[1px]">{s.label}</span>
                    <span className="font-black text-[20px]" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>{s.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent Pipeline Results */}
            <div className="border-[3px] border-[#1A6EFF] shadow-[6px_6px_0_#1A6EFF] p-6">
              <div className="font-mono text-[10px] tracking-[3px] font-bold text-[#1A6EFF] mb-4">PARALLEL AGENTS</div>
              {analysis.parallelAgentResults && Object.entries(analysis.parallelAgentResults).map(([key, val]) => (
                <div key={key} className="mb-2">
                  <div className="font-mono text-[10px] font-bold text-[#888]">{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</div>
                  <div className="text-[12px] text-[#333] truncate">{val || '-'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="border-[3px] border-black shadow-[4px_4px_0_#000] p-5 mb-6 max-w-[860px]">
            <div className="font-mono text-[10px] tracking-[3px] font-bold text-[#888] mb-2">PIPELINE SUMMARY</div>
            <div className="text-[13px] leading-relaxed">{analysis.summary}</div>
          </div>

          {/* Autogen Review */}
          {analysis.autogenReview && (analysis.autogenReview.riskFindings || analysis.autogenReview.migrationStrategy) && (
            <div className="border-[3px] border-black shadow-[4px_4px_0_#F5E642] p-5 mb-6 max-w-[860px] bg-[#fffdf0]">
              <div className="font-mono text-[10px] tracking-[3px] font-bold text-[#888] mb-3">AUTOGEN MULTI-AGENT REVIEW</div>
              {analysis.autogenReview.riskFindings && (
                <div className="mb-3">
                  <div className="font-mono text-[10px] font-bold mb-1">RISK ANALYST FINDINGS</div>
                  <div className="text-[12px] leading-relaxed whitespace-pre-wrap">{analysis.autogenReview.riskFindings.slice(0, 600)}</div>
                </div>
              )}
              {analysis.autogenReview.migrationStrategy && (
                <div>
                  <div className="font-mono text-[10px] font-bold mb-1">MIGRATION STRATEGIST</div>
                  <div className="text-[12px] leading-relaxed">{analysis.autogenReview.migrationStrategy.slice(0, 400)}</div>
                </div>
              )}
            </div>
          )}

          {/* Intervention Items */}
          {analysis.interventionItems.length > 0 && (
            <div className="mb-8 max-w-[860px]">
              <div className="font-mono text-[10px] tracking-[3px] font-bold text-[#888] mb-3">
                INTERVENTION ITEMS ({analysis.interventionItems.length})
              </div>
              <div className="border-[3px] border-black shadow-[4px_4px_0_#000] overflow-hidden">
                {analysis.interventionItems.slice(0, 10).map((item, i) => (
                  <div
                    key={i}
                    className={`flex gap-4 p-3 items-start ${i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'} border-b-[1px] border-[#e0e0e0] last:border-b-0`}
                  >
                    <span className={`px-2 py-0.5 font-mono text-[10px] font-bold flex-shrink-0 mt-0.5 ${SEV_COLOR[item.severity]}`}>
                      {item.severity}
                    </span>
                    <div>
                      <div className="font-bold text-[13px]">{item.description}</div>
                      <div className="text-[12px] text-[#666] mt-0.5">{item.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="max-w-[860px] mb-8">
            <div className="font-mono text-[10px] tracking-[3px] font-bold text-[#888] mb-2">REVIEWER NOTES (OPTIONAL)</div>
            <textarea
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder="Add notes for the AI generator: specific requirements, exceptions, known issues..."
              className="w-full border-[3px] border-black p-4 font-mono text-[13px] resize-none focus:outline-none focus:shadow-[4px_4px_0_#1A6EFF] h-28"
            />
          </div>

          <div className="flex gap-4 flex-wrap">
            <button
              onClick={runGeneration}
              className="border-[3px] border-black bg-black text-[#F5E642] px-8 py-3 font-mono text-[12px] font-bold tracking-[2px] hover:bg-[#F5E642] hover:text-black transition-colors shadow-[4px_4px_0_#F5E642]"
            >
              GENERATE MODERN APP
            </button>
            <button
              onClick={reset}
              className="border-[3px] border-black px-6 py-3 font-mono text-[12px] font-bold tracking-[2px] hover:bg-black hover:text-[#F5E642] transition-colors shadow-[4px_4px_0_#000]"
            >
              START OVER
            </button>
          </div>
        </div>
      )}

      {/* STEP: GENERATING */}
      {step === 'generating' && (
        <div className="flex-1 px-10 py-12">
          <div className="font-mono text-[10px] tracking-[3px] font-bold text-[#888] mb-2">STEP 04</div>
          <div
            className="text-[clamp(22px,3vw,34px)] font-black mb-6"
            style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}
          >
            GENERATING MODERNIZED APP
          </div>
          <div className="font-mono text-[11px] text-[#888] mb-6">
            Claude Opus 4.8 streaming complete self-contained HTML...
          </div>
          <div className="flex items-center gap-6 mb-8">
            <div className="border-[3px] border-black shadow-[4px_4px_0_#000] px-6 py-4">
              <div className="font-mono text-[10px] tracking-[2px] text-[#888] mb-1">CHARS WRITTEN</div>
              <div className="font-black text-[36px]" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>
                {genCharCount.toLocaleString()}
              </div>
            </div>
            <div className="border-[3px] border-black shadow-[4px_4px_0_#000] px-6 py-4">
              <div className="font-mono text-[10px] tracking-[2px] text-[#888] mb-1">LINES</div>
              <div className="font-black text-[36px]" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>
                {generatedHtml.split('\n').length.toLocaleString()}
              </div>
            </div>
          </div>
          {generatedHtml && (
            <div className="max-w-[760px] border-[3px] border-black shadow-[4px_4px_0_#000] bg-[#1a1a1a] p-4">
              <div className="font-mono text-[10px] text-[#888] mb-2">STREAM PREVIEW</div>
              <pre className="font-mono text-[11px] text-[#aaffaa] overflow-x-auto max-h-32">
                {generatedHtml.slice(-400)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* STEP: DONE */}
      {step === 'done' && (
        <div className="flex-1 px-10 py-12">
          <div className="font-mono text-[10px] tracking-[3px] font-bold text-[#888] mb-2">STEP 05</div>
          <div
            className="text-[clamp(22px,3vw,40px)] font-black mb-2"
            style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}
          >
            APPLICATION READY
          </div>
          <div className="font-mono text-[12px] text-[#888] mb-8">
            {genCharCount.toLocaleString()} chars | {generatedHtml.split('\n').length.toLocaleString()} lines | 100% self-contained HTML
          </div>

          <div className="flex gap-4 flex-wrap mb-10">
            <button
              onClick={openPreview}
              className="border-[3px] border-black bg-black text-[#F5E642] px-8 py-4 font-mono text-[13px] font-bold tracking-[2px] hover:bg-[#F5E642] hover:text-black transition-colors shadow-[6px_6px_0_#F5E642]"
            >
              OPEN PREVIEW
            </button>
            <button
              onClick={downloadHtml}
              className="border-[3px] border-black px-8 py-4 font-mono text-[13px] font-bold tracking-[2px] hover:bg-black hover:text-[#F5E642] transition-colors shadow-[6px_6px_0_#000]"
            >
              DOWNLOAD HTML
            </button>
            <button
              onClick={reset}
              className="border-[3px] border-[#aaa] text-[#aaa] px-6 py-4 font-mono text-[13px] font-bold tracking-[2px] hover:border-black hover:text-black transition-colors"
            >
              RUN ANOTHER
            </button>
          </div>

          {/* Summary of what was generated */}
          {analysis && (
            <div className="max-w-[680px] border-[3px] border-black shadow-[4px_4px_0_#000] p-6">
              <div className="font-mono text-[10px] tracking-[3px] font-bold text-[#888] mb-4">PIPELINE SUMMARY</div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'MODULE', val: analysis.modules[0]?.name || '-' },
                  { label: 'AUTOMATION SCORE', val: `${analysis.automationScore}/100` },
                  { label: 'TRIGGERS ANALYZED', val: String(analysis.stats.totalTriggers) },
                  { label: 'FIELDS ANALYZED', val: String(analysis.stats.totalFields) },
                  { label: 'INTERVENTION ITEMS', val: String(analysis.interventionItems.length) },
                  { label: 'HIGH SEVERITY', val: String(analysis.interventionItems.filter(i => i.severity === 'HIGH').length) },
                ].map(s => (
                  <div key={s.label}>
                    <div className="font-mono text-[10px] text-[#888] mb-0.5">{s.label}</div>
                    <div className="font-bold text-[14px]">{s.val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
