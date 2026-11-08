"""Deterministic ATS-style checks on the actual resume PDF and job description.

Unlike the Claude analysis, these are measured, not judged: the same PDF and job
description always produce the same result. The output is stored as `ats_scan` on the
analysis and fed into the prompt as facts.
"""
import io
import re

import pdfplumber

# Canonical term -> aliases (lowercase). Matched with word boundaries, case-insensitive.
TECH_TERMS: dict[str, list[str]] = {
    # Languages
    "Python": ["python"], "Java": ["java"], "JavaScript": ["javascript", "js"],
    "TypeScript": ["typescript", "ts"], "C": ["c"], "C++": ["c++", "cpp"], "C#": ["c#", "csharp"],
    "Go": ["golang", "go"], "Rust": ["rust"], "Ruby": ["ruby"], "PHP": ["php"],
    "Kotlin": ["kotlin"], "Swift": ["swift"], "Scala": ["scala"], "R": ["r"],
    "SQL": ["sql"], "Bash": ["bash", "shell scripting"], "HTML": ["html", "html5"],
    "CSS": ["css", "css3"], "MATLAB": ["matlab"], "Dart": ["dart"], "Elixir": ["elixir"],
    "Haskell": ["haskell"], "Perl": ["perl"], "Lua": ["lua"], "Objective-C": ["objective-c"],
    # Frontend
    "React": ["react", "react.js", "reactjs"], "Angular": ["angular"],
    "Vue": ["vue", "vue.js", "vuejs"], "Svelte": ["svelte"], "Next.js": ["next.js", "nextjs"],
    "Redux": ["redux"], "Tailwind": ["tailwind", "tailwindcss"], "Webpack": ["webpack"],
    "Vite": ["vite"], "jQuery": ["jquery"], "React Native": ["react native"],
    "Flutter": ["flutter"],
    # Backend
    "Node.js": ["node.js", "nodejs", "node"], "Express": ["express", "express.js"],
    "Django": ["django"], "Flask": ["flask"], "FastAPI": ["fastapi"],
    "Spring": ["spring", "spring boot"], "Rails": ["rails", "ruby on rails"],
    ".NET": [".net", "asp.net", "dotnet"], "GraphQL": ["graphql"], "REST": ["rest", "restful"],
    "gRPC": ["grpc"], "Microservices": ["microservices", "microservice"],
    # Data / ML
    "PyTorch": ["pytorch"], "TensorFlow": ["tensorflow"], "scikit-learn": ["scikit-learn", "sklearn"],
    "Pandas": ["pandas"], "NumPy": ["numpy"], "Spark": ["spark", "pyspark", "apache spark"],
    "Hadoop": ["hadoop"], "Kafka": ["kafka"], "Airflow": ["airflow"],
    "Machine Learning": ["machine learning", "ml"], "Deep Learning": ["deep learning"],
    "NLP": ["nlp", "natural language processing"], "Computer Vision": ["computer vision"],
    "LLM": ["llm", "llms", "large language models"], "Data Pipelines": ["data pipelines", "etl"],
    "Snowflake": ["snowflake"], "dbt": ["dbt"], "Tableau": ["tableau"],
    # Databases
    "PostgreSQL": ["postgresql", "postgres"], "MySQL": ["mysql"], "MongoDB": ["mongodb", "mongo"],
    "Redis": ["redis"], "SQLite": ["sqlite"], "DynamoDB": ["dynamodb"],
    "Cassandra": ["cassandra"], "Elasticsearch": ["elasticsearch"], "NoSQL": ["nosql"],
    "Oracle": ["oracle"],
    # Cloud / infra
    "AWS": ["aws", "amazon web services"], "GCP": ["gcp", "google cloud"],
    "Azure": ["azure"], "Docker": ["docker"], "Kubernetes": ["kubernetes", "k8s"],
    "Terraform": ["terraform"], "Ansible": ["ansible"], "Linux": ["linux", "unix"],
    "CI/CD": ["ci/cd", "continuous integration", "continuous delivery"],
    "Jenkins": ["jenkins"], "GitHub Actions": ["github actions"], "Git": ["git"],
    "Serverless": ["serverless", "lambda"], "Nginx": ["nginx"],
    "Prometheus": ["prometheus"], "Grafana": ["grafana"], "Datadog": ["datadog"],
    # Practices / concepts
    "Distributed Systems": ["distributed systems"], "System Design": ["system design"],
    "Data Structures": ["data structures"], "Algorithms": ["algorithms"],
    "Object-Oriented Programming": ["object-oriented", "oop"],
    "Unit Testing": ["unit testing", "unit tests"], "Agile": ["agile", "scrum"],
    "APIs": ["api", "apis"], "Security": ["security"], "Concurrency": ["concurrency", "multithreading"],
    "Jest": ["jest"], "Pytest": ["pytest"], "Selenium": ["selenium"], "Cypress": ["cypress"],
    "Jira": ["jira"],
}

# Short / ambiguous aliases only count when written as a proper name ("Go", "GO", "C"),
# so "go to market", "a c-level role" or "rest of the team" don't register.
_CASE_SENSITIVE_ALIASES = {"c", "r", "go", "ts", "js", "node", "rest", "ml", "spring",
                           "express", "swift", "rust", "oracle", "lambda", "dart", "git"}

SECTION_PATTERNS = {
    "Summary": r"summary|profile|objective|about me",
    "Experience": r"(work |professional )?experience|employment( history)?|work history",
    "Education": r"education|academic background",
    "Skills": r"(technical )?skills|technologies|tech stack",
    "Projects": r"(personal |selected )?projects",
}
REQUIRED_SECTIONS = ("Experience", "Education", "Skills")

EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_RE = re.compile(r"(\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}")
LINKEDIN_RE = re.compile(r"linkedin\.com/in/", re.I)

HEADER_FOOTER_FRACTION = 0.06
MIN_WORDS_PER_PAGE = 30


def _alias_pattern(alias: str, case_sensitive: bool) -> re.Pattern:
    # \b fails next to symbols like "+" or "#", so use lookarounds on word characters.
    # The "-" lookbehind stops "Objective-C" from counting as "C".
    flags = 0 if case_sensitive else re.I
    return re.compile(rf"(?<![\w.+#-]){re.escape(alias)}(?![\w+#]|\.\w)", flags)


def _term_patterns() -> dict[str, list[re.Pattern]]:
    patterns = {}
    for term, aliases in TECH_TERMS.items():
        compiled = []
        for alias in aliases:
            if alias in _CASE_SENSITIVE_ALIASES:
                for variant in {alias.capitalize(), alias.upper()}:
                    compiled.append(_alias_pattern(variant, case_sensitive=True))
            else:
                compiled.append(_alias_pattern(alias, case_sensitive=False))
        patterns[term] = compiled
    return patterns


_TERM_PATTERNS = _term_patterns()


def _find_terms(text: str, patterns: dict[str, list[re.Pattern]]) -> set[str]:
    return {term for term, pats in patterns.items() if any(p.search(text) for p in pats)}


def keyword_match(resume_text: str, job_description: str) -> dict:
    """Exact (alias-normalized) match of tech terms in the job description against the resume."""
    jd_terms = _find_terms(job_description, _TERM_PATTERNS)
    resume_terms = _find_terms(resume_text, _TERM_PATTERNS)
    order = list(TECH_TERMS)
    matched = sorted(jd_terms & resume_terms, key=order.index)
    missing = sorted(jd_terms - resume_terms, key=order.index)
    rate = round(100 * len(matched) / len(jd_terms)) if jd_terms else 100
    return {"matched": matched, "missing": missing, "match_rate": rate}


def _is_multi_column(words: list[dict], page_width: float) -> bool:
    """True when the page's lines split into a left and right block with an empty gutter."""
    if len(words) < 40:
        return False
    mid_lo, mid_hi = page_width * 0.3, page_width * 0.7
    # Buckets of x-coverage across the middle band; a column gutter is a band no word crosses
    # even though many lines have words on both sides of it.
    step = 4
    covered = set()
    for w in words:
        for x in range(int(w["x0"]) // step, int(w["x1"]) // step + 1):
            covered.add(x)
    gutters = [x * step for x in range(int(mid_lo) // step, int(mid_hi) // step)
               if x not in covered]
    if not gutters:
        return False
    gutter = gutters[len(gutters) // 2]
    # Group words into visual lines and count lines that have text on both sides of the gutter.
    lines: dict[int, list[bool]] = {}
    for w in words:
        sides = lines.setdefault(round(w["top"] / 3), [False, False])
        if w["x1"] < gutter:
            sides[0] = True
        elif w["x0"] > gutter:
            sides[1] = True
    straddling = sum(1 for left, right in lines.values() if left and right)
    return straddling >= 5


def _sections(resume_text: str) -> list[str]:
    found = []
    lines = [ln.strip() for ln in resume_text.splitlines()]
    for name, pattern in SECTION_PATTERNS.items():
        heading = re.compile(rf"^({pattern})\s*:?$", re.I)
        if any(heading.match(ln) for ln in lines if 0 < len(ln) <= 40):
            found.append(name)
    return found


def _layout(pdf_bytes: bytes) -> dict:
    multi_column_pages, tables, images, header_footer = [], 0, 0, False
    words_total = 0
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        page_count = len(pdf.pages)
        for i, page in enumerate(pdf.pages, start=1):
            words = page.extract_words()
            words_total += len(words)
            if _is_multi_column(words, float(page.width)):
                multi_column_pages.append(i)
            tables += len(page.find_tables())
            images += len(page.images)
            band = float(page.height) * HEADER_FOOTER_FRACTION
            # Text in the page header/footer region (e.g. contact info) that some ATSs drop.
            if any(w["top"] < band or w["bottom"] > float(page.height) - band for w in words):
                header_footer = True
    return {
        "page_count": page_count,
        "text_extractable": page_count > 0 and words_total >= MIN_WORDS_PER_PAGE * page_count * 0.5,
        "multi_column_pages": multi_column_pages,
        "tables_found": tables,
        "header_footer_text": header_footer,
        "image_count": images,
    }


def _issues(scan: dict) -> list[str]:
    issues = []
    if not scan["text_extractable"]:
        issues.append("Little or no extractable text; the PDF may be a scanned image that ATSs can't read")
    if scan["multi_column_pages"]:
        pages = ", ".join(map(str, scan["multi_column_pages"]))
        issues.append(f"Multi-column layout on page {pages}; many ATSs read across columns and scramble the order")
    if scan["tables_found"]:
        issues.append(f"{scan['tables_found']} table(s) detected; table cells often parse out of order or get dropped")
    if scan["header_footer_text"]:
        issues.append("Text in the page header/footer area; some ATSs ignore it, so keep contact info in the body")
    if scan["image_count"]:
        issues.append(f"{scan['image_count']} image(s) or icon(s); any text inside them is invisible to an ATS")
    if scan["page_count"] > 2:
        issues.append(f"{scan['page_count']} pages; keep technical resumes to 1-2 pages")
    for section in scan["sections_missing"]:
        issues.append(f"No standard '{section}' heading found; ATSs map content by heading names")
    contact = scan["contact"]
    if not contact["email"]:
        issues.append("No email address found in the extracted text")
    if not contact["phone"]:
        issues.append("No phone number found in the extracted text")
    return issues


def scan_resume(pdf_bytes: bytes | None, resume_text: str, job_description: str) -> dict:
    """Run every check. Never raises: on failure returns {"error": ...} so analysis still runs."""
    try:
        if not pdf_bytes:
            return {"error": "No PDF stored for this resume."}
        scan = _layout(pdf_bytes)
        found = _sections(resume_text)
        scan["sections_found"] = found
        scan["sections_missing"] = [s for s in REQUIRED_SECTIONS if s not in found]
        scan["contact"] = {
            "email": bool(EMAIL_RE.search(resume_text)),
            "phone": bool(PHONE_RE.search(resume_text)),
            "linkedin": bool(LINKEDIN_RE.search(resume_text)),
        }
        scan["keyword_match"] = keyword_match(resume_text, job_description)
        scan["issues"] = _issues(scan)
        return scan
    except Exception as e:  # malformed PDFs raise a variety of pdfminer errors
        return {"error": f"Could not scan PDF: {type(e).__name__}"}
