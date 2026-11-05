import { Check } from 'lucide-react'

export type IndexEntry = { id: string; label: string; ready: boolean }

/**
 * The report's table of contents. While the analysis streams, it doubles as
 * progress: finished sections get a check, the one being written gets a live dot.
 */
export default function SectionIndex({ entries, streaming }: { entries: IndexEntry[]; streaming: boolean }) {
  const writing = streaming ? entries.findIndex((e) => !e.ready) : -1

  return (
    <nav aria-label="Report sections">
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {entries.map((e, i) => (
          <li key={e.id}>
            <a
              href={`#${e.id}`}
              aria-disabled={!e.ready}
              onClick={(ev) => {
                ev.preventDefault()
                if (e.ready) document.getElementById(e.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className={
                'flex h-8 items-center gap-2 rounded-md px-2 text-sm transition-colors duration-150 ' +
                (e.ready ? 'text-ink-2 hover:bg-raised hover:text-ink' : 'pointer-events-none text-ink-3')
              }
            >
              <span className="flex w-4 justify-center" aria-hidden="true">
                {e.ready ? (
                  <Check size={16} strokeWidth={1.5} className="text-ink-3" />
                ) : i === writing ? (
                  <span className="animate-live h-1.5 w-1.5 rounded-full bg-blue-ink" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
                )}
              </span>
              {e.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
