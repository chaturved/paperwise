import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export interface FaqGroup {
  id: string;
  title: string;
  items: { question: string; answer: ReactNode }[];
  footer?: ReactNode;
}

/** Questions that open in place. Plain details elements, so it works without any script. */
export function FaqList({ groups }: { groups: FaqGroup[] }) {
  return (
    <div className="space-y-16">
      {groups.map((group) => (
        <section key={group.id} id={group.id} className="border-t border-line pt-8 lg:grid lg:grid-cols-[1.15fr_1fr] lg:gap-7">
          <h2 className="mb-5 font-display text-[28px] font-normal tracking-[-0.0125em] lg:mb-0">{group.title}</h2>
          <div className="divide-y divide-line border-y border-line">
            {group.items.map((item) => (
              <details key={item.question} className="group py-1">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-4 text-lg font-medium [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <ChevronDown size={18} className="mt-1.5 flex-shrink-0 text-ink/45 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <div className="max-w-[56ch] pb-5 text-[15.5px] leading-[1.6] text-ink/70">{item.answer}</div>
              </details>
            ))}
            {group.footer && <div className="py-5">{group.footer}</div>}
          </div>
        </section>
      ))}
    </div>
  );
}
