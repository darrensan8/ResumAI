import { Minus, Plus } from 'lucide-react'

type Side = { items?: string[]; flags?: string[] }

/** Two columns: what works for the candidate, what works against them. */
export default function Ledger({ forYou, against }: { forYou: Side; against: Side }) {
  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-12">
      <Column title="Working for you" tone="good" side={forYou} flagLabel="Green flags" />
      <Column title="Working against you" tone="bad" side={against} flagLabel="Red flags" />
    </div>
  )
}

function Column({
  title,
  tone,
  side,
  flagLabel,
}: {
  title: string
  tone: 'good' | 'bad'
  side: Side
  flagLabel: string
}) {
  return (
    <div>
      <h3 className="mb-3 text-[15px] font-medium text-ink">{title}</h3>
      <Rows items={side.items} tone={tone} />
      {side.flags && side.flags.length > 0 && (
        <>
          <h4 className="mt-6 mb-2 text-[13px] font-normal text-ink-3">{flagLabel}</h4>
          <Rows items={side.flags} tone={tone} />
        </>
      )}
    </div>
  )
}

function Rows({ items, tone }: { items?: string[]; tone: 'good' | 'bad' }) {
  if (!items || items.length === 0) return <p className="text-sm text-ink-3">Nothing noted</p>
  const Icon = tone === 'good' ? Plus : Minus
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {items.map((text, i) => (
        <li key={i} className="flex gap-3 text-[15px] leading-6 text-ink-2">
          <Icon
            size={16}
            strokeWidth={1.5}
            className={'mt-1 shrink-0 ' + (tone === 'good' ? 'text-moss' : 'text-pen')}
            aria-label={tone === 'good' ? 'Positive' : 'Negative'}
          />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  )
}
