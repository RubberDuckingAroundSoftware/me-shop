"""Rubber Duck LangGraph graph.

A single conversational node in v1. The StateGraph structure exists so tool-use
nodes and routing can be added later without restructuring.
"""

from __future__ import annotations

from langgraph.graph import END, START, MessagesState, StateGraph

from graphs.base import get_checkpointer


def build_rubber_duck_graph(llm):
    """Compile the rubber-duck graph around a given chat model."""

    def chat_node(state: MessagesState):
        response = llm.invoke(state["messages"])
        return {"messages": [response]}

    graph = StateGraph(MessagesState)
    graph.add_node("chat", chat_node)
    graph.add_edge(START, "chat")
    graph.add_edge("chat", END)

    return graph.compile(checkpointer=get_checkpointer())
