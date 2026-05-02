export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <div className="flex flex-col items-center gap-8">
          <h1 className="text-6xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AutoMCP
          </h1>
          
          <p className="text-xl text-center text-muted-foreground max-w-2xl">
            Automatic MCP Server Generator
          </p>
          
          <p className="text-center text-muted-foreground max-w-3xl">
            Generate production-ready Model Context Protocol servers from API specifications.
            Eliminate manual MCP server development for AI agent integration.
          </p>
          
          <div className="flex gap-4 mt-8">
            <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity">
              Get Started
            </button>
            <button className="px-6 py-3 border border-border rounded-lg font-semibold hover:bg-accent transition-colors">
              View Docs
            </button>
          </div>
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
            <div className="p-6 border border-border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">4 Input Methods</h3>
              <p className="text-sm text-muted-foreground">
                Documentation URLs, OpenAPI specs, manual entry, or natural language
              </p>
            </div>
            
            <div className="p-6 border border-border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Multi-Agent Pipeline</h3>
              <p className="text-sm text-muted-foreground">
                9 specialized agents for intelligent code generation
              </p>
            </div>
            
            <div className="p-6 border border-border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Production Ready</h3>
              <p className="text-sm text-muted-foreground">
                Python & TypeScript output with security and testing built-in
              </p>
            </div>
          </div>
          
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>Phase 1 Complete • Backend & Frontend Initialized</p>
            <p className="mt-2">Ready for Phase 2 Implementation</p>
          </div>
        </div>
      </div>
    </main>
  )
}

// Made with Bob
