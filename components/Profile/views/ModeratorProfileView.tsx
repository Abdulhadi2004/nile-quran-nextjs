"use client";

import { useState, useMemo, useEffect, useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lalezar, Tajawal } from "next/font/google";
import {
  Search,
  Users,
  TrendingUp,
  Award,
  User,
  BookOpen,
  Inbox,
  BookMarked,
  Pencil,
  X,
  Plus,
  Loader2,
  Check,
  Trash2,
  ClipboardList,
  Calendar,
  AlertCircle,
  BellRing,
} from "lucide-react";
import Link from "next/link";
import { toArabicDigits, formatArabicDate } from "@/lib/utils";
import {
  addStudentActivity,
  getStudentActivities,
  deleteStudentActivity,
  updateStudentActivityCategory,
} from "@/actions/profile";
import {
  SUPERVISOR_MANAGED_CATEGORY_IDS,
  isLongInactive,
  weeksSinceActivity,
} from "@/lib/profile-types";
import type { SupervisedStudent } from "@/lib/profile-types";

const lalezar = Lalezar({ subsets: ["arabic"], weight: "400" });
const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

export interface ActivityCategory {
  id: number;
  name: string;
  value: number;
}

interface Props {
  students: SupervisedStudent[];
  categories: ActivityCategory[];
  /**
   * Whether the person reading this panel is also an Admin.
   *
   * Only copy, never permissions. /control-board is Admin-only — its page guard
   * redirects anyone without the Admin group — so only an Admin may be pointed at
   * it. Defaults to false so a plain recitation supervisor is never sent to a page
   * that would turn them away.
   */
  viewerIsAdmin?: boolean;
}

const CAT_TASMEE = 4;

type ActivityItem = {
  id: number;
  category: number;
  date: string;
  multiplier: number;
};

export default function ModeratorProfileView({
  students,
  categories,
  viewerIsAdmin = false,
}: Props) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"points" | "name">("points");
  const [sheetStudent, setSheetStudent] = useState<SupervisedStudent | null>(null);

  // Stable so the sheet's Escape listener is not rebound on every parent render
  const closeSheet = useCallback(() => setSheetStudent(null), []);

  const filtered = useMemo(() => {
    let result = [...students];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((s) => {
        const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
        return fullName.includes(q) || s.username.toLowerCase().includes(q);
      });
    }

    if (sortBy === "points") {
      result.sort((a, b) => b.points - a.points);
    } else {
      result.sort((a, b) => {
        const nameA = `${a.first_name} ${a.last_name}`.trim();
        const nameB = `${b.first_name} ${b.last_name}`.trim();
        return nameA.localeCompare(nameB, "ar");
      });
    }

    return result;
  }, [students, search, sortBy]);

  const stats = useMemo(() => {
    const total = students.length;
    const totalPoints = students.reduce((sum, s) => sum + s.points, 0);
    const avg = total > 0 ? Math.round(totalPoints / total) : 0;
    // Active students = students with at least one activity this week (same as the control board)
    const activeStudents = students.filter((s) => s.weekly_activities_count > 0).length;
    return { total, totalPoints, avg, activeStudents };
  }, [students]);

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="طلاب حلقتي" value={toArabicDigits(stats.total)} icon={<Users className="w-5 h-5" strokeWidth={2.2} />} accent />
        <StatCard label="إجمالي نقاط الحلقة" value={toArabicDigits(stats.totalPoints)} icon={<TrendingUp className="w-5 h-5" strokeWidth={2.2} />} />
        <StatCard label="متوسط النقاط" value={toArabicDigits(stats.avg)} icon={<Award className="w-5 h-5" strokeWidth={2.2} />} />
        <StatCard label="الطلاب النشطون هذا الأسبوع" value={toArabicDigits(stats.activeStudents)} icon={<BookOpen className="w-5 h-5" strokeWidth={2.2} />} />
      </div>

      {/* Students list */}
      <div className="bg-white rounded-3xl border border-[#043F2E]/10 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#043F2E]/8 flex items-center gap-2 flex-wrap">
          <Users className="w-4 h-4 text-[#043F2E]" strokeWidth={2.2} />
          <h3 className={`${lalezar.className} text-lg text-[#043F2E]`}>طلابي</h3>
        </div>

        {/* Search + Sort */}
        <div className="px-5 py-4 border-b border-[#043F2E]/8 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#043F2E]/50" strokeWidth={2.2} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو اسم المستخدم..."
              className={`${tajawal.className} w-full h-12 pr-11 pl-4 bg-[#F7FBEA] border border-[#043F2E]/15 rounded-2xl text-[#043F2E] placeholder:text-[#043F2E]/40 focus:outline-none focus:border-[#043F2E]/40 focus:bg-white transition-colors text-sm font-medium`}
            />
          </div>
          {/* Sort tabs — same design as the control board buttons */}
          <div className="flex items-center gap-1.5 bg-[#F7FBEA] border border-[#043F2E]/15 rounded-2xl p-1.5">
            <button
              onClick={() => setSortBy("points")}
              className={`${tajawal.className} h-10 px-3 rounded-xl text-sm font-bold transition-colors ${
                sortBy === "points"
                  ? "bg-[#043F2E] text-white shadow-sm"
                  : "bg-white text-[#043F2E] hover:bg-[#BEE663] shadow-sm"
              }`}
            >
              الأعلى نقاطًا
            </button>
            <button
              onClick={() => setSortBy("name")}
              className={`${tajawal.className} h-10 px-3 rounded-xl text-sm font-bold transition-colors ${
                sortBy === "name"
                  ? "bg-[#043F2E] text-white shadow-sm"
                  : "bg-white text-[#043F2E] hover:bg-[#BEE663] shadow-sm"
              }`}
            >
              الاسم
            </button>
          </div>
        </div>

        {/* Students */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#F7FBEA] flex items-center justify-center mb-4">
              <Inbox className="w-7 h-7 text-[#043F2E]/40" strokeWidth={1.8} />
            </div>
            <h3 className={`${lalezar.className} text-xl text-[#043F2E] mb-1`}>
              {search ? "لا توجد نتائج" : "لا يوجد طلاب"}
            </h3>
            <p className={`${tajawal.className} text-sm text-[#043F2E]/60`}>
              {search ? "جرّب البحث بكلمة مختلفة" : "لم يُسنَد إليك أي طالب بعد"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Desktop header */}
            <div className="hidden md:flex bg-[#F7FBEA] border-b border-[#043F2E]/10 px-5 py-3 gap-3">
              <div className="w-[44px] shrink-0" />
              <div className="flex-1 min-w-0"><span className={`${tajawal.className} text-[12px] font-bold text-[#043F2E]`}>الطالب</span></div>
              <div className="w-[90px] shrink-0 text-center"><span className={`${tajawal.className} text-[12px] font-bold text-[#043F2E]`}>الأنشطة</span></div>
              <div className="w-[90px] shrink-0 text-center"><span className={`${tajawal.className} text-[12px] font-bold text-[#043F2E]`}>النقاط</span></div>
              <div className="w-[70px] shrink-0 text-center"><span className={`${tajawal.className} text-[12px] font-bold text-[#043F2E]`}>الإجراءات</span></div>
            </div>

            <div className="hidden md:flex flex-col">
              {filtered.map((student, idx) => {
                const fullName = `${student.first_name} ${student.last_name}`.trim();
                const initials = `${student.first_name?.charAt(0) || ""}${student.last_name?.charAt(0) || ""}`.trim();
                const isLast = idx === filtered.length - 1;

                return (
                  <div
                    key={student.id}
                    className={`flex items-center gap-3 px-5 py-3.5 bg-white hover:bg-[#F7FBEA]/60 transition-colors ${!isLast ? "border-b border-[#043F2E]/8" : ""}`}
                  >
                    {/* Avatar */}
                    <div className="w-[44px] h-[44px] shrink-0 rounded-full bg-gradient-to-br from-[#043F2E] to-[#065f46] flex items-center justify-center text-white shadow-sm">
                      <span className={`${tajawal.className} text-sm font-bold`}>
                        {initials || <User className="w-4 h-4" strokeWidth={2.2} />}
                      </span>
                    </div>

                    {/* Name — the name itself is the way into the member's profile */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/profile/${student.id}`}
                          className={`${tajawal.className} text-sm font-bold text-[#043F2E] truncate hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#043F2E] focus-visible:ring-offset-2 rounded`}
                        >
                          {fullName || student.username}
                        </Link>
                        <FollowUpBadge student={student} />
                      </div>
                      <p className={`${tajawal.className} text-[10px] text-[#043F2E]/40`}>@{student.username}</p>
                    </div>

                    {/* Activities count */}
                    <div className="w-[90px] shrink-0 text-center">
                      <span className={`${tajawal.className} text-xs font-medium text-[#043F2E]/60`}>
                        {toArabicDigits(student.activities_count)}
                      </span>
                    </div>

                    {/* Points */}
                    <div className="w-[90px] shrink-0 flex justify-center">
                      <span className={`${tajawal.className} min-w-[48px] h-9 px-3 flex items-center justify-center rounded-xl font-bold text-sm ${student.points > 0 ? "bg-[#BEE663] text-[#043F2E]" : "bg-[#F7FBEA] text-[#043F2E]/40"}`}>
                        {toArabicDigits(student.points)}
                      </span>
                    </div>

                    {/* One control per student — it opens the activity sheet */}
                    <div className="w-[70px] shrink-0 flex items-center justify-center">
                      <button
                        onClick={() => setSheetStudent(student)}
                        aria-label={`أنشطة ${fullName || student.username}`}
                        title="الأنشطة"
                        className="w-10 h-10 rounded-xl bg-[#065f46] text-[#BEE663] flex items-center justify-center hover:bg-[#043F2E] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#043F2E] focus-visible:ring-offset-2"
                      >
                        <ClipboardList className="w-4 h-4" strokeWidth={2.4} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-3 p-4">
              {filtered.map((student) => {
                const fullName = `${student.first_name} ${student.last_name}`.trim();
                const initials = `${student.first_name?.charAt(0) || ""}${student.last_name?.charAt(0) || ""}`.trim();

                return (
                  <div key={student.id} className="bg-[#F7FBEA] rounded-2xl border border-[#043F2E]/10 p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 shrink-0 rounded-full bg-gradient-to-br from-[#043F2E] to-[#065f46] flex items-center justify-center text-white shadow-sm">
                        <span className={`${tajawal.className} text-base font-bold`}>{initials || <User className="w-5 h-5" strokeWidth={2.2} />}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/profile/${student.id}`}
                          className={`${tajawal.className} block text-base font-bold text-[#043F2E] truncate hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#043F2E] focus-visible:ring-offset-2 rounded`}
                        >
                          {fullName || student.username}
                        </Link>
                        <p className={`${tajawal.className} text-[10px] text-[#043F2E]/40`}>
                          @{student.username} · الأنشطة: {toArabicDigits(student.activities_count)}
                        </p>
                        <div className="mt-1.5">
                          <FollowUpBadge student={student} />
                        </div>
                      </div>
                      <span className={`${tajawal.className} shrink-0 min-w-[48px] h-9 px-3 flex items-center justify-center rounded-xl font-bold text-sm ${student.points > 0 ? "bg-[#BEE663] text-[#043F2E]" : "bg-white text-[#043F2E]/40 border border-[#043F2E]/10"}`}>
                        {toArabicDigits(student.points)}
                      </span>
                    </div>

                    <button
                      onClick={() => setSheetStudent(student)}
                      className={`${tajawal.className} w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-[#065f46] text-[#BEE663] text-sm font-bold hover:bg-[#043F2E] transition-colors`}
                    >
                      <ClipboardList className="w-4 h-4" strokeWidth={2.4} aria-hidden="true" />
                      الأنشطة
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* One sheet per student: record, correct, or remove */}
      {sheetStudent && (
        <ActivitySheet
          key={sheetStudent.id}
          student={sheetStudent}
          categories={categories}
          viewerIsAdmin={viewerIsAdmin}
          onClose={closeSheet}
        />
      )}
    </div>
  );
}

// ============================
// Activity Sheet — record, correct, or remove, in one place
// ============================
type SheetMode = "add" | "manage";

function ActivitySheet({
  student,
  categories,
  viewerIsAdmin,
  onClose,
}: {
  student: SupervisedStudent;
  categories: ActivityCategory[];
  viewerIsAdmin: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<SheetMode>("add");
  const [activities, setActivities] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const closeRef = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(false);

  const fullName = `${student.first_name} ${student.last_name}`.trim() || student.username;
  const initials = `${student.first_name?.charAt(0) || ""}${student.last_name?.charAt(0) || ""}`.trim();

  // The two categories a supervisor may touch, with names and values from the API
  const availableCategories = SUPERVISOR_MANAGED_CATEGORY_IDS.map((id) =>
    categories.find((c) => c.id === id),
  ).filter((c): c is ActivityCategory => Boolean(c));

  const [categoryId, setCategoryId] = useState<number>(
    availableCategories[0]?.id ?? CAT_TASMEE,
  );
  const selectedCategory = availableCategories.find((c) => c.id === categoryId);

  const isBusy = busyId !== null || isPending;
  busyRef.current = isBusy;

  const requestClose = () => {
    if (!busyRef.current) onClose();
  };

  // The dialog takes focus on open, and the button that opened it gets focus back
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busyRef.current) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const loadActivities = useCallback(() => {
    setActivities(null);
    setError(null);
    getStudentActivities(student.id).then((res) => {
      if (res.success && res.data) {
        setActivities(
          res.data
            .filter((a) => SUPERVISOR_MANAGED_CATEGORY_IDS.includes(a.category))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        );
      } else {
        setError(res.error || "تعذّر تحميل الأنشطة");
      }
    });
  }, [student.id]);

  // Only fetch the log when the reader actually asks to see it
  useEffect(() => {
    if (mode === "manage" && activities === null && !error) loadActivities();
  }, [mode, activities, error, loadActivities]);

  const handleRecord = () => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await addStudentActivity(student.id, categoryId, 1);
      if (res.success) {
        setNotice(`تم تسجيل ${selectedCategory?.name ?? "النشاط"} باسم ${fullName}`);
        setActivities(null);
        router.refresh();
      } else {
        setError(res.error || "تعذّر تسجيل النشاط");
      }
    });
  };

  const handleChangeCategory = async (activityId: number, nextCategoryId: number) => {
    setError(null);
    setNotice(null);
    setBusyId(activityId);
    try {
      const res = await updateStudentActivityCategory(student.id, activityId, nextCategoryId);
      if (res.success) {
        setActivities((prev) =>
          (prev ?? []).map((a) => (a.id === activityId ? { ...a, category: nextCategoryId } : a)),
        );
        router.refresh();
      } else {
        setError(res.error || "تعذّر تعديل النشاط");
      }
    } catch {
      setError("تعذّر الاتصال، حاول مرة أخرى");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (activityId: number) => {
    setError(null);
    setNotice(null);
    setBusyId(activityId);
    try {
      const res = await deleteStudentActivity(student.id, activityId);
      if (res.success) {
        setActivities((prev) => (prev ?? []).filter((a) => a.id !== activityId));
        setConfirmingId(null);
        router.refresh();
      } else {
        setError(res.error || "تعذّر حذف النشاط");
      }
    } catch {
      setError("تعذّر الاتصال، حاول مرة أخرى");
    } finally {
      setBusyId(null);
    }
  };

  const tabClass = (active: boolean) =>
    `${tajawal.className} flex-1 h-10 rounded-xl text-sm font-bold transition-colors inline-flex items-center justify-center gap-1.5 ${
      active ? "bg-[#043F2E] text-white shadow-sm" : "bg-white text-[#043F2E] hover:bg-[#BEE663] shadow-sm"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#043F2E]/40 p-4" onClick={requestClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`أنشطة ${fullName}`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] max-h-[85vh] overflow-y-auto bg-white rounded-3xl border border-[#043F2E]/10 shadow-lg p-5 flex flex-col gap-4"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#043F2E] flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-[#BEE663]" strokeWidth={2.4} aria-hidden="true" />
            </div>
            <h3 className={`${lalezar.className} text-lg text-[#043F2E]`}>الأنشطة</h3>
          </div>
          <button
            ref={closeRef}
            onClick={requestClose}
            disabled={isBusy}
            aria-label="إغلاق"
            className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-[#043F2E]/60 hover:bg-[#F7FBEA] hover:text-[#043F2E] transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>

        {/* Student */}
        <div className="flex items-center gap-3 bg-[#F7FBEA] rounded-2xl border border-[#043F2E]/8 px-4 py-3">
          <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-[#043F2E] to-[#065f46] flex items-center justify-center text-white shadow-sm">
            <span className={`${tajawal.className} text-xs font-bold`}>
              {initials || <User className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />}
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className={`${tajawal.className} text-sm font-bold text-[#043F2E] truncate`}>{fullName}</span>
            <span className={`${tajawal.className} text-[10px] text-[#043F2E]/60`}>@{student.username}</span>
          </div>
        </div>

        {/* Mode */}
        <div className="flex items-center gap-1.5 bg-[#F7FBEA] border border-[#043F2E]/15 rounded-2xl p-1.5">
          <button onClick={() => setMode("add")} className={tabClass(mode === "add")}>
            <Plus className="w-4 h-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />
            تسجيل
          </button>
          <button onClick={() => setMode("manage")} className={tabClass(mode === "manage")}>
            <Pencil className="w-4 h-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />
            تعديل
          </button>
        </div>

        <p className={`${tajawal.className} text-[11px] text-[#043F2E]/60 leading-relaxed`}>
          تظهر هنا أنشطة التسميع والقراءة فقط، وهي ما يمكنك تسجيله أو تعديله أو حذفه لطلابك.{" "}
          {viewerIsAdmin
            ? "أما باقي الأنشطة فتُسجَّل من لوحة التحكم."
            : "أما باقي الأنشطة فيسجّلها المدراء."}
        </p>

        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-xl bg-[#F4E0D6] border border-[#9B3D2E]/30 px-3 py-2.5">
            <AlertCircle className="w-4 h-4 text-[#9B3D2E] shrink-0" strokeWidth={2.2} aria-hidden="true" />
            <span className={`${tajawal.className} text-xs text-[#9B3D2E]`}>{error}</span>
          </div>
        )}

        {notice && (
          <div role="status" className="flex items-center gap-2 rounded-xl bg-[#DEFF90] border border-[#9ADD00]/40 px-3 py-2.5">
            <Check className="w-4 h-4 text-[#043F2E] shrink-0" strokeWidth={2.5} aria-hidden="true" />
            <span className={`${tajawal.className} text-xs text-[#043F2E]`}>{notice}</span>
          </div>
        )}

        {mode === "add" ? (
          <>
            <div className="flex flex-col gap-2">
              <label className={`${tajawal.className} text-xs font-bold text-[#043F2E]/70`}>نوع النشاط</label>
              <div className="grid grid-cols-2 gap-2">
                {availableCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryId(cat.id)}
                    disabled={isPending}
                    aria-pressed={categoryId === cat.id}
                    className={`${tajawal.className} flex flex-col items-center gap-1.5 h-auto py-3 rounded-2xl border-2 text-xs font-bold transition-all ${
                      categoryId === cat.id
                        ? "border-[#043F2E] bg-[#043F2E] text-white"
                        : "border-[#043F2E]/15 bg-[#F7FBEA] text-[#043F2E]/70 hover:border-[#043F2E]/40"
                    } disabled:opacity-50`}
                  >
                    {cat.id === CAT_TASMEE ? (
                      <BookMarked className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
                    ) : (
                      <BookOpen className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
                    )}
                    {cat.name}
                    <span className={`text-[10px] font-medium ${categoryId === cat.id ? "text-[#BEE663]" : "text-[#043F2E]/60"}`}>
                      النقاط: +{toArabicDigits(cat.value)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleRecord}
              disabled={isPending || !selectedCategory}
              className={`${tajawal.className} h-12 rounded-xl bg-[#043F2E] text-white text-sm font-bold hover:bg-[#065f46] transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} aria-hidden="true" />
                  جارٍ التسجيل...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" strokeWidth={2.4} aria-hidden="true" />
                  تسجيل النشاط
                </>
              )}
            </button>
          </>
        ) : activities === null && !error ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded-2xl bg-[#F7FBEA] animate-pulse" />
            ))}
          </div>
        ) : activities === null ? null : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F7FBEA] flex items-center justify-center mb-3">
              <Inbox className="w-6 h-6 text-[#043F2E]/40" strokeWidth={1.8} aria-hidden="true" />
            </div>
            <p className={`${tajawal.className} text-sm text-[#043F2E]/60`}>لا توجد أنشطة تسميع أو قراءة</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {activities.map((act) => {
              const cat = categories.find((c) => c.id === act.category);
              const activityName = cat?.name ?? "نشاط";
              const activityDate = formatArabicDate(act.date);
              const isConfirming = confirmingId === act.id;
              const isRowBusy = busyId === act.id;

              return (
                <div key={act.id} className="bg-[#F7FBEA] rounded-2xl border border-[#043F2E]/8 px-4 py-3 flex flex-col gap-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className={`${tajawal.className} text-sm font-bold text-[#043F2E] truncate`}>{activityName}</p>
                      <p className={`${tajawal.className} text-[11px] text-[#043F2E]/60 flex items-center gap-1`}>
                        <Calendar className="w-3 h-3" strokeWidth={2.2} aria-hidden="true" />
                        {activityDate}
                      </p>
                    </div>

                    {cat && (
                      <span className={`${tajawal.className} text-xs font-bold text-[#043F2E] bg-[#BEE663] rounded-full px-2 py-0.5 shrink-0`}>
                        +{toArabicDigits(cat.value * act.multiplier)}
                      </span>
                    )}

                    {isConfirming ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          autoFocus
                          onClick={() => handleDelete(act.id)}
                          disabled={isBusy}
                          className={`${tajawal.className} h-8 px-2.5 rounded-lg bg-[#9B3D2E] text-white text-[11px] font-bold hover:bg-[#9B3D2E]/90 transition-colors disabled:opacity-50 flex items-center gap-1`}
                        >
                          {isRowBusy ? (
                            <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2.5} aria-hidden="true" />
                          ) : (
                            <Check className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />
                          )}
                          تأكيد الحذف
                        </button>
                        <button
                          onClick={() => setConfirmingId(null)}
                          disabled={isBusy}
                          aria-label="إلغاء الحذف"
                          className="w-8 h-8 rounded-lg bg-white border border-[#043F2E]/15 flex items-center justify-center text-[#043F2E]/60 hover:text-[#043F2E] transition-colors disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingId(act.id)}
                        disabled={isBusy}
                        aria-label={`حذف ${activityName} بتاريخ ${activityDate}`}
                        title="حذف"
                        className="w-8 h-8 shrink-0 rounded-lg bg-white border border-[#043F2E]/15 flex items-center justify-center text-[#043F2E]/60 hover:border-[#9B3D2E]/40 hover:text-[#9B3D2E] transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  {/* Correcting the type is the whole of "edit" — there is nothing else to change */}
                  {!isConfirming && availableCategories.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      {availableCategories.map((option) => {
                        const active = option.id === act.category;
                        return (
                          <button
                            key={option.id}
                            onClick={() => !active && handleChangeCategory(act.id, option.id)}
                            disabled={isBusy || active}
                            aria-pressed={active}
                            className={`${tajawal.className} flex-1 h-8 rounded-lg text-[11px] font-bold transition-colors inline-flex items-center justify-center gap-1 ${
                              active
                                ? "bg-[#043F2E] text-white"
                                : "bg-white border border-[#043F2E]/15 text-[#043F2E]/70 hover:bg-[#BEE663]/30 hover:text-[#043F2E]"
                            } disabled:cursor-default`}
                          >
                            {isRowBusy && !active ? (
                              <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2.5} aria-hidden="true" />
                            ) : null}
                            {option.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================
// Follow-up Badge
// ============================
// Two different silences, two different sentences. A student who recorded nothing
// at all for weeks has usually drifted away from the maqra'a; a student who simply
// has not recited this week needs a nudge. Both are the supervisor's to act on,
// and both stay inside recitation and reading — the rest is not their remit.
function FollowUpBadge({ student }: { student: SupervisedStudent }) {
  if (isLongInactive(student.last_activity_at, student.date_joined)) {
    const weeks = weeksSinceActivity(student.last_activity_at);
    return (
      <span
        className={`${tajawal.className} inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-[#F4E0D6] text-[#9B3D2E] border border-[#9B3D2E]/25`}
        title={
          weeks === null
            ? "لم يسجّل أي نشاط منذ انضمامه"
            : `آخر نشاط قبل ${toArabicDigits(weeks)} أسبوعًا`
        }
      >
        <BellRing className="w-3 h-3 shrink-0" strokeWidth={2.4} aria-hidden="true" />
        منقطع عن النشاط
      </span>
    );
  }

  if (!student.recited_this_week) {
    return (
      <span
        className={`${tajawal.className} inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-[#DEFF90] text-[#043F2E] border border-[#9ADD00]/40`}
        title="لم يسجّل تسميعًا هذا الأسبوع"
      >
        <BellRing className="w-3 h-3 shrink-0" strokeWidth={2.4} aria-hidden="true" />
        يحتاج إلى متابعة
      </span>
    );
  }

  return null;
}

// ============================
// Stat Card
// ============================
function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-2xl px-4 py-4 border flex items-center gap-3 ${accent ? "bg-[#043F2E] text-[#BEE663] border-[#043F2E]/15" : "bg-white text-[#043F2E] border-[#043F2E]/10 shadow-sm"}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accent ? "bg-white/10" : "bg-[#F7FBEA]"}`}>{icon}</div>
      <div className="flex flex-col min-w-0">
        <span className={`${tajawal.className} text-[11px] font-medium opacity-70`}>{label}</span>
        <span className={`${lalezar.className} text-2xl leading-tight`}>{value}</span>
      </div>
    </div>
  );
}
