"""Pydantic request/response models for the agent service API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class Message(BaseModel):
    role: str
    content: str


class ProductContext(BaseModel):
    name: str
    status: str = "hunting"
    metadata: dict = Field(default_factory=dict)


class ProjectContext(BaseModel):
    project_name: str = "this project"
    scenario_id: str = ""
    scenario_description: str = ""
    products: list[ProductContext] = Field(default_factory=list)


class ChatRequest(BaseModel):
    messages: list[Message]
    project_context: ProjectContext = Field(default_factory=ProjectContext)
    conversation_id: str | None = None
    thread_id: str | None = None
    user_id: str | None = None


class LLMConfigModel(BaseModel):
    provider: str
    base_url: str
    api_key: str | None = None
    model: str


class HealthResponse(BaseModel):
    status: str
    provider: str
    model: str
    llm: str  # "reachable" | "unreachable" | "disabled"
    detail: str | None = None


class ExtractRequest(BaseModel):
    url: str
    scenario_id: str
    scenario_fields: list[dict] = Field(default_factory=list)
    user_id: str | None = None


class ExtractResponse(BaseModel):
    product: dict
    extraction_method: str  # "structured_data" | "structured_data+llm" | "llm_only"
    raw_extracted: dict  # raw extraction before mapping, for transparency
    source_url: str


class ExtractRecipeRequest(BaseModel):
    source: str  # "url" | "text" | "file"
    url: str | None = None  # when source == "url"
    text: str | None = None  # when source == "text" or "file" (pre-extracted text)


class ExtractRecipeResponse(BaseModel):
    recipe: dict
    extraction_method: str  # "structured_data" | "structured_data+llm" | "llm_only"
    raw_extracted: dict  # raw extraction before mapping, for transparency
    source_url: str  # empty for text/file sources
