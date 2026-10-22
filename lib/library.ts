import { LIBRARY_CATEGORIES, LIBRARY_ITEMS, TELEGRAM_CHANNEL } from "./library-data";

export { LIBRARY_CATEGORIES, LIBRARY_ITEMS, TELEGRAM_CHANNEL };

export type LibraryType = "playlist" | "book" | "site" | "program";
export type LibraryCategoryId = (typeof LIBRARY_CATEGORIES)[number]["id"];

export interface LibraryLink {
  label: string;
  url: string;
  private?: boolean;
}

export interface LibraryPurchase {
  store: string;
  url: string;
}

export interface LibraryItem {
  id: string;
  title: string;
  type: LibraryType;
  url: string | null;
  categories: readonly LibraryCategoryId[];
  text: string;
  author?: string;
  download?: readonly LibraryLink[];
  purchase?: readonly LibraryPurchase[];
}

export const libraryItems: readonly LibraryItem[] = LIBRARY_ITEMS;

export const LIBRARY_TAGS: { id: LibraryType; label: string }[] = [
  { id: "playlist", label: "سلاسل" },
  { id: "book", label: "كتب" },
  { id: "site", label: "مواقع" },
  { id: "program", label: "برامج" },
];

const TYPE_LABEL: Record<LibraryType, string> = {
  playlist: "سلسلة",
  book: "كتاب",
  site: "موقع",
  program: "برنامج",
};

const LINK_LABEL: Record<LibraryType, string> = {
  playlist: "مشاهدة السلسلة",
  book: "عرض الكتاب",
  site: "فتح الموقع",
  program: "فتح البرنامج",
};

export function libraryTypeLabel(type: LibraryType): string {
  return TYPE_LABEL[type];
}

export function libraryLinkLabel(type: LibraryType): string {
  return LINK_LABEL[type];
}

export function libraryCategoryLabel(id: LibraryCategoryId): string {
  return LIBRARY_CATEGORIES.find((category) => category.id === id)?.label ?? id;
}

// Search ignores raw URLs. Alef variants, ta marbuta, and alef maqsura fold together,
// and tashkeel is stripped, so a typed query still hits the original message.
export function normalizeLibraryQuery(value: string): string {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

export function filterLibraryItems(
  items: readonly LibraryItem[],
  category: LibraryCategoryId | null,
  tag: LibraryType | null,
  query: string,
): LibraryItem[] {
  const needle = normalizeLibraryQuery(query);

  return items.filter((item) => {
    if (category && !item.categories.includes(category)) return false;
    if (tag && item.type !== tag) return false;
    if (!needle) return true;

    const threadLabels = item.categories.map((id) => libraryCategoryLabel(id)).join(" ");
    const haystack = normalizeLibraryQuery(`${item.title} ${threadLabels} ${item.text}`);
    return haystack.includes(needle);
  });
}
