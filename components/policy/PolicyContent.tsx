"use client";

import { POLICY_SECTIONS } from "@/lib/policy";

export default function PolicyContent() {
  return (
    <div className="space-y-8">
      {POLICY_SECTIONS.map((section) => (
        <section key={section.number}>
          <h2 className="text-base font-bold text-ink">
            {section.number}. {section.title}
          </h2>
          <div className="mt-2 space-y-3">
            {section.blocks.map((block, i) =>
              block.type === "list" ? (
                <ul
                  key={i}
                  className="list-disc pl-5 space-y-1.5 text-sm text-muted"
                >
                  {block.items!.map((item) => (
                    <li key={item} className="text-ink/90 leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p key={i} className="text-sm text-muted leading-relaxed">
                  {block.text}
                </p>
              )
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
