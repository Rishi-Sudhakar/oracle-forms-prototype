import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'

const app = express()
app.use(cors())
app.use(express.json({ limit: '15mb' }))

const client = new Anthropic()

function extractJson(text) {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1].trim()) } catch (_) {}
  }
  const jsonStart = text.indexOf('{')
  const jsonEnd = text.lastIndexOf('}')
  if (jsonStart !== -1 && jsonEnd !== -1) {
    try { return JSON.parse(text.slice(jsonStart, jsonEnd + 1)) } catch (_) {}
  }
  throw new Error('Could not parse JSON from model response. Raw: ' + text.slice(0, 500))
}

app.post('/api/analyze', async (req, res) => {
  const { xmlContent, sqlContent } = req.body
  if (!xmlContent) return res.status(400).json({ error: 'xmlContent required' })

  const userMsg = `Analyze the Oracle Forms XML and database SQL below. Return ONLY a valid JSON object matching this exact shape (no markdown, no explanation):

{
  "modules": [{"name": "string", "type": "FORM", "triggerCount": 0, "fieldCount": 0}],
  "automationScore": 72,
  "interventionItems": [{"severity": "HIGH", "description": "short title", "reason": "explanation"}],
  "stats": {"totalTriggers": 0, "totalFields": 0, "plsqlProcedures": 0, "tablesReferenced": ["TABLE_NAME"]},
  "summary": "one concise paragraph"
}

automationScore 0-100: be strict. Only give high scores if logic is simple and structurally consistent.
HIGH severity: runtime-dependent branching, SYNCHRONIZE calls, session-state side effects, :SYSTEM.* references, complex auth.
MEDIUM severity: moderate complexity triggers, implicit cursor usage, multi-block coordination.
LOW severity: cosmetic or style-level items.

--- FORMS XML ---
${xmlContent.slice(0, 60000)}

--- DATABASE SQL ---
${(sqlContent || 'No SQL provided.').slice(0, 20000)}`

  try {
    const stream = client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content: userMsg }],
    })
    const msg = await stream.finalMessage()
    const text = msg.content.find(c => c.type === 'text')?.text ?? ''
    const result = extractJson(text)
    res.json(result)
  } catch (err) {
    console.error('[analyze]', err)
    res.status(500).json({ error: String(err.message) })
  }
})

app.post('/api/modernize', async (req, res) => {
  const { xmlContent, sqlContent, analysis, comments } = req.body
  if (!xmlContent || !analysis) return res.status(400).json({ error: 'xmlContent and analysis required' })

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.flushHeaders()

  const highItems = (analysis.interventionItems || []).filter(i => i.severity === 'HIGH')

  const userMsg = `You are modernizing an Oracle Forms application. Generate a complete self-contained HTML web application.

ANALYSIS RESULTS:
- Automation score: ${analysis.automationScore}/100
- Summary: ${analysis.summary}
- Modules: ${(analysis.modules || []).map(m => m.name).join(', ')}
- HIGH severity items (must show warning banner):
${highItems.length ? highItems.map(i => `  * ${i.description}: ${i.reason}`).join('\n') : '  (none)'}

HUMAN REVIEWER NOTES:
${comments?.trim() || 'No notes provided.'}

FORMS XML (first 40000 chars):
${xmlContent.slice(0, 40000)}

DATABASE SCHEMA SQL:
${(sqlContent || '').slice(0, 15000)}

Generate a complete single-page HTML application:
1. Self-contained: all CSS and JS must be inline, no external CDNs or imports
2. Replicate every form block, field, button, and navigation element from the XML
3. Implement trigger validation logic as JavaScript (email format checks, required fields, min/max values)
4. Include a sticky banner at the very top: "MODERNIZED FROM ORACLE FORMS BY AI AGENT"
5. If there are HIGH severity items, show a dismissible yellow warning panel below the banner listing each one
6. Clean, professional UI with sidebar navigation if multiple modules exist
7. Submit buttons should show a success/error message using JavaScript (no backend calls needed)
8. The app should feel like a real working web application, not a static mockup

Return ONLY the complete HTML starting with <!DOCTYPE html>. No explanation, no markdown fences.`

  try {
    const stream = client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 32000,
      thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content: userMsg }],
    })

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        res.write(chunk.delta.text)
      }
    }
    res.end()
  } catch (err) {
    console.error('[modernize]', err)
    if (!res.headersSent) res.status(500).json({ error: String(err.message) })
    else res.end()
  }
})

app.listen(3001, () => console.log('API server on http://localhost:3001'))
