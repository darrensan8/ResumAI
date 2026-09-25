"""
Benchmark Claude models on the production resume-analysis prompt.

Measures speed (time to first token, total time, output tokens/sec), cost, and basic
output quality (valid JSON, schema keys present, score consistency across runs), and saves
every raw output for side-by-side human review.

Run from backend/ with the venv active:
    python scripts/benchmark_models.py --resume resume.pdf --jd jd.txt
    python scripts/benchmark_models.py --resume resume.pdf --jd jd.txt --runs 1 --models claude-haiku-4-5
"""
import argparse
import io
import json
import os
import statistics
import sys
import time
from datetime import datetime
from pathlib import Path

import pdfplumber

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.services.analysis import client, parse_analysis, request_params  # noqa: E402

DEFAULT_MODELS = ["claude-sonnet-4-6", "claude-sonnet-5", "claude-opus-5", "claude-haiku-4-5"]

# (input, output) USD per 1M tokens
PRICING = {
    "claude-sonnet-4-6": (3.00, 15.00),
    "claude-sonnet-5": (2.00, 10.00),
    "claude-opus-5": (5.00, 25.00),
    "claude-opus-5-5": (4.00, 20.00),
    "claude-haiku-4-5": (1.00, 5.00),
}

EXPECTED_KEYS = [
    "overall_score", "scores", "keyword_analysis", "tech_stack_analysis", "ats_analysis",
    "tailored_summary", "red_flags", "green_flags", "strengths", "weaknesses", "improvements",
    "interview_readiness", "recruiter_first_impression", "hiring_recommendation",
    "hiring_recommendation_reason",
]


def extract_text_from_pdf(file_bytes: bytes) -> str:
    text = ""
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            if page_text := page.extract_text():
                text += page_text + "\n"
    return text


def run_once(model: str, inputs: tuple[str, str, str], effort: str | None) -> dict:
    # Same request the app sends (prompt, structured output schema, effort, max_tokens).
    params = request_params(*inputs, model=model, effort=effort)

    start = time.perf_counter()
    first_token_at = None
    with client.messages.stream(**params) as stream:
        for event in stream:
            if (
                first_token_at is None
                and event.type == "content_block_delta"
                and event.delta.type == "text_delta"
            ):
                first_token_at = time.perf_counter()
        message = stream.get_final_message()
    end = time.perf_counter()

    text = "".join(b.text for b in message.content if b.type == "text")
    in_price, out_price = PRICING.get(model, (0.0, 0.0))
    usage = message.usage
    total = end - start

    result = {
        "model": model,
        "stop_reason": message.stop_reason,
        "ttft_s": (first_token_at - start) if first_token_at else None,
        "total_s": total,
        "input_tokens": usage.input_tokens,
        "output_tokens": usage.output_tokens,
        "output_tok_per_s": usage.output_tokens / total if total else 0,
        "cost_usd": usage.input_tokens * in_price / 1e6 + usage.output_tokens * out_price / 1e6,
        "valid_json": False,
        "missing_keys": EXPECTED_KEYS,
        "overall_score": None,
        "num_improvements": None,
        "raw_text": text,
        "analysis": None,
    }
    try:
        analysis = parse_analysis(text)
    except ValueError:
        return result

    result.update(
        valid_json=True,
        missing_keys=[k for k in EXPECTED_KEYS if k not in analysis],
        overall_score=analysis.get("overall_score"),
        num_improvements=len(analysis.get("improvements") or []),
        analysis=analysis,
    )
    return result


def median(values):
    values = [v for v in values if v is not None]
    return statistics.median(values) if values else None


def p90(values):
    values = sorted(v for v in values if v is not None)
    if not values:
        return None
    return values[min(len(values) - 1, round(0.9 * (len(values) - 1)))]


def fmt(value, spec=".1f"):
    return "–" if value is None else format(value, spec)


def summarize(results_by_model: dict, args) -> str:
    lines = [
        "# Model benchmark — resume analysis",
        "",
        f"- Date: {datetime.now().isoformat(timespec='seconds')}",
        f"- Runs per model: {args.runs} · role level: {args.role_level} · "
        f"effort: {args.effort or 'default'}",
        "",
        "| Model | Median TTFT (s) | P90 TTFT (s) | Median total (s) | P90 total (s) "
        "| Median out tokens | Out tok/s | Avg cost ($) | Valid JSON | Score mean ± sd "
        "| Avg # improvements |",
        "|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for model, runs in results_by_model.items():
        ok = [r for r in runs if r.get("error") is None]
        scores = [r["overall_score"] for r in ok if isinstance(r["overall_score"], (int, float))]
        score_str = "–"
        if scores:
            sd = statistics.stdev(scores) if len(scores) > 1 else 0.0
            score_str = f"{statistics.mean(scores):.0f} ± {sd:.1f}"
        improvements = [r["num_improvements"] for r in ok if r["num_improvements"] is not None]
        lines.append(
            f"| `{model}` "
            f"| {fmt(median([r['ttft_s'] for r in ok]))} "
            f"| {fmt(p90([r['ttft_s'] for r in ok]))} "
            f"| {fmt(median([r['total_s'] for r in ok]))} "
            f"| {fmt(p90([r['total_s'] for r in ok]))} "
            f"| {fmt(median([r['output_tokens'] for r in ok]), '.0f')} "
            f"| {fmt(median([r['output_tok_per_s'] for r in ok]), '.0f')} "
            f"| {fmt(statistics.mean([r['cost_usd'] for r in ok]) if ok else None, '.3f')} "
            f"| {sum(r['valid_json'] for r in ok)}/{len(runs)} "
            f"| {score_str} "
            f"| {fmt(statistics.mean(improvements) if improvements else None)} |"
        )

    notes = []
    for model, runs in results_by_model.items():
        for i, r in enumerate(runs, 1):
            if r.get("error"):
                notes.append(f"- `{model}` run {i}: error — {r['error']}")
            elif r["stop_reason"] != "end_turn":
                notes.append(f"- `{model}` run {i}: stop_reason={r['stop_reason']}")
            elif r["missing_keys"]:
                notes.append(f"- `{model}` run {i}: missing keys {r['missing_keys']}")
    if notes:
        lines += ["", "## Issues", "", *notes]

    lines += [
        "",
        "TTFT = time until the first character of the JSON answer (thinking time included).",
        "Compare the raw `<model>_run<N>.json` files side by side to judge the improvement "
        "suggestions and rewrites, which is where quality differences show up.",
    ]
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    resume = parser.add_mutually_exclusive_group(required=True)
    resume.add_argument("--resume", help="Path to a resume PDF")
    resume.add_argument("--resume-text", help="Path to a plain-text resume")
    parser.add_argument("--jd", required=True, help="Path to a job description text file")
    parser.add_argument("--role-level", default="entry")
    parser.add_argument("--runs", type=int, default=3)
    parser.add_argument("--models", nargs="+", default=DEFAULT_MODELS)
    parser.add_argument("--effort", choices=["low", "medium", "high", "xhigh", "max"])
    parser.add_argument("--out", default="benchmark_results")
    args = parser.parse_args()

    if args.resume:
        resume_text = extract_text_from_pdf(Path(args.resume).read_bytes())
    else:
        resume_text = Path(args.resume_text).read_text()
    job_description = Path(args.jd).read_text()
    inputs = (resume_text, job_description, args.role_level)

    out_dir = Path(args.out) / datetime.now().strftime("%Y%m%d-%H%M%S")
    out_dir.mkdir(parents=True, exist_ok=True)

    results_by_model = {}
    for model in args.models:
        results_by_model[model] = []
        for i in range(1, args.runs + 1):
            print(f"[{model}] run {i}/{args.runs} ...", end=" ", flush=True)
            try:
                result = run_once(model, inputs, args.effort)
                result["error"] = None
                print(
                    f"total {result['total_s']:.1f}s, TTFT {fmt(result['ttft_s'])}s, "
                    f"{result['output_tokens']} out tokens, valid JSON: {result['valid_json']}"
                )
            except Exception as e:  # keep benchmarking the other models
                result = {"model": model, "error": f"{type(e).__name__}: {e}"}
                print(f"ERROR {result['error']}")
            results_by_model[model].append(result)
            safe_name = model.replace("/", "_")
            (out_dir / f"{safe_name}_run{i}.json").write_text(json.dumps(result, indent=2))

    summary = summarize(results_by_model, args)
    (out_dir / "summary.md").write_text(summary)
    print()
    print(summary)
    print(f"Results written to {out_dir}")


if __name__ == "__main__":
    main()
