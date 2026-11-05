/**
 * The signature: the resume's original line struck through in red pen,
 * the suggested rewrite beneath it in blue ink on a thin rule.
 */
export default function Redline({ original, rewrite }: { original?: string; rewrite?: string }) {
  if (!original && !rewrite) return null
  return (
    <div className="flex flex-col gap-2 text-[15px] leading-6">
      {original && (
        <p className="text-ink-2 line-through decoration-pen decoration-[1.5px]">
          <span className="sr-only">Original: </span>
          {original}
        </p>
      )}
      {rewrite && (
        <p className="border-l-2 border-blue-ink pl-3 text-blue-ink">
          <span className="sr-only">Rewrite: </span>
          {rewrite}
        </p>
      )}
    </div>
  )
}
