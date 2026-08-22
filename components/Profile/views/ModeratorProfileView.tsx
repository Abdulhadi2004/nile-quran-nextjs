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
  ExternalLink,
  BookMarked,
  X,
  Plus,
  Loader2,
  Check,
  Trash2,
  ClipboardList,
  Calendar,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { toArabicDigits, formatArabicDate } from "@/lib/utils";
import {
  addStudentActivity,
  getStudentActivities,
  deleteStudentActivity,
} from "@/actions/profile";
import { SUPERVISOR_MANAGED_CATEGORY_IDS } from "@/lib/profile-types";
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
}

const CAT_TASMEE = 4;

type ActivityItem = {
  id: number;
  category: number;
  date: string;
  multiplier: number;
};

export default function ModeratorProfileView({ students, categories }: Props) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"points" | "name">("points");
  const [addActivityStudent, setAddActivityStudent] = useState<SupervisedStudent | null>(null);
  const [manageStudent, setManageStudent] = useState<SupervisedStudent | null>(null);

  // Stable so the modal's Escape listener is not rebound on every parent render
  const closeManage = useCallback(() => setManageStudent(null), []);

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
        <StatCard label="الطلاب المشرف عليهم" value={toArabicDigits(stats.total)} icon={<Users className="w-5 h-5" strokeWidth={2.2} />} accent />
        <StatCard label="إجمالي نقاط مجموعة التسميع" value={toArabicDigits(stats.totalPoints)} icon={<TrendingUp className="w-5 h-5" strokeWidth={2.2} />} />
        <StatCard label="متوسط النقاط" value={toArabicDigits(stats.avg)} icon={<Award className="w-5 h-5" strokeWidth={2.2} />} />
        <StatCard label="الطلاب النشطون" value={toArabicDigits(stats.activeStudents)} icon={<BookOpen className="w-5 h-5" strokeWidth={2.2} />} />
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
              placeholder="ابحث عن طالب بالاسم..."
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
              الأعلى نقاطاً
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
              {search ? "جرب البحث بكلمة مختلفة" : "لم يتم إسناد أي طلاب لإشرافك بعد"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Desktop header */}
            <div className="hidden md:flex bg-[#F7FBEA] border-b border-[#043F2E]/10 px-5 py-3 gap-3">
              <div className="w-[44px] shrink-0" />
              <div className="w-[170px] shrink-0"><span className={`${tajawal.className} text-[12px] font-bold text-[#043F2E]`}>الطالب</span></div>
              <div className="w-[90px] shrink-0 text-center"><span className={`${tajawal.className} text-[12px] font-bold text-[#043F2E]`}>الأنشطة</span></div>
              <div className="flex-1 text-center"><span className={`${tajawal.className} text-[12px] font-bold text-[#043F2E]`}>النقاط</span></div>
              <div className="w-[250px] shrink-0 text-center"><span className={`${tajawal.className} text-[12px] font-bold text-[#043F2E]`}>إجراءات</span></div>
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

                    {/* Name */}
                    <div className="w-[170px] shrink-0 min-w-0">
                      <p className={`${tajawal.className} text-sm font-bold text-[#043F2E] truncate`}>{fullName || student.username}</p>
                      <p className={`${tajawal.className} text-[10px] text-[#043F2E]/40`}>@{student.username}</p>
                    </div>

                    {/* Activities count */}
                    <div className="w-[90px] shrink-0 text-center">
                      <span className={`${tajawal.className} text-xs font-medium text-[#043F2E]/60`}>
                        {toArabicDigits(student.activities_count)} نشاط
                      </span>
                    </div>

                    {/* Points */}
                    <div className="flex-1 flex justify-center">
                      <span className={`${tajawal.className} min-w-[48px] h-9 px-3 flex items-center justify-center rounded-xl font-bold text-sm ${student.points > 0 ? "bg-[#BEE663] text-[#043F2E]" : "bg-[#F7FBEA] text-[#043F2E]/40"}`}>
                        {toArabicDigits(student.points)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="w-[250px] shrink-0 flex items-center justify-center gap-2">
                      <button
                        onClick={() => setAddActivityStudent(student)}
                        className={`${tajawal.className} inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#065f46] text-[#BEE663] text-xs font-bold hover:bg-[#043F2E] transition-colors`}
                      >
                        <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
                        نشاط
                      </button>
                      <button
                        onClick={() => setManageStudent(student)}
                        className={`${tajawal.className} inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#F7FBEA] border border-[#043F2E]/15 text-[#043F2E] text-xs font-bold whitespace-nowrap hover:bg-[#BEE663]/30 transition-colors`}
                      >
                        <ClipboardList className="w-3.5 h-3.5 shrink-0" strokeWidth={2.4} />
                        سجل الأنشطة
                      </button>
                      <Link
                        href={`/profile/${student.id}`}
                        aria-label={`عرض ملف ${fullName || student.username}`}
                        className={`${tajawal.className} inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#043F2E] text-white text-xs font-bold hover:bg-[#065f46] transition-colors`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" strokeWidth={2.4} />
                      </Link>
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
                        <p className={`${tajawal.className} text-base font-bold text-[#043F2E] truncate`}>{fullName || student.username}</p>
                        <p className={`${tajawal.className} text-[10px] text-[#043F2E]/40`}>
                          @{student.username} · {toArabicDigits(student.activities_count)} نشاط
                        </p>
                      </div>
                      <span className={`${tajawal.className} shrink-0 min-w-[48px] h-9 px-3 flex items-center justify-center rounded-xl font-bold text-sm ${student.points > 0 ? "bg-[#BEE663] text-[#043F2E]" : "bg-white text-[#043F2E]/40 border border-[#043F2E]/10"}`}>
                        {toArabicDigits(student.points)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAddActivityStudent(student)}
                        className={`${tajawal.className} flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-[#065f46] text-[#BEE663] text-xs font-bold hover:bg-[#043F2E] transition-colors`}
                      >
                        <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
                        نشاط
                      </button>
                      <button
                        onClick={() => setManageStudent(student)}
                        className={`${tajawal.className} flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-white border border-[#043F2E]/15 text-[#043F2E] text-xs font-bold hover:bg-[#BEE663]/30 transition-colors`}
                      >
                        <ClipboardList className="w-3.5 h-3.5" strokeWidth={2.4} />
                        السجل
                      </button>
                      <Link
                        href={`/profile/${student.id}`}
                        aria-label={`عرض ملف ${fullName || student.username}`}
                        className={`${tajawal.className} flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-[#043F2E] text-white text-xs font-bold hover:bg-[#065f46] transition-colors`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" strokeWidth={2.4} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Activity Modal */}
      {addActivityStudent && (
        <AddActivityModal
          student={addActivityStudent}
          categories={categories}
          onClose={() => setAddActivityStudent(null)}
        />
      )}

      {/* Activity Log Modal */}
      {manageStudent && (
        <ActivityLogModal
          key={manageStudent.id}
          student={manageStudent}
          categories={categories}
          onClose={closeManage}
        />
      )}
    </div>
  );
}

// ============================
// Activity Log Modal — review and remove recitation/reading activities
// ============================
function ActivityLogModal({
  student,
  categories,
  onClose,
}: {
  student: SupervisedStudent;
  categories: ActivityCategory[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(false);

  const fullName = `${student.first_name} ${student.last_name}`.trim() || student.username;
  const initials = `${student.first_name?.charAt(0) || ""}${student.last_name?.charAt(0) || ""}`.trim();
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const isDeleting = deletingId !== null;

  // Read by the Escape handler, which is bound once and cannot see fresh state
  busyRef.current = isDeleting;

  // Don't let a delete get abandoned halfway
  const requestClose = () => {
    if (!busyRef.current) onClose();
  };

  useEffect(() => {
    let active = true;
    getStudentActivities(student.id).then((res) => {
      if (!active) return;
      if (res.success && res.data) {
        // A supervisor only manages recitation and reading; the rest is the control board's
        setActivities(
          res.data
            .filter((a) => SUPERVISOR_MANAGED_CATEGORY_IDS.includes(a.category))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        );
      } else {
        setError(res.error || "تعذّر تحميل الأنشطة");
      }
    });
    return () => {
      active = false;
    };
  }, [student.id]);

  // The dialog takes focus on open, and the button that opened it gets focus back on close
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

  const handleDelete = async (activityId: number) => {
    setError(null);
    setDeletingId(activityId);
    try {
      const res = await deleteStudentActivity(student.id, activityId);
      if (res.success) {
        setActivities((prev) => (prev ?? []).filter((a) => a.id !== activityId));
        setConfirmingId(null);
        router.refresh();
      } else {
        setError(res.error || "فشل حذف النشاط");
      }
    } catch {
      setError("تعذّر الاتصال، حاول مرة أخرى");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#043F2E]/40 p-4" onClick={requestClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`سجل أنشطة ${fullName}`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] max-h-[85vh] overflow-y-auto bg-white rounded-3xl border border-[#043F2E]/10 shadow-lg p-5 flex flex-col gap-4"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#043F2E] flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-[#BEE663]" strokeWidth={2.4} />
            </div>
            <h3 className={`${lalezar.className} text-lg text-[#043F2E]`}>سجل الأنشطة</h3>
          </div>
          <button
            ref={closeRef}
            onClick={requestClose}
            disabled={isDeleting}
            aria-label="إغلاق"
            className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-[#043F2E]/60 hover:bg-[#F7FBEA] hover:text-[#043F2E] transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" strokeWidth={2.2} />
          </button>
        </div>

        {/* Student info */}
        <div className="flex items-center gap-3 bg-[#F7FBEA] rounded-2xl border border-[#043F2E]/8 px-4 py-3">
          <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-[#043F2E] to-[#065f46] flex items-center justify-center text-white shadow-sm">
            <span className={`${tajawal.className} text-xs font-bold`}>{initials || <User className="w-4 h-4" strokeWidth={2.2} />}</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className={`${tajawal.className} text-sm font-bold text-[#043F2E] truncate`}>{fullName}</span>
            <span className={`${tajawal.className} text-[10px] text-[#043F2E]/60`}>@{student.username}</span>
          </div>
        </div>

        {/* Scope note — the log deliberately shows only what a supervisor may change */}
        <p className={`${tajawal.className} text-[11px] text-[#043F2E]/60 leading-relaxed`}>
          تظهر هنا أنشطة التسميع والقراءة فقط، وهي ما يمكنك إضافته أو حذفه. باقي الأنشطة تُدار من لوحة التحكم.
        </p>

        {/* Error */}
        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-xl bg-[#F4E0D6] border border-[#9B3D2E]/30 px-3 py-2.5">
            <AlertCircle className="w-4 h-4 text-[#9B3D2E] shrink-0" strokeWidth={2.2} />
            <span className={`${tajawal.className} text-xs text-[#9B3D2E]`}>{error}</span>
          </div>
        )}

        {activities === null && !error ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded-2xl bg-[#F7FBEA] animate-pulse" />
            ))}
          </div>
        ) : activities === null ? null : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F7FBEA] flex items-center justify-center mb-3">
              <Inbox className="w-6 h-6 text-[#043F2E]/40" strokeWidth={1.8} />
            </div>
            <p className={`${tajawal.className} text-sm text-[#043F2E]/60`}>لا توجد أنشطة تسميع أو قراءة</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {activities.map((act) => {
              const cat = categoryById.get(act.category);
              const activityName = cat?.name ?? "نشاط";
              const activityDate = formatArabicDate(act.date);
              const isConfirming = confirmingId === act.id;
              const isRowDeleting = deletingId === act.id;

              return (
                <div
                  key={act.id}
                  className="bg-[#F7FBEA] rounded-2xl border border-[#043F2E]/8 px-4 py-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className={`${tajawal.className} text-sm font-bold text-[#043F2E] truncate`}>
                      {activityName}
                    </p>
                    <p className={`${tajawal.className} text-[11px] text-[#043F2E]/60 flex items-center gap-1`}>
                      <Calendar className="w-3 h-3" strokeWidth={2.2} />
                      {activityDate}
                    </p>
                  </div>

                  {/* Points come from the category; with no category loaded there is no honest number to show */}
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
                        disabled={isDeleting}
                        className={`${tajawal.className} h-8 px-2.5 rounded-lg bg-[#9B3D2E] text-white text-[11px] font-bold hover:bg-[#9B3D2E]/90 transition-colors disabled:opacity-50 flex items-center gap-1`}
                      >
                        {isRowDeleting ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2.5} /> : <Check className="w-3 h-3" strokeWidth={2.5} />}
                        تأكيد الحذف
                      </button>
                      <button
                        onClick={() => setConfirmingId(null)}
                        disabled={isDeleting}
                        className="w-8 h-8 rounded-lg bg-white border border-[#043F2E]/15 flex items-center justify-center text-[#043F2E]/60 hover:text-[#043F2E] transition-colors disabled:opacity-50"
                        aria-label="إلغاء الحذف"
                      >
                        <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingId(act.id)}
                      disabled={isDeleting}
                      className="w-8 h-8 shrink-0 rounded-lg bg-white border border-[#043F2E]/15 flex items-center justify-center text-[#043F2E]/60 hover:border-[#9B3D2E]/40 hover:text-[#9B3D2E] transition-colors disabled:opacity-50"
                      aria-label={`حذف ${activityName} بتاريخ ${activityDate}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} />
                    </button>
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
// Add Activity Modal
// ============================
function AddActivityModal({
  student,
  categories,
  onClose,
}: {
  student: SupervisedStudent;
  categories: ActivityCategory[];
  onClose: () => void;
}) {
  const router = useRouter();
  // Categories a supervisor may record, with labels + values from the API
  const availableCategories = SUPERVISOR_MANAGED_CATEGORY_IDS.map((id) =>
    categories.find((c) => c.id === id),
  ).filter((c): c is ActivityCategory => Boolean(c));

  const [categoryId, setCategoryId] = useState<number>(
    availableCategories[0]?.id ?? CAT_TASMEE,
  );
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const fullName = `${student.first_name} ${student.last_name}`.trim() || student.username;
  const initials = `${student.first_name?.charAt(0) || ""}${student.last_name?.charAt(0) || ""}`.trim();
  const selectedCategory = availableCategories.find((c) => c.id === categoryId);

  const handleSubmit = () => {
    setResult(null);
    startTransition(async () => {
      const res = await addStudentActivity(student.id, categoryId, 1);
      if (res.success) {
        setResult({
          success: true,
          message: `تم تسجيل ${selectedCategory?.name ?? "النشاط"} لـ ${fullName}`,
        });
        router.refresh();
        setTimeout(onClose, 1500);
      } else {
        setResult({ success: false, message: res.error || "فشل تسجيل النشاط" });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#043F2E]/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="إضافة نشاط"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[380px] bg-white rounded-3xl border border-[#043F2E]/10 shadow-lg p-5 flex flex-col gap-5"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#065f46] flex items-center justify-center">
              <Plus className="w-4 h-4 text-[#BEE663]" strokeWidth={2.4} />
            </div>
            <h3 className={`${lalezar.className} text-lg text-[#043F2E]`}>إضافة نشاط</h3>
          </div>
          <button onClick={onClose} disabled={isPending} className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-[#043F2E]/60 hover:bg-[#F7FBEA] hover:text-[#043F2E] transition-colors disabled:opacity-50">
            <X className="w-4 h-4" strokeWidth={2.2} />
          </button>
        </div>

        {/* Student info */}
        <div className="flex items-center gap-3 bg-[#F7FBEA] rounded-2xl border border-[#043F2E]/8 px-4 py-3">
          <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-[#043F2E] to-[#065f46] flex items-center justify-center text-white shadow-sm">
            <span className={`${tajawal.className} text-xs font-bold`}>{initials || <User className="w-4 h-4" strokeWidth={2.2} />}</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className={`${tajawal.className} text-sm font-bold text-[#043F2E] truncate`}>{fullName}</span>
            <span className={`${tajawal.className} text-[10px] text-[#043F2E]/50`}>@{student.username}</span>
          </div>
        </div>

        {/* Category selector */}
        <div className="flex flex-col gap-2">
          <label className={`${tajawal.className} text-xs font-bold text-[#043F2E]/70`}>نوع النشاط</label>
          <div className="grid grid-cols-2 gap-2">
            {availableCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryId(cat.id)}
                disabled={isPending}
                className={`${tajawal.className} flex flex-col items-center gap-1.5 h-auto py-3 rounded-2xl border-2 text-xs font-bold transition-all ${
                  categoryId === cat.id
                    ? "border-[#043F2E] bg-[#043F2E] text-white"
                    : "border-[#043F2E]/15 bg-[#F7FBEA] text-[#043F2E]/70 hover:border-[#043F2E]/40"
                } disabled:opacity-50`}
              >
                {cat.id === CAT_TASMEE ? (
                  <BookMarked className="w-4 h-4" strokeWidth={2.2} />
                ) : (
                  <BookOpen className="w-4 h-4" strokeWidth={2.2} />
                )}
                {cat.name}
                <span className={`text-[10px] font-medium ${categoryId === cat.id ? "text-[#BEE663]" : "text-[#043F2E]/40"}`}>
                  +{toArabicDigits(cat.value)} نقطة
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Points preview */}
        <div className="flex items-center justify-center gap-1.5">
          <span className={`${tajawal.className} text-[11px] text-[#043F2E]/50`}>النقاط المسجلة:</span>
          <span className={`${tajawal.className} text-sm font-bold text-[#043F2E] bg-[#BEE663] rounded-full px-2 py-0.5`}>
            +{toArabicDigits(selectedCategory?.value ?? 0)}
          </span>
        </div>

        {/* Result message */}
        {result && (
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 ${result.success ? "bg-[#DEFF90] border border-[#9ADD00]/40 text-[#043F2E]" : "bg-[#F4E0D6] border border-[#9B3D2E]/30 text-[#9B3D2E]"}`}>
            {result.success ? <Check className="w-4 h-4 shrink-0" strokeWidth={2.5} /> : <X className="w-4 h-4 shrink-0" strokeWidth={2.5} />}
            <span className={`${tajawal.className} text-xs`}>{result.message}</span>
          </div>
        )}

        {/* Submit */}
        <button onClick={handleSubmit} disabled={isPending || !selectedCategory} className={`${tajawal.className} h-12 rounded-xl bg-[#043F2E] text-white text-sm font-bold hover:bg-[#065f46] transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}>
          {isPending ? (<><Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />جارٍ التسجيل...</>) : (<><Plus className="w-4 h-4" strokeWidth={2.4} />تسجيل النشاط</>)}
        </button>
      </div>
    </div>
  );
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
