export type NavScreen = "today" | "summary" | "cases" | "me" | "team" | "faq";

const TABS: { id: NavScreen; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "cases", label: "Cases" },
  { id: "summary", label: "Summary" },
  { id: "team", label: "Team" },
  { id: "me", label: "My profile" },
  { id: "faq", label: "FAQ" },
];

export function BottomNav({ active, onChange }: { active: NavScreen; onChange: (s: NavScreen) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md border-t border-[#E2EAE9] bg-white pb-[env(safe-area-inset-bottom)]">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex flex-1 flex-col items-center gap-1.5 py-3 text-[9px] font-bold uppercase tracking-wide ${
            active === t.id ? "text-[#064B45]" : "text-[#5C6B6F]"
          }`}
        >
          <span className={`h-5 w-5 rounded-lg ${active === t.id ? "bg-[#0E7C72]" : "bg-[#DCEFEB]"}`} />
          {t.label}
        </button>
      ))}
    </nav>
  );
}
