import Link from "next/link";
import { Lalezar, Tajawal } from "next/font/google";
import {
  libraryCategoryLabel,
  libraryExcerpt,
  libraryTypeLabel,
  type LibraryItem,
} from "@/lib/library";

const lalezar = Lalezar({ subsets: ["arabic"], weight: "400" });
const tajawal = Tajawal({ subsets: ["arabic"], weight: ["500", "700"] });

export default function LibraryCard({ item }: { item: LibraryItem }) {
  const excerpt = libraryExcerpt(item.text);
  const isBook = item.type === "book";

  return (
    <Link
      href={`/library/${item.id}`}
      dir="rtl"
      className="flex items-start gap-4 rounded-3xl border border-[#043F2E]/10 bg-white p-5 text-right"
    >
      {item.cover ? (
        <span className="flex w-48 shrink-0 items-center justify-center bg-transparent">
          <img
            src={item.cover}
            alt=""
            className={
              isBook
                ? "m-3.5 h-auto max-h-56 w-auto max-w-36 object-contain"
                : "h-auto w-full rounded-xl object-contain"
            }
          />
        </span>
      ) : (
        <span
          className={`${tajawal.className} grid h-36 w-48 shrink-0 place-items-center rounded-xl bg-[#043F2E] text-sm font-bold text-[#BEE663]`}
        >
          {libraryTypeLabel(item.type)}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={`${lalezar.className} block text-2xl leading-snug text-[#043F2E]`}>
          {item.title}
        </span>
        {excerpt ? (
          <span
            className={`${tajawal.className} mt-2 line-clamp-3 block text-sm leading-7 text-[#043F2E]/75`}
          >
            {excerpt}
          </span>
        ) : null}
        <span className="mt-3 flex flex-wrap gap-2">
          <span
            className={`${tajawal.className} rounded-full bg-[#F7FBEA] px-2 py-1 text-xs font-bold text-[#043F2E]`}
          >
            {libraryTypeLabel(item.type)}
          </span>
          {item.categories.map((id) => (
            <span
              key={id}
              className={`${tajawal.className} rounded-full bg-[#F7FBEA] px-2 py-1 text-xs font-bold text-[#043F2E]`}
            >
              {libraryCategoryLabel(id)}
            </span>
          ))}
        </span>
      </span>
    </Link>
  );
}
