import Link from 'next/link';

const AGENTS = [
  { num: '01', name: 'Input Parser', desc: 'Normalizes OpenAPI 3.0, Swagger 2.0, and plain text' },
  { num: '02', name: 'Schema Extractor', desc: 'Extracts endpoints, parameters, and schemas' },
  { num: '03', name: 'Endpoint Mapper', desc: 'Maps each endpoint to an MCP tool definition' },
  { num: '04', name: 'Auth Analyzer', desc: 'Detects authentication type and configures headers' },
  { num: '05', name: 'Code Generator', desc: 'Generates secure Python or TypeScript MCP server code' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Hero */}
      <div className="bg-slate-900 dark:bg-slate-950 px-6 py-24 md:py-32 border-b border-slate-800">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-blue-400 mb-8">
            Powered by IBM watsonx.ai Granite
          </p>
          <h1 className="text-6xl md:text-8xl font-black text-slate-50 tracking-tight leading-none mb-6">
            API to MCP<br className="hidden md:block" /> in seconds.
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mb-10">
            Paste any OpenAPI spec. Watch 5 AI agents transform it into a production-ready MCP server, live.
          </p>
          <div className="flex items-center gap-6 flex-wrap">
            <Link
              href="/generate"
              className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-500 transition-colors"
            >
              Start Generating
            </Link>
            <span className="text-sm text-slate-500">
              No sign-up required · Python and TypeScript output
            </span>
          </div>
        </div>
      </div>

      {/* 5-Agent Pipeline */}
      <div className="px-6 py-20 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-12">
            5-Agent Pipeline
          </p>
          <div>
            {AGENTS.map((agent, i) => (
              <div
                key={i}
                className="flex items-baseline gap-8 py-5 border-t border-slate-100 dark:border-slate-800 group"
              >
                <span className="text-3xl font-black text-slate-200 dark:text-slate-700 tabular-nums w-14 flex-shrink-0 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                  {agent.num}
                </span>
                <div className="flex items-baseline gap-6 flex-wrap min-w-0">
                  <span className="text-lg font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">{agent.name}</span>
                  <span className="text-slate-500 dark:text-slate-400 text-sm">{agent.desc}</span>
                </div>
              </div>
            ))}
            <div className="border-t border-slate-100 dark:border-slate-800" />
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="px-6 py-20 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-12">
            How It Works
          </p>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                n: '1',
                title: 'Paste your spec',
                body: 'OpenAPI 3.0, Swagger 2.0, or plain text. Click Load Sample to see it in action.',
              },
              {
                n: '2',
                title: 'Watch agents work',
                body: 'Each agent runs in sequence with real-time progress updates over WebSocket.',
              },
              {
                n: '3',
                title: 'Download and run',
                body: 'Get a complete MCP server with error handling, auth config, and a one-click setup guide.',
              },
            ].map(({ n, title, body }) => (
              <div key={n}>
                <p className="text-5xl font-black text-slate-100 dark:text-slate-800 mb-4">{n}</p>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-slate-900 dark:bg-slate-950 px-6 py-20 border-t border-slate-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-6">
          <div>
            <h2 className="text-3xl font-bold text-slate-50 mb-2">Ready to generate?</h2>
            <p className="text-slate-400 text-sm">No sign-up · Works without API keys · Open source</p>
          </div>
          <Link
            href="/generate"
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-500 transition-colors whitespace-nowrap"
          >
            Open Generator
          </Link>
        </div>
      </div>
    </div>
  );
}
