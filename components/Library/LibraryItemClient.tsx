"use client";

import Link from "next/link";
import { Lalezar, Tajawal } from "next/font/google";
import { ChevronRight } from "lucide-react";
import LibraryCard from "@/components/Library/LibraryCard";
import {
  TELEGRAM_CHANNEL,
  libraryCategoryLabel,
  libraryLinkLabel,
  libraryTypeLabel,
  usesPrivateChannel,
  youtubePlaylistId,
  type LibraryItem,
  type LibraryLink,
} from "@/lib/library";

const lalezar = Lalezar({ subsets: ["arabic"], weight: "400" });
const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

export default function LibraryItemClient({
  item,
  related,
}: {
  item: LibraryItem;
  related: LibraryItem[];
}) {
  const playlistId = item.type === "playlist" ? youtubePlaylistId(item.url) : null;
  const isPlayer = item.type === "playlist" && Boolean(playlistId);

  return (
    <div className="min-h-screen w-full bg-[#EBF0EB]">
      <div dir="rtl" className="mx-auto flex max-w-6xl flex-col px-6 py-8 md:px-10 md:py-12">
        <Link
          href="/library"
          className={`${tajawal.className} mb-4 inline-flex min-h-11 w-fit items-center gap-2 rounded-2xl border border-[#043F2E]/15 bg-white px-4 text-sm font-bold text-[#043F2E]`}
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2.4} aria-hidden />
          رجوع إلى المكتبة
        </Link>

        <article
          className={`flex flex-col gap-5 rounded-3xl border border-[#043F2E]/10 bg-white p-4 md:p-5 ${
            isPlayer ? "lg:flex-row lg:items-start" : "lg:flex-row lg:items-start"
          }`}
        >
          <div className={isPlayer ? "min-w-0 flex-[1.15]" : "shrink-0"}>
            {isPlayer ? (
              <iframe
                className="aspect-video w-full rounded-2xl border-0 bg-[#043F2E]"
                title={item.title}
                src={`https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : item.cover ? (
              <img
                src={item.cover}
                alt=""
                className={
                  item.type === "book"
                    ? "m-2.5 h-auto max-h-60 w-auto object-contain"
                    : "h-auto w-full max-w-md rounded-xl object-contain"
                }
              />
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <p className={`${tajawal.className} flex flex-wrap gap-2 text-xs font-bold`}>
              <span className="rounded-full bg-[#F7FBEA] px-2 py-1">{libraryTypeLabel(item.type)}</span>
              {item.categories.map((id) => (
                <span key={id} className="rounded-full bg-[#F7FBEA] px-2 py-1">
                  {libraryCategoryLabel(id)}
                </span>
              ))}
            </p>
            <h1 className={`${lalezar.className} mt-2 text-3xl leading-snug text-[#043F2E]`}>{item.title}</h1>
            {item.type === "book" ? (
              <p
                role="note"
                className={`${tajawal.className} mt-4 rounded-2xl border border-[#9B3D2E]/30 bg-[#F4E0D6] p-4 text-sm font-bold leading-7 text-[#9B3D2E] md:text-base`}
              >
                إن كنت قادرًا على الشراء، فاشترِ الكتاب ورقيًا من المكتبة. روابط القراءة المجانية لمن لا
                يقدر على الشراء.
              </p>
            ) : null}
            <p className={`${tajawal.className} mt-4 whitespace-pre-wrap text-sm leading-8 text-[#043F2E]/80`}>
              {item.text}
            </p>
            <ItemLinks item={item} />
            {usesPrivateChannel(item) ? (
              <p className={`${tajawal.className} mt-3 text-sm leading-7 text-[#043F2E]/80`}>
                <QuietLink href={TELEGRAM_CHANNEL.invite}>انضم إلى القناة أولًا</QuietLink>
                <span className="ms-2">القناة خاصة، ولن يُفتح رابط التحميل قبل الانضمام إليها.</span>
              </p>
            ) : null}
          </div>
        </article>

        {related.length > 0 ? (
          <section className="mt-8">
            <h2 className={`${lalezar.className} mb-3 text-2xl text-[#043F2E]`}>المزيد</h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {related.map((relatedItem) => (
                <LibraryCard key={relatedItem.id} item={relatedItem} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function ItemLinks({ item }: { item: LibraryItem }) {
  const downloads = item.download ?? [];
  const purchases = item.purchase ?? [];
  const mainLabel = item.url?.includes("goodreads.com") ? "على Goodreads" : libraryLinkLabel(item.type);

  return (
    <div className="mt-4 flex flex-col items-start gap-2">
      {item.url && item.type !== "playlist" ? <QuietLink href={item.url}>{mainLabel}</QuietLink> : null}
      {item.url && item.type === "playlist" && !youtubePlaylistId(item.url) ? (
        <QuietLink href={item.url}>{libraryLinkLabel(item.type)}</QuietLink>
      ) : null}
      {downloads.map((link) => (
        <QuietLink key={link.url} href={link.url}>
          {downloadCaption(link, downloads.length)}
        </QuietLink>
      ))}
      {purchases.map((link) => (
        <QuietLink key={link.url} href={link.url}>
          {`اشترِ من ${link.store}`}
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
      className={`${tajawal.className} text-sm font-bold text-[#043F2E] underline underline-offset-4`}
    >
      {children}
    </a>
  );
}
