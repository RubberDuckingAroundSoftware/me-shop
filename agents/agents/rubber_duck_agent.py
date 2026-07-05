"""Rubber Duck agent — system prompt and project-context assembly."""

from __future__ import annotations

from models import ProjectContext

SYSTEM_PROMPT = """You are a helpful shopping companion in meShop. You're assisting with a project
called "{project_name}" which is about: {scenario_description}.

The user has these items in their reverse catalog:
{products_summary}

Be concise, knowledgeable, and helpful. You're a rubber duck — help the user
think through their shopping decisions. Be opinionated when asked, and honest
about what you don't know."""


# General Shopping is a blank canvas — it doesn't assume a domain. The prompt
# discovers what the user cares about from their catalog and adapts to it.
GENERAL_SYSTEM_PROMPT = """You are a helpful shopping companion in meShop. You're assisting
with a project called "{project_name}".

This is a general shopping project — the user is tracking items they want to find or buy.
Here's what they're currently looking for:

{products_summary}

Adapt to whatever they're shopping for. If they're hunting for vintage cameras, become a
camera expert. If they're building a PC, reason about compatibility and value. If they're
furnishing a room, think about aesthetics and dimensions.

Be concise, knowledgeable, and opinionated when asked. Help them think through decisions,
compare options, and decide when to buy vs. wait. Be honest about what you don't know."""


def _summarize_products(ctx: ProjectContext) -> str:
    if not ctx.products:
        return "(no items yet)"
    lines = []
    for p in ctx.products:
        details = ", ".join(
            f"{k}: {v}" for k, v in p.metadata.items() if v
        )
        suffix = f" — {details}" if details else ""
        lines.append(f"- {p.name} [{p.status}]{suffix}")
    return "\n".join(lines)


def build_system_prompt(ctx: ProjectContext) -> str:
    """Render the system prompt with injected project context.

    General Shopping projects use an adaptive prompt that discovers the user's
    domain from their catalog rather than assuming one.
    """
    if ctx.scenario_id == "general":
        return GENERAL_SYSTEM_PROMPT.format(
            project_name=ctx.project_name or "this project",
            products_summary=_summarize_products(ctx),
        )
    return SYSTEM_PROMPT.format(
        project_name=ctx.project_name or "this project",
        scenario_description=ctx.scenario_description or "personal shopping",
        products_summary=_summarize_products(ctx),
    )
