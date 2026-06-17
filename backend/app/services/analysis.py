import anthropic
import os
import json
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def analyze_resume(resume_text: str, job_description: str, role_level: str = "intern") -> dict:
    """
    Analyze a resume against a job description with deep SWE/tech-specific insight.
    
    Args:
        resume_text: Raw resume text
        job_description: Job description text
        role_level: "intern", "entry", "mid", "senior", "staff", "principal"
    """
    prompt = f"""
    You are a panel of two experts: (1) a senior software engineer with 15+ years of experience at
    FAANG-tier companies who has reviewed thousands of technical resumes, and (2) a technical
    recruiting manager at a Fortune 100 tech company who understands ATS systems deeply.
    Analyze the resume below against the job description for a {role_level}-level SWE/tech role.
    Be ruthlessly honest — hiring bars at top companies are high.
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
        "tailored_summary": "2-3 sentence professional summary tailored to the job description",
        "red_flags": ["red flag 1", "red flag 2"],
        "green_flags": ["green flag 1", "green flag 2"],
        "strengths": ["strength1", "strength2"],
        "weaknesses": ["weakness1", "weakness2"],
        "improvements": [
            {{
                "priority": "high|medium|low",
                "category": "Experience|Skills|Impact|Projects|Structure|ATS|CS Fundamentals|Role Fit",
                "suggestion": "specific, actionable improvement",
                "reference_text": "exact text from resume this applies to, or empty string if general",
                "example_rewrite": "if applicable, show a better version of the reference_text"
            }}
        ],
        "interview_readiness": {{
            "technical_screen_ready": true,
            "system_design_ready": true,
            "behavioral_ready": true,
            "notes": "brief note on interview readiness"
        }},
        "recruiter_first_impression": "2-3 sentence cold read: what a recruiter sees in the first 10 seconds",
        "hiring_recommendation": "strong_yes|yes|maybe|no|strong_no",
        "hiring_recommendation_reason": "1-2 sentences justifying the hiring recommendation"
    }}
    """

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    response_text = message.content[0].text.strip()

    if response_text.startswith("```"):
        response_text = response_text.split("```")[1]
        if response_text.startswith("json"):
            response_text = response_text[4:]
    response_text = response_text.strip()
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        raise ValueError(f"Claude returned invalid JSON: {response_text[:200]}")