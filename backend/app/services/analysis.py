import anthropic
import os
import json
from datetime import date
from typing import AsyncIterator
import jiter
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
async_client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# Chosen by benchmark (backend/scripts/benchmark_models.py): ~2x faster and cheaper than
# claude-sonnet-4-6 with better grounding. Higher effort adds thinking time before output.
MODEL = "claude-sonnet-5"
EFFORT = "medium"
MAX_TOKENS = 16000

# Models that accept output_config.format (structured outputs) / output_config.effort.
STRUCTURED_OUTPUT_MODELS = {"claude-sonnet-5", "claude-opus-5", "claude-opus-5-5", "claude-haiku-4-5"}
NO_EFFORT_MODELS = {"claude-haiku-4-5"}

_STR_LIST = {"type": "array", "items": {"type": "string"}}


def _obj(properties: dict) -> dict:
    return {
        "type": "object",
        "properties": properties,
        "required": list(properties),
        "additionalProperties": False,
    }


_MISSING = _obj({"missing_from_jd": _STR_LIST})

# Property order is the order Claude writes the sections in, so it matches the order
# Analysis.tsx renders them: headline first, the long improvements list last.
ANALYSIS_SCHEMA = _obj({
    "overall_score": {"type": "integer"},
    "hiring_recommendation": {"type": "string", "enum": ["strong_yes", "yes", "maybe", "no", "strong_no"]},
    "recruiter_first_impression": {"type": "string"},
    "hiring_recommendation_reason": {"type": "string"},
    "tailored_summary": {"type": "string"},
    "scores": _obj({
        key: {"type": "integer"}
        for key in (
            "experience_relevance", "technical_skills", "impact_and_metrics",
            "system_design_signals", "cs_fundamentals", "project_quality",
            "structure_and_readability", "ats_compatibility", "role_level_fit",
        )
    }),
    "strengths": _STR_LIST,
    "weaknesses": _STR_LIST,
    "green_flags": _STR_LIST,
    "red_flags": _STR_LIST,
    "keyword_analysis": _obj({"missing_critical_keywords": _STR_LIST}),
    "tech_stack_analysis": _obj({
        "languages": _MISSING,
        "frameworks_and_libraries": _MISSING,
        "tools_and_platforms": _MISSING,
    }),
    "ats_analysis": _obj({
        "formatting_issues": _STR_LIST,
        "keyword_density_ok": {"type": "boolean"},
        "recommended_section_order": _STR_LIST,
        "file_format_notes": {"type": "string"},
    }),
    "interview_readiness": _obj({
        "technical_screen_ready": {"type": "boolean"},
        "system_design_ready": {"type": "boolean"},
        "behavioral_ready": {"type": "boolean"},
        "notes": {"type": "string"},
    }),
    "improvements": {
        "type": "array",
        "items": _obj({
            "priority": {"type": "string", "enum": ["high", "medium", "low"]},
            "category": {
                "type": "string",
                "enum": ["Experience", "Skills", "Impact", "Projects", "Structure", "ATS",
                         "CS Fundamentals", "Role Fit"],
            },
            "suggestion": {"type": "string"},
            "reference_text": {"type": "string"},
            "example_rewrite": {"type": "string"},
        }),
    },
})


def build_prompt(resume_text: str, job_description: str, role_level: str = "intern") -> str:
    """Build the analysis prompt, which pins the exact output JSON schema."""
    today = date.today().strftime("%B %d, %Y")
    return f"""
    You are a panel of two experts: (1) a senior software engineer with 15+ years of experience at
    FAANG-tier companies who has reviewed thousands of technical resumes, and (2) a technical
    recruiting manager at a Fortune 100 tech company who understands ATS systems deeply.
    Analyze the resume below against the job description for a {role_level}-level SWE/tech role.
    Be ruthlessly honest — hiring bars at top companies are high.
    Today's date is {today}. Experience dated on or before today is past, not future-dated.
    Never suggest changing the candidate's dates, employers, or titles to something that
    isn't on the resume.
    RESUME:
    {resume_text}
    JOB DESCRIPTION:
    {job_description}
    ROLE LEVEL CONTEXT:
    - intern/entry: Focus on projects, coursework, fundamentals, learning trajectory
    - mid: Expect ownership of features, some system design exposure, real-world impact
    - senior: Expect architectural decisions, cross-team influence, measurable business impact
    - staff/principal: Expect org-wide impact, technical vision, mentorship at scale
    Analyze across ALL of the following dimensions, then respond ONLY with a JSON object
    in exactly the format below. No preamble, no markdown fences, no trailing text.
    For "tailored_summary", write a 2-3 sentence professional-summary line, tailored to this
    job description, that the candidate could paste at the top of their resume.
    {{
        "overall_score": <0-100>,
        "hiring_recommendation": "strong_yes|yes|maybe|no|strong_no",
        "recruiter_first_impression": "2-3 sentence cold read: what a recruiter sees in the first 10 seconds",
        "hiring_recommendation_reason": "1-2 sentences justifying the hiring recommendation",
        "tailored_summary": "2-3 sentence professional summary tailored to the job description",
        "scores": {{
            "experience_relevance": <0-100>,
            "technical_skills": <0-100>,
            "impact_and_metrics": <0-100>,
            "system_design_signals": <0-100>,
            "cs_fundamentals": <0-100>,
            "project_quality": <0-100>,
            "structure_and_readability": <0-100>,
            "ats_compatibility": <0-100>,
            "role_level_fit": <0-100>
        }},
        "strengths": ["strength1", "strength2"],
        "weaknesses": ["weakness1", "weakness2"],
        "green_flags": ["green flag 1", "green flag 2"],
        "red_flags": ["red flag 1", "red flag 2"],
        "keyword_analysis": {{
            "missing_critical_keywords": ["keyword1", "keyword2"]
        }},
        "tech_stack_analysis": {{
            "languages": {{
                "missing_from_jd": ["lang1"]
            }},
            "frameworks_and_libraries": {{
                "missing_from_jd": ["framework1"]
            }},
            "tools_and_platforms": {{
                "missing_from_jd": ["tool1"]
            }}
        }},
        "ats_analysis": {{
            "formatting_issues": ["issue1"],
            "keyword_density_ok": true,
            "recommended_section_order": ["Summary", "Skills", "Experience", "Projects", "Education"],
            "file_format_notes": "PDF preferred; avoid tables/columns/headers in footers"
        }},
        "interview_readiness": {{
            "technical_screen_ready": true,
            "system_design_ready": true,
            "behavioral_ready": true,
            "notes": "brief note on interview readiness"
        }},
        "improvements": [
            {{
                "priority": "high|medium|low",
                "category": "Experience|Skills|Impact|Projects|Structure|ATS|CS Fundamentals|Role Fit",
                "suggestion": "specific, actionable improvement",
                "reference_text": "exact text from resume this applies to, or empty string if general",
                "example_rewrite": "if applicable, show a better version of the reference_text"
            }}
        ]
    }}
    """


def request_params(resume_text: str, job_description: str, role_level: str = "intern",
                   model: str = MODEL, effort: str | None = EFFORT) -> dict:
    """Messages API params for an analysis request; shared by the app and the benchmark."""
    output_config = {}
    if model in STRUCTURED_OUTPUT_MODELS:
        output_config["format"] = {"type": "json_schema", "schema": ANALYSIS_SCHEMA}
    if effort and model not in NO_EFFORT_MODELS:
        output_config["effort"] = effort
    params = {
        "model": model,
        "max_tokens": MAX_TOKENS,
        "messages": [
            {"role": "user", "content": build_prompt(resume_text, job_description, role_level)}
        ],
    }
    if output_config:
        params["output_config"] = output_config
    return params


def parse_analysis(response_text: str) -> dict:
    """Strip optional ```json fences and parse Claude's response as JSON."""
    response_text = response_text.strip()
    if response_text.startswith("```"):
        response_text = response_text.split("```")[1]
        if response_text.startswith("json"):
            response_text = response_text[4:]
    response_text = response_text.strip()
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        raise ValueError(f"Claude returned invalid JSON: {response_text[:200]}")


def _check_stop_reason(stop_reason: str | None) -> None:
    if stop_reason == "refusal":
        raise ValueError("Claude declined to analyze this resume.")
    if stop_reason == "max_tokens":
        raise ValueError("Claude's analysis was cut off before it finished.")


def _response_text(message) -> str:
    # Thinking blocks come before the answer, so collect only the text blocks.
    return "".join(block.text for block in message.content if block.type == "text")


def analyze_resume(resume_text: str, job_description: str, role_level: str = "intern") -> dict:
    """
    Analyze a resume against a job description with deep SWE/tech-specific insight.

    Args:
        resume_text: Raw resume text
        job_description: Job description text
        role_level: "intern", "entry", "mid", "senior", "staff", "principal"
    """
    message = client.messages.create(**request_params(resume_text, job_description, role_level))
    _check_stop_reason(message.stop_reason)
    return parse_analysis(_response_text(message))


async def stream_analysis(
    resume_text: str, job_description: str, role_level: str = "intern"
) -> AsyncIterator[tuple[str, object]]:
    """
    Stream an analysis section by section.

    Yields ("section", (key, value)) as soon as each top-level field of the JSON is complete,
    then ("done", analysis) with the full parsed analysis. A list field that is still being
    written (e.g. improvements) is also yielded each time another item finishes, so a
    key can arrive more than once with a growing list.
    """
    buffer = ""
    sent: set[str] = set()
    partial_list_len = 0
    params = request_params(resume_text, job_description, role_level)
    async with async_client.messages.stream(**params) as stream:
        async for text in stream.text_stream:
            buffer += text
            try:
                partial = jiter.from_json(buffer.encode(), partial_mode="trailing-strings")
            except ValueError:
                continue
            if not isinstance(partial, dict):
                continue
            # Every key except the last one being written is complete.
            keys = list(partial)
            for key in keys[:-1]:
                if key not in sent:
                    sent.add(key)
                    partial_list_len = 0
                    yield "section", (key, partial[key])
            # In the list being written, every item except the last one is complete.
            if keys and isinstance(partial[keys[-1]], list):
                done_items = partial[keys[-1]][:-1]
                if len(done_items) > partial_list_len:
                    partial_list_len = len(done_items)
                    yield "section", (keys[-1], done_items)
        message = await stream.get_final_message()

    _check_stop_reason(message.stop_reason)
    analysis = parse_analysis(_response_text(message))
    for key, value in analysis.items():
        if key not in sent:
            yield "section", (key, value)
    yield "done", analysis
