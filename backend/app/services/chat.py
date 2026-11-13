import json
from datetime import date
from typing import AsyncIterator

from app.services.analysis import MODEL, async_client

# Chat answers are short, conversational follow-ups; low effort keeps them fast and cheap.
CHAT_EFFORT = "low"
CHAT_MAX_TOKENS = 2000


def build_chat_system(resume_text: str, job_description: str, analysis: dict, role_level: str) -> list[dict]:
    """System prompt holding the resume, JD and finished analysis; cached across chat turns."""
    today = date.today().strftime("%B %d, %Y")
    text = f"""You are the resume coach who just wrote the analysis below: a senior software engineer
and a technical recruiting manager reviewing this candidate for a {role_level}-level SWE/tech role.
The candidate is now asking you follow-up questions about their resume and your analysis.

Today's date is {today}. Experience dated on or before today is past, not future-dated.

Rules:
- Ground every answer in the resume, job description and analysis below. Quote the resume's
  exact text when you refer to it.
- Never invent experience, employers, dates, titles, or metrics that aren't on the resume. When a
  rewrite needs a number the resume doesn't have, use a placeholder like [X%] and say so.
- Stay on topic: this resume, this job description, this analysis, interview prep and the job
  search. Politely redirect anything else.
- Be concise and direct. Write plain text: short paragraphs and "- " bullets, no markdown
  headings, bold, or tables.

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}

YOUR ANALYSIS (JSON):
{json.dumps(analysis, sort_keys=True)}
"""
    return [{"type": "text", "text": text, "cache_control": {"type": "ephemeral"}}]


async def stream_chat(system: list[dict], messages: list[dict]) -> AsyncIterator[str]:
    """Stream the assistant's reply as text chunks. Raises ValueError on a refusal."""
    async with async_client.messages.stream(
        model=MODEL,
        max_tokens=CHAT_MAX_TOKENS,
        system=system,
        messages=messages,
        output_config={"effort": CHAT_EFFORT},
    ) as stream:
        async for text in stream.text_stream:
            yield text
        message = await stream.get_final_message()

    if message.stop_reason == "refusal":
        raise ValueError("Claude declined to answer that question.")
    # A max_tokens cut-off just ends the reply; what was streamed is kept.
