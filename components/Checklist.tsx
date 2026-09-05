import { CATEGORY_LABELS, type PackCategory, type PackItem } from "@/lib/types";

const ORDER: PackCategory[] = ["clothes", "activity", "toiletries", "tech", "docs"];

export function Checklist({
  items,
  onToggle,
}: {
  items: PackItem[];
  onToggle: (id: string) => void;
}) {
  const packed = items.filter((i) => i.packed).length;

  return (
    <section className="rise delay-1 px-5 pb-4 sm:px-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="font-serif text-3xl tracking-tight text-cream sm:text-4xl">Pack</h2>
        <p className="pb-1 text-[13px] text-muted">
          {packed} of {items.length}
        </p>
      </div>

      <div className="space-y-8">
        {ORDER.map((category) => {
          const group = items.filter((item) => item.category === category);
          if (!group.length) return null;
          return (
            <div key={category}>
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
                {CATEGORY_LABELS[category]}
              </p>
              <ul className="divide-y divide-line/60">
                {group.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onToggle(item.id)}
                      className="flex w-full items-start gap-3 py-3.5 text-left transition-colors hover:bg-white/[0.015]"
                    >
                      <span
                        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors ${
                          item.packed
                            ? "border-gold bg-gold text-ink"
                            : "border-cream/35 bg-transparent"
                        }`}
                        aria-hidden
                      >
                        {item.packed && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path
                              d="M1.5 5.2 3.8 7.4 8.5 2.4"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span
                            className={`text-[15px] ${
                              item.packed ? "text-muted line-through decoration-white/20" : "text-cream"
                            }`}
                          >
                            {item.label}
                          </span>
                          {item.quantity > 1 && (
                            <span className="font-serif text-sm text-gold-dim">×{item.quantity}</span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-faint">
                          {item.reason}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
