import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            🤖 AutoMCP
          </h1>
          <p className="text-2xl text-gray-600 mb-8">
            Automatically Generate MCP Server Code from API Specifications
          </p>
          <p className="text-lg text-gray-500 max-w-3xl mx-auto mb-12">
            Transform any API into a Model Context Protocol server with our intelligent multi-agent system.
            Support for OpenAPI, Swagger, and natural language descriptions.
          </p>
          
          <Link
            href="/generate"
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            🚀 Start Generating
          </Link>

          <div className="flex items-center justify-center gap-3 mt-5 flex-wrap">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium text-xs border border-blue-200">
              Powered by IBM watsonx.ai Granite
            </span>
            <span className="text-gray-300 hidden sm:inline">·</span>
            <span className="text-xs text-gray-500">5-agent pipeline · Real-time streaming · Python & TypeScript</span>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">🔄</div>
            <h3 className="text-xl font-semibold mb-2">Multi-Agent Pipeline</h3>
            <p className="text-gray-600">
              5 specialized agents work together: Input Parser, Schema Extractor, Endpoint Mapper, Auth Analyzer, and Code Generator
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">Real-Time Visualization</h3>
            <p className="text-gray-600">
              Watch agents work in real-time with live progress updates, status messages, and pipeline visualization
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-xl font-semibold mb-2">Multiple Input Formats</h3>
            <p className="text-gray-600">
              Support for OpenAPI 3.0, Swagger 2.0, and plain text descriptions of your API
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">💻</div>
            <h3 className="text-xl font-semibold mb-2">Multiple Languages</h3>
            <p className="text-gray-600">
              Generate production-ready code in Python or TypeScript with proper async/await patterns
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold mb-2">Monaco Editor</h3>
            <p className="text-gray-600">
              Professional code editor with syntax highlighting, line numbers, and dark theme
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2">AI-Powered (Optional)</h3>
            <p className="text-gray-600">
              Works without API keys using smart templates, or enhance with IBM Watsonx, OpenAI, Claude, or Gemini
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Input Your API Specification</h3>
                <p className="text-gray-600">
                  Paste your OpenAPI/Swagger spec, or describe your API in plain text. Load our sample to see it in action.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Watch Agents Work</h3>
                <p className="text-gray-600">
                  Our multi-agent pipeline processes your spec: parsing input, extracting schemas, mapping endpoints, analyzing auth, and generating code.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Get Production-Ready Code</h3>
                <p className="text-gray-600">
                  Download your complete MCP server code with proper error handling, authentication, and documentation.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-3xl font-bold text-center mb-8">Built With Modern Tech</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold mb-4">Backend</h3>
              <ul className="space-y-2 text-gray-600">
                <li>✅ FastAPI with async/await</li>
                <li>✅ WebSocket for real-time updates</li>
                <li>✅ Multi-agent architecture</li>
                <li>✅ OpenAPI/Swagger parsing</li>
                <li>✅ Multiple AI provider support</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-4">Frontend</h3>
              <ul className="space-y-2 text-gray-600">
                <li>✅ Next.js 14 with App Router</li>
                <li>✅ Monaco Editor integration</li>
                <li>✅ Real-time WebSocket client</li>
                <li>✅ Tailwind CSS styling</li>
                <li>✅ TypeScript for type safety</li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <Link
            href="/generate"
            className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-12 py-5 rounded-lg text-2xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Try It Now - It's Free! 🎉
          </Link>
          <p className="text-gray-500 mt-4">
            No sign-up required • Works without API keys • Open source
          </p>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
