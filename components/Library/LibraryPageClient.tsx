"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Lalezar, Tajawal } from "next/font/google";
import { AlertCircle, BookOpen, ChevronLeft, Search } from "lucide-react";
import { PageHero, PageHeroHeading } from "@/components/ui/PageHero";
import { formatArabicNumber } from "@/lib/utils";
import {
  LIBRARY_CATEGORIES,
  LIBRARY_TAGS,
  TELEGRAM_CHANNEL,
  filterLibraryItems,
  libraryCategoryLabel,
  libraryLinkLabel,
  libraryTypeLabel,
  libraryItems,
  type LibraryCategoryId,
  type LibraryItem,
  type LibraryLink,
  type LibraryType,
} from "@/lib/library";

const lalezar = Lalezar({ subsets: ["arabic"], weight: "400" });
const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

export default function LibraryPageClient() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<LibraryCategoryId | null>(null);
  const [tag, setTag] = useState<LibraryType | null>(null);

  const results = useMemo(
    () => filterLibraryItems(libraryItems, category, tag, query),
    [category, tag, query],
  );

  return (
    <div className="w-full bg-[#EBF0EB] min-h-screen">
      <PageHero>
        <PageHeroHeading
          icon={BookOpen}
          eyebrow="سلاسل وكتب"
          title="المكتبة"
          subtitle="محتوى القناة مرتب على الثريدز. اختَر ثريد، أو صفِّ بالنوع من كل الثريدز."
        />
      </PageHero>

      <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 md:py-14 flex flex-col gap-6" dir="rtl">
        <div
          role="note"
          className="rounded-3xl bg-[#F4E0D6] border border-[#9B3D2E]/30 p-5 md:p-7 flex flex-col gap-3"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 mt-0.5 shrink-0 text-[#9B3D2E]" strokeWidth={2.2} />
            <p
              className={`${tajawal.className} text-base md:text-lg font-bold text-[#9B3D2E] leading-8`}
            >
              لو تقدر تشتري الكتاب، اشتريه ورقيًا من المكتبة. روابط القراءة المجانية للي مش قادر
              يشتري بس.
            </p>
          </div>
          <p
            className={`${tajawal.className} text-sm font-medium text-[#9B3D2E]/80 leading-7 ps-9`}
          >
            {TELEGRAM_CHANNEL.note}.{" "}
            <a
              href={TELEGRAM_CHANNEL.invite}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline underline-offset-4"
            >
              انضم للقناة
            </a>
          </p>
        </div>

        <div className="relative">
          <Search
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#043F2E]/50 pointer-events-none"
            strokeWidth={2.2}
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث في العنوان أو النص"
            aria-label="بحث في المكتبة"
            className={`${tajawal.className} w-full h-11 pr-10 pl-3.5 bg-white border border-[#043F2E]/15 rounded-xl text-sm text-[#043F2E] placeholder:text-[#043F2E]/40 focus:outline-none focus:border-[#043F2E]/40 transition-colors`}
          />
        </div>

        <div className="flex flex-col gap-3">
          <label className="md:hidden">
            <span
              className={`${tajawal.className} mb-1.5 block text-xs font-bold text-[#043F2E]/50`}
            >
              الثريد
            </span>
            <select
              value={category ?? ""}
              onChange={(event) =>
                setCategory((event.target.value || null) as LibraryCategoryId | null)
              }
              aria-label="الثريد"
              className={`${tajawal.className} min-h-11 w-full rounded-xl border border-[#043F2E]/15 bg-white px-3 text-sm font-bold text-[#043F2E]`}
            >
              <option value="">الكل</option>
              {LIBRARY_CATEGORIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <div className="hidden md:flex flex-wrap gap-2" role="group" aria-label="الثريد">
            <FilterPill active={category === null} onClick={() => setCategory(null)}>
              الكل
            </FilterPill>
            {LIBRARY_CATEGORIES.map((item) => (
              <FilterPill
                key={item.id}
                active={category === item.id}
                onClick={() => setCategory(item.id)}
              >
                {item.label}
              </FilterPill>
            ))}
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="النوع">
            {LIBRARY_TAGS.map((item) => (
              <FilterPill
                key={item.id}
                active={tag === item.id}
                onClick={() => setTag((current) => (current === item.id ? null : item.id))}
              >
                {item.label}
              </FilterPill>
            ))}
          </div>
        </div>

        <p role="status" className={`${tajawal.className} text-sm font-medium text-[#043F2E]/60`}>
          {formatArabicNumber(results.length)} نتيجة
        </p>

        {results.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#043F2E]/10 shadow-sm flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#F7FBEA] flex items-center justify-center mb-4">
              <BookOpen className="w-7 h-7 text-[#043F2E]/40" strokeWidth={1.8} />
            </div>
            <h2 className={`${lalezar.className} text-xl text-[#043F2E] mb-1`}>لا توجد نتائج</h2>
            <p className={`${tajawal.className} text-sm text-[#043F2E]/60 font-medium`}>
              جرّب ثريدًا آخر، أو امسح الوسم والبحث.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {results.map((item) => (
              <LibraryRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`${tajawal.className} min-h-11 px-4 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
        active
          ? "bg-[#043F2E] text-white"
          : "bg-white text-[#043F2E]/70 border border-[#043F2E]/10 hover:bg-[#F7FBEA]"
      }`}
    >
      {children}
    </button>
  );
}

function LibraryRow({ item }: { item: LibraryItem }) {
  const threads = item.categories.map((id) => libraryCategoryLabel(id));

  return (
    <article className="bg-white rounded-3xl border border-[#043F2E]/10 shadow-sm p-5 md:p-7 flex flex-col gap-3">
      <h2 className={`${lalezar.className} text-xl md:text-2xl text-[#043F2E] leading-snug`}>
        {item.title}
      </h2>
      <p
        className={`${tajawal.className} flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-[#043F2E]/50`}
      >
        <span className="rounded-lg bg-[#F7FBEA] border border-[#043F2E]/10 px-2 py-1 text-[#043F2E]/70">
          {libraryTypeLabel(item.type)}
        </span>
        {threads.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </p>
      <MessageText text={item.text} />
      <ItemLinks item={item} />
    </article>
  );
}

function MessageText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [text, expanded]);

  return (
    <div>
      <p
        ref={ref}
        className={`${tajawal.className} text-sm leading-7 text-[#043F2E]/80 whitespace-pre-wrap ${
          expanded ? "" : "line-clamp-3"
        }`}
      >
        {text}
      </p>
      {(overflows || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
          className={`${tajawal.className} mt-1 text-sm font-bold text-[#043F2E] hover:text-[#065f46] cursor-pointer`}
        >
          {expanded ? "عرض أقل" : "عرض المزيد"}
        </button>
      )}
    </div>
  );
}

function ItemLinks({ item }: { item: LibraryItem }) {
  const downloads = item.download ?? [];
  const purchases = item.purchase ?? [];

  return (
    <div className="flex flex-col items-start gap-2 pt-1">
      {item.url ? (
        <QuietLink href={item.url}>{libraryLinkLabel(item.type)}</QuietLink>
      ) : item.type !== "book" ? (
        <span className={`${tajawal.className} text-sm font-medium text-[#043F2E]/50`}>
          الرابط غير متوفر
        </span>
      ) : null}
      {downloads.map((link) => (
        <QuietLink key={link.url} href={link.url}>
          {downloadCaption(link, downloads.length)}
        </QuietLink>
      ))}
      {purchases.map((link) => (
        <QuietLink key={link.url} href={link.url}>
          {`اشتري من ${link.store}`}
        </QuietLink>
      ))}
    </div>
  );
}

function downloadCaption(link: LibraryLink, total: number): string {
  if (total > 1) return `اقرأ مجانًا — ${link.label}`;
  return "اقرأ مجانًا";
}

function QuietLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${tajawal.className} inline-flex items-center gap-1 text-sm font-bold text-[#043F2E] hover:text-[#065f46]`}
    >
      <span className="underline underline-offset-4">{children}</span>
      <ChevronLeft className="w-3.5 h-3.5 shrink-0" aria-hidden />
    </a>
  );
}
