// Quotes from real users, added here as they come in (name and role optional). The section
// stays hidden while the list is empty, so nothing invented ever ships.
export const TESTIMONIALS = []

export default function Testimonials({ items = TESTIMONIALS }) {
  if (!items.length) return null
  return (
    <section aria-labelledby="testimonials" data-testid="testimonials" className="flex flex-col gap-4">
      <h2 id="testimonials" className="text-center text-sm font-medium uppercase tracking-wide text-zinc-500">
        What developers say
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map(({ quote, name, role }) => (
          <li key={quote} className="rounded-lg border border-zinc-800 p-4">
            <blockquote className="text-sm text-zinc-300">“{quote}”</blockquote>
            {(name || role) && <p className="mt-2 text-xs text-zinc-500">{[name, role].filter(Boolean).join(' · ')}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}
