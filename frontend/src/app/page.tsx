import Link from 'next/link';
import { AgentTimeline } from '@/components/AgentTimeline';

const AGENTS = [
  { num: '01', name: 'Input Parser',     desc: 'Normalizes OpenAPI, Swagger, URLs, repos, files, or plain prose into a single canonical spec.' },
  { num: '02', name: 'Schema Extractor', desc: 'Walks the spec to extract endpoints, parameters, and request/response schemas.' },
  { num: '03', name: 'Endpoint Mapper',  desc: 'Maps every endpoint to a typed MCP tool with a stable name and description.' },
  { num: '04', name: 'Auth Analyzer',    desc: 'Detects authentication flow and configures secure header injection.' },
  { num: '05', name: 'MCP Translator',   desc: 'Formalizes tool definitions with JSON Schema for safe model invocation.' },
  { num: '06', name: 'Code Generator',   desc: 'Emits Python or TypeScript MCP server code with idiomatic error handling.' },
  { num: '07', name: 'Validator',        desc: 'Reviews emitted code for syntax, lints, and MCP-spec compliance.' },
  { num: '08', name: 'Docs Generator',   desc: 'Writes README + Claude Desktop / Cursor configs and quickstart commands.' },
];

export default function Home() {
  return (
    <div style={{ background: 'var(--paper)', color: 'var(--ink)' }}>
      {/* HERO */}
      <section style={{ padding: '80px 28px 60px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="eyebrow eyebrow-accent" style={{ marginBottom: 28 }}>
            <span style={{
              display: 'inline-block', width: 6, height: 6, borderRadius: 3,
              background: 'var(--accent)', marginRight: 8, verticalAlign: 'middle',
              animation: 'pulse-dot 1.6s ease-in-out infinite',
            }} />
            Powered by IBM watsonx.ai · Granite 3.1
          </div>

          <h1 className="serif" style={{
            margin: 0, fontSize: 'clamp(48px, 7.5vw, 116px)', lineHeight: 0.98,
            letterSpacing: '-0.045em', fontWeight: 600,
          }}>
            Any API, into an<br />
            <span style={{ color: 'var(--accent)' }}>MCP server</span>
            <span className="serif-i" style={{ color: 'var(--ink-3)' }}>,<br />in seconds.</span>
          </h1>

          <div style={{
            marginTop: 64, display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)',
            gap: 60, alignItems: 'start',
          }}>
            <p style={{ margin: 0, fontSize: 19, lineHeight: 1.5, color: 'var(--ink-2)', maxWidth: 580 }}>
              Paste an OpenAPI spec, drop a GitHub URL, or describe your endpoints in prose.
              Eight specialist agents work in sequence — extracting schemas, mapping tools,
              detecting auth, generating idiomatic code — and hand you a production-ready
              server you can wire into Claude Desktop or Cursor.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link href="/generate" className="btn btn-primary" style={{ fontSize: 15 }}>
                  Start a generation <span style={{ marginLeft: 4 }}>→</span>
                </Link>
                <Link href="/settings" className="btn btn-ghost" style={{ fontSize: 15 }}>
                  Configure agents
                </Link>
              </div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-mute)', letterSpacing: '0.04em' }}>
                no sign-up · python &amp; typescript · open source
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PIPELINE */}
      <section style={{ padding: '60px 28px 80px', borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)', background: 'var(--paper-2)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 36 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 10 }}>The pipeline</div>
              <h2 className="serif" style={{ margin: 0, fontSize: 'clamp(32px, 4vw, 48px)', lineHeight: 1.02, letterSpacing: '-0.035em' }}>
                Eight agents.<br /><span className="serif-i" style={{ color: 'var(--ink-3)' }}>One handoff each.</span>
              </h2>
            </div>
            <p style={{ maxWidth: 360, margin: 0, color: 'var(--ink-3)', fontSize: 14.5, lineHeight: 1.55 }}>
              Every step is independently observable. Pipe a Granite model into one stage and
              GPT-4 into the next — whatever you set in <em className="serif-i">Agents</em> is what runs.
            </p>
          </div>

          <div className="surface" style={{ padding: '36px 24px 28px', background: 'var(--paper)', border: '1px solid var(--rule-strong)' }}>
            <AgentTimeline completed={[0, 1, 2, 3, 4, 5, 6, 7]} />
          </div>

          <div style={{
            marginTop: 28, display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            border: '1px solid var(--rule)', borderRadius: 'var(--radius-lg)',
            overflow: 'hidden', background: 'var(--paper)',
          }}>
            {AGENTS.map((a) => (
              <div key={a.num} style={{
                padding: '18px 20px',
                borderRight: '1px solid var(--rule)',
                borderBottom: '1px solid var(--rule)',
                minHeight: 130,
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--accent)', letterSpacing: '0.08em' }}>{a.num}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{a.name}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-3)' }}>{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '80px 28px', background: 'var(--paper)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 36 }}>
            <div className="eyebrow eyebrow-accent" style={{ marginBottom: 14 }}>How it works</div>
            <h2 className="serif" style={{ margin: 0, fontSize: 'clamp(30px, 4vw, 48px)', lineHeight: 1.02, letterSpacing: '-0.035em' }}>
              Three steps. <span className="serif-i" style={{ color: 'var(--ink-3)' }}>No surprises.</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', borderTop: '1px solid var(--rule)' }}>
            {[
              { n: '1', title: 'Bring your spec', body: 'OpenAPI 3.0 or Swagger 2.0 JSON, a docs URL, a GitHub repo, a file upload, or a quick prose description — all paths go through the same pipeline.' },
              { n: '2', title: 'Watch agents work', body: 'A WebSocket streams every state transition: parsed schemas, extracted endpoints, detected auth, candidate tool names, finalized code — live, in order.' },
              { n: '3', title: 'Wire it up', body: "Download the server file plus a generated README. Drop the included config snippet into Claude Desktop or Cursor and restart. That's it." },
            ].map((s) => (
              <div key={s.n} style={{ padding: '36px 28px 36px 0', borderBottom: '1px solid var(--rule)' }}>
                <div className="serif" style={{ fontSize: 80, lineHeight: 1, color: 'var(--accent)', marginBottom: 14, letterSpacing: '-0.04em' }}>{s.n}</div>
                <h3 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>{s.title}</h3>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--ink-3)', maxWidth: 320 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ padding: '60px 28px 100px', background: 'var(--paper-2)', borderTop: '1px solid var(--rule)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="eyebrow" style={{ marginBottom: 24 }}>Built for the spec</div>
          <p className="serif" style={{
            margin: 0, fontSize: 'clamp(26px, 3.2vw, 40px)', lineHeight: 1.18,
            letterSpacing: '-0.03em', fontWeight: 500,
          }}>
            Output adheres to the Model Context Protocol — strict JSON Schema for inputs,
            structured tool descriptions, and a clean stdio transport.
            <span className="serif-i" style={{ color: 'var(--ink-3)' }}> No glue code required.</span>
          </p>
          <div style={{ marginTop: 28, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'Avg. generation', value: '11s' },
              { label: 'Lines of glue you write', value: '0' },
              { label: 'Languages', value: 'Py · TS' },
              { label: 'Largest spec tested', value: '312 ep.' },
            ].map(s => (
              <div key={s.label} style={{ minWidth: 140 }}>
                <div className="serif" style={{ fontSize: 36, lineHeight: 1, color: 'var(--accent)', letterSpacing: '-0.02em' }}>{s.value}</div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 6 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 28px', background: 'var(--ink)', color: 'var(--paper)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32 }}>
          <h2 className="serif" style={{
            margin: 0, fontSize: 'clamp(36px, 5vw, 68px)', lineHeight: 0.98, letterSpacing: '-0.04em',
            maxWidth: 720, color: 'var(--paper)',
          }}>
            Ready when you are.<br />
            <span className="serif-i" style={{ color: 'var(--ink-mute)' }}>Paste a spec; we&apos;ll do the rest.</span>
          </h2>
          <Link href="/generate" className="btn" style={{
            background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)',
            padding: '16px 24px', fontSize: 15,
          }}>
            Open the generator →
          </Link>
        </div>
      </section>

      <footer style={{ padding: '24px 28px', borderTop: '1px solid var(--rule)', background: 'var(--paper)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width={18} height={10} viewBox="0 0 44 24" aria-hidden="true" style={{ color: 'var(--ink-mute)' }}>
              <line x1="4" y1="12" x2="40" y2="12" stroke="currentColor" strokeWidth="1.2" strokeDasharray="1.5 2.5" />
              {[6, 14, 22, 30, 38].map((cx, i) => <circle key={i} cx={cx} cy="12" r={i === 2 ? 3.4 : 2.4} fill="currentColor" />)}
            </svg>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-mute)', letterSpacing: '0.06em' }}>automcp · 2026 · MIT</span>
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-mute)', letterSpacing: '0.06em' }}>
            built on the model context protocol
          </div>
        </div>
      </footer>
    </div>
  );
}
