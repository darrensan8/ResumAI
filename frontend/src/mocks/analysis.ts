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
  score_rationale: {
    experience_relevance: 'Internships align well with the target stack.',
    technical_skills: 'Strong on frontend; backend depth is thinner than the JD asks for.',
    impact_and_metrics: 'Several bullets lack quantified outcomes.',
    system_design_signals: 'Little evidence of designing systems at scale.',
    cs_fundamentals: 'DS&A visible via projects; OS/networking not mentioned.',
    project_quality: 'Projects show real users and a deployed product.',
    structure_and_readability: 'Clean, single-column, easy to scan.',
    ats_compatibility: 'Mostly parseable; avoid the two-column skills table.',
    role_level_fit: 'Reads as a strong entry-level candidate.',
  },
  keyword_analysis: {
    matched_keywords: ['React', 'TypeScript', 'REST APIs', 'PostgreSQL', 'Git'],
    missing_critical_keywords: ['Kubernetes', 'CI/CD', 'gRPC', 'Distributed systems'],
    missing_nice_to_have_keywords: ['GraphQL', 'Redis', 'Terraform'],
    overused_buzzwords: ['passionate', 'synergy'],
  },
  impact_analysis: {
    has_quantified_metrics: true,
    metric_examples: ['Cut page load time by 35%'],
    missing_metrics_opportunities: ['"Built internal dashboard" — add usage/adoption numbers'],
    impact_quality: 'moderate',
    feedback: 'Good start on metrics; roughly half the bullets are still task-oriented.',
  },
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
