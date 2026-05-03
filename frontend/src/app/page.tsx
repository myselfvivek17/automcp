import Link from 'next/link';

const AGENTS = [
  { num: '01', name: 'Input Parser', desc: 'Normalizes OpenAPI 3.0, Swagger 2.0, URL, GitHub repo, file upload, or plain text' },
  { num: '02', name: 'Schema Extractor', desc: 'Extracts endpoints, parameters, and schemas' },
  { num: '03', name: 'Endpoint Mapper', desc: 'Maps each endpoint to an MCP tool definition' },
  { num: '04', name: 'Auth Analyzer', desc: 'Detects authentication type and configures headers' },
  { num: '05', name: 'MCP Translator', desc: 'Formalizes tool schemas with JSON Schema input definitions' },
  { num: '06', name: 'Code Generator', desc: 'Generates secure Python or TypeScript MCP server code' },
  { num: '07', name: 'Validator', desc: 'Reviews generated code for syntax errors and MCP compliance' },
  { num: '08', name: 'Docs Generator', desc: 'Writes README with setup instructions, tool list, and Claude Desktop config' },
];

export default function Home() {
  return (
    <div style={{ background: 'var(--paper)', color: 'var(--ink)' }}>
      {/* HERO */}
      <section style={{ padding: '80px 28px 60px', position: 'relative' }}>
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
            letterSpacing: '-0.045em',
            fontWeight: 600,
          }}>
            Any API, into an<br />
            <span style={{ color: 'var(--accent)' }}>MCP server</span>
            <span className="serif-i" style={{ color: 'var(--ink-3)' }}>,<br className="hidden-md" />in seconds.</span>
          </h1>

          <div style={{
            marginTop: 64, display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)',
            gap: 60, alignItems: 'start',
          }}>
            <p style={{
              margin: 0, fontSize: 19, lineHeight: 1.5, color: 'var(--ink-2)',
              maxWidth: 580, textWrap: 'pretty',
            }}>
              Paste an OpenAPI spec, drop a GitHub URL, or describe your endpoints in prose.
              Eight specialist agents work in sequence — extracting schemas, mapping tools,
              detecting auth, generating idiomatic code — and hand you a production-ready
              server you can wire into Claude Desktop or Cursor.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link href="/generate" className="btn btn-primary" style={{ fontSize: 15 }}>
                  Start a generation
                  <span style={{ marginLeft: 4 }}>→</span>
                </Link>
                <Link href="/settings" className="btn btn-ghost" style={{ fontSize: 15 }}>
                  Configure agents
                </Link>
              </div>
              <div className="mono" style={{
                fontSize: 11, color: 'var(--ink-mute)', letterSpacing: '0.04em',
              }}>
                no sign-up · python &amp; typescript · open source
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PIPELINE — the marquee viz */}
      <section style={{
        padding: '60px 28px 80px',
        borderTop: '1px solid var(--rule)',
        borderBottom: '1px solid var(--rule)',
        background: 'var(--paper-2)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 36 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 10 }}>The pipeline</div>
              <h2 className="serif" style={{ margin: 0, fontSize: 'clamp(32px, 4vw, 48px)', lineHeight: 1.02, letterSpacing: '-0.035em' }}>
                Eight agents.<br />
                <span className="serif-i" style={{ color: 'var(--ink-3)' }}>One handoff each.</span>
              </h2>
            </div>
            <div style={{ maxWidth: 360, color: 'var(--ink-3)', fontSize: 14.5, lineHeight: 1.55 }}>
              Every step is independently observable. Pipe a Granite model into one stage and
              GPT-4 into the next — whatever you set in <em className="serif-i">Agents</em> is what runs.
            </div>
          </div>

          <div className="surface" style={{
            padding: '36px 24px 28px', background: 'var(--paper)',
            border: '1px solid var(--rule-strong)',
          }}>
            {/* Agent Timeline - simplified for now, can be enhanced later */}
            <div style={{ display: 'grid', gap: 0, borderBottom: '1px solid var(--rule)' }}>
              {AGENTS.map((agent, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '24px',
                    padding: '18px 0',
                    borderTop: i === 0 ? 'none' : '1px solid var(--rule)',
                  }}
                >
                  <span className="mono" style={{
                    fontSize: 10.5, color: 'var(--accent)', letterSpacing: '0.08em',
                    minWidth: 28,
                  }}>{agent.num}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', minWidth: 160 }}>{agent.name}</span>
                  <span style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                    {agent.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — three columns */}
      <section style={{ padding: '80px 28px', background: 'var(--paper)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 36 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>How it works</div>
            <h2 className="serif" style={{
              margin: 0, fontSize: 'clamp(32px, 4vw, 48px)', lineHeight: 1.02,
              letterSpacing: '-0.035em',
            }}>
              Three steps. <span className="serif-i" style={{ color: 'var(--ink-3)' }}>No surprises.</span>
            </h2>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 0,
            borderTop: '1px solid var(--rule)',
          }}>
            {[
              { n: '1', title: 'Bring your spec', body: 'OpenAPI 3.0 or Swagger 2.0 JSON, a docs URL, a GitHub repo, a file upload, or a quick prose description — all paths go through the same pipeline.' },
              { n: '2', title: 'Watch agents work', body: 'A WebSocket streams every state transition: parsed schemas, extracted endpoints, detected auth, candidate tool names, finalized code — live, in order.' },
              { n: '3', title: 'Wire it up', body: 'Download the server file plus a generated README. Drop the included config snippet into Claude Desktop or Cursor and restart. That\'s it.' },
            ].map((s) => (
              <div key={s.n} style={{ padding: '36px 28px 36px 0', borderBottom: '1px solid var(--rule)' }}>
                <div className="serif" style={{
                  fontSize: 80, lineHeight: 1, color: 'var(--accent)', marginBottom: 14,
                  letterSpacing: '-0.04em',
                }}>{s.n}</div>
                <h3 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                  {s.title}
                </h3>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--ink-3)', textWrap: 'pretty', maxWidth: 320 }}>
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: '80px 28px',
        background: 'var(--ink)', color: 'var(--paper)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32 }}>
          <h2 className="serif" style={{
            margin: 0, fontSize: 'clamp(36px, 5vw, 68px)', lineHeight: 0.98, letterSpacing: '-0.04em',
            maxWidth: 720, color: 'var(--paper)',
          }}>
            Ready when you are.
            <br />
            <span className="serif-i" style={{ color: 'var(--ink-mute)' }}>Paste a spec; we'll do the rest.</span>
          </h2>
          <Link href="/generate" className="btn" style={{
            background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)',
            padding: '16px 24px', fontSize: 15, textDecoration: 'none',
          }}>
            Open the generator →
          </Link>
        </div>
      </section>

      <footer style={{ padding: '24px 28px', borderTop: '1px solid var(--rule)', background: 'var(--paper)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>AutoMCP</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-mute)', letterSpacing: '0.06em' }}>
               automcp · 2026 · MIT
            </span>
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-mute)', letterSpacing: '0.06em' }}>
            built on the model context protocol
          </div>
        </div>
      </footer>
    </div>
  );
}
