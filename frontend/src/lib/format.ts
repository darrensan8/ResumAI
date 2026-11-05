export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** Hiring recommendation in plain words, with the semantic dot color it gets. */
export const RECOMMENDATION: Record<string, { label: string; dot: string }> = {
  strong_yes: { label: 'Strong yes', dot: 'bg-moss' },
  yes: { label: 'Yes', dot: 'bg-moss' },
  maybe: { label: 'Maybe', dot: 'bg-ochre' },
  no: { label: 'No', dot: 'bg-pen' },
  strong_no: { label: 'Strong no', dot: 'bg-pen' },
}
