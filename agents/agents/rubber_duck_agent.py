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
    """Render the system prompt with injected project context."""
    return SYSTEM_PROMPT.format(
        project_name=ctx.project_name or "this project",
        scenario_description=ctx.scenario_description or "personal shopping",
        products_summary=_summarize_products(ctx),
    )
