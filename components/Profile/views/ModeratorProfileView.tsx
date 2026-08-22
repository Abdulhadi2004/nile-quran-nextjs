"use client";

import { useState, useMemo, useTransition } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { toArabicDigits } from "@/lib/utils";
import { addStudentActivity } from "@/actions/profile";
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

// Categories a recitation supervisor may record for their students
const CAT_QURAN_READING = 3;
const CAT_TASMEE = 4;
const SUPERVISOR_CATEGORY_IDS = [CAT_TASMEE, CAT_QURAN_READING];

export default function ModeratorProfileView({ students, categories }: Props) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"points" | "name">("points");
  const [addActivityStudent, setAddActivityStudent] = useState<SupervisedStudent | null>(null);

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
              <div className="w-[220px] shrink-0"><span className={`${tajawal.className} text-[12px] font-bold text-[#043F2E]`}>الطالب</span></div>
              <div className="w-[120px] shrink-0 text-center"><span className={`${tajawal.className} text-[12px] font-bold text-[#043F2E]`}>الأنشطة</span></div>
              <div className="flex-1 text-center"><span className={`${tajawal.className} text-[12px] font-bold text-[#043F2E]`}>النقاط</span></div>
              <div className="w-[170px] shrink-0 text-center"><span className={`${tajawal.className} text-[12px] font-bold text-[#043F2E]`}>إجراءات</span></div>
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
                    <div className="w-[220px] shrink-0 min-w-0">
                      <p className={`${tajawal.className} text-sm font-bold text-[#043F2E] truncate`}>{fullName || student.username}</p>
                      <p className={`${tajawal.className} text-[10px] text-[#043F2E]/40`}>@{student.username}</p>
                    </div>

                    {/* Activities count */}
                    <div className="w-[120px] shrink-0 text-center">
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
                    <div className="w-[170px] shrink-0 flex items-center justify-center gap-2">
                      <button
                        onClick={() => setAddActivityStudent(student)}
                        className={`${tajawal.className} inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#065f46] text-[#BEE663] text-xs font-bold hover:bg-[#043F2E] transition-colors`}
                      >
                        <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
                        نشاط
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
  const availableCategories = SUPERVISOR_CATEGORY_IDS.map((id) =>
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
