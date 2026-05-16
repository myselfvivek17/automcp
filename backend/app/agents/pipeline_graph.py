"""Builds and compiles the LangGraph StateGraph for the 8-agent pipeline."""
from langgraph.graph import StateGraph, END


def build_pipeline(agents: list):
    """
    agents: list of 8 agent instances in pipeline order:
        [InputParser, SchemaExtractor, EndpointMapper, AuthAnalyzer,
         MCPTranslator, CodeGenerator, Validator, DocsGenerator]
    Returns a compiled LangGraph graph.
    """
    NODE_NAMES = [
        "input_parser",
        "schema_extractor",
        "endpoint_mapper",
        "auth_analyzer",
        "mcp_translator",
        "code_generator",
        "validator",
        "docs_generator",
    ]
    assert len(agents) == len(NODE_NAMES), f"Expected 8 agents, got {len(agents)}"

    graph = StateGraph(dict)

    for name, agent in zip(NODE_NAMES, agents):
        graph.add_node(name, agent)

    graph.set_entry_point(NODE_NAMES[0])
    for i in range(len(NODE_NAMES) - 1):
        graph.add_edge(NODE_NAMES[i], NODE_NAMES[i + 1])
    graph.add_edge(NODE_NAMES[-1], END)

    return graph.compile()
