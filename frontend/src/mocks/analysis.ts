/**
 * Dev-only fixture mirroring the analysis JSON returned by the backend
 * (see backend/app/services/analysis.py). Used when /analysis?mock=1 so the
 * results page can be designed without a backend or Claude call.
 */
export const mockAnalysis = {
  overall_score: 78,
  scores: {
    experience_relevance: 82,
    technical_skills: 74,
    impact_and_metrics: 61,
    system_design_signals: 55,
    cs_fundamentals: 68,
    project_quality: 80,
    structure_and_readability: 88,
    ats_compatibility: 71,
    role_level_fit: 76,
  },
  keyword_analysis: {
    missing_critical_keywords: ['Kubernetes', 'CI/CD', 'gRPC', 'Distributed systems'],
  },
  tech_stack_analysis: {
    languages: {
      missing_from_jd: ['Go', 'Rust'],
    },
    frameworks_and_libraries: {
      missing_from_jd: ['gRPC', 'Kafka'],
    },
    tools_and_platforms: {
      missing_from_jd: ['Kubernetes', 'Terraform', 'Datadog'],
    },
  },
  ats_analysis: {
    formatting_issues: [
      'Two-column skills table may not parse cleanly',
      'Skills listed inside a table cell rather than plain text',
    ],
    keyword_density_ok: true,
    recommended_section_order: ['Summary', 'Skills', 'Experience', 'Projects', 'Education'],
    file_format_notes: 'PDF is fine; avoid tables, multi-column layouts, and text in headers/footers.',
  },
  tailored_summary:
    'Entry-level software engineer with shipped, real-world React + TypeScript products and two internships delivering measurable impact. Comfortable across the frontend stack with growing backend and API experience, and eager to deepen distributed-systems and CI/CD skills in a high-bar engineering team.',
  strengths: [
    'Deployed, real-world projects with measurable results',
    'Clean, ATS-friendly single-column layout',
    'Modern, in-demand frontend stack (React + TypeScript)',
    'Clear progression across two internships',
  ],
  weaknesses: [
    'Limited backend and systems depth for this role',
    'Several bullets lack quantified impact',
    'No mention of testing or CI/CD practices',
  ],
  green_flags: [
    'Shipped a product used by real users',
    'Open-source contributions linked with GitHub',
  ],
  red_flags: [
    'Two-column skills table may confuse ATS parsers',
    'Six-month gap left unexplained',
  ],
  interview_readiness: {
    technical_screen_ready: true,
    system_design_ready: false,
    behavioral_ready: true,
    notes:
      'Solid for a technical screen and behavioral rounds; brush up on system design fundamentals before onsites.',
  },
  improvements: [
    {
      priority: 'high',
      category: 'Impact',
      suggestion: 'Quantify the internal dashboard bullet with adoption or time-saved numbers.',
      reference_text: 'Built an internal dashboard for the analytics team.',
      example_rewrite:
        'Built an internal analytics dashboard adopted by 40+ employees, cutting weekly reporting time by ~6 hours.',
    },
    {
      priority: 'high',
      category: 'ATS',
      suggestion: 'Replace the two-column skills table with a simple comma-separated list so ATS can parse it.',
      reference_text: '',
      example_rewrite: '',
    },
    {
      priority: 'medium',
      category: 'CS Fundamentals',
      suggestion: 'Add a line about testing/CI to signal engineering rigor.',
      reference_text: '',
      example_rewrite: 'Set up GitHub Actions CI with 80% test coverage on the API layer.',
    },
    {
      priority: 'low',
      category: 'Structure',
      suggestion: 'Drop filler words like "passionate" in favor of concrete outcomes.',
      reference_text: 'Passionate developer who loves building things.',
      example_rewrite: 'Frontend engineer focused on performance and accessibility.',
    },
  ],
  recruiter_first_impression:
    'A promising entry-level engineer with shipped products and a clean resume — strong frontend signal, lighter on backend/systems depth.',
  hiring_recommendation: 'yes',
  hiring_recommendation_reason:
    'Clears the bar for an entry-level role; quantifying impact and adding systems depth would push this to a strong yes.',
}
