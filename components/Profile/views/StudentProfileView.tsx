"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Lalezar, Tajawal } from "next/font/google";
import {
  Sparkles,
  Target,
  Trophy,
  Activity,
  BookOpen,
  Award,
  UserCheck,
  UserPlus,
  Calendar,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Info,
  PieChart,
  Users,
  AlertCircle,
} from "lucide-react";
import ProfileActivityList from "../ProfileActivityList";
import { cn, toArabicDigits, getHijriMonth, formatArabicDate } from "@/lib/utils";
import { gregorianToHijri } from "@tabby_ai/hijri-converter";
import type { UserActivity } from "@/lib/profile-types";
import {
  getUserPointsForMonth,
  getStudentRank,
  type CirclePeer,
} from "@/actions/profile";
import Link from "next/link";

const lalezar = Lalezar({ subsets: ["arabic"], weight: "400" });
const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

interface Category {
  id: number;
  name: string;
  value: number;
}

interface Props {
  userId: number;
  initialYear: number;
  initialMonth: number;
  initialPoints: number;
  initialActivities: UserActivity[];
  initialRank?: number | null;
  categories: Category[];
  peers: CirclePeer[];
  supervisorName?: string;
  supervisorId?: number | null;
  referrerName?: string;
  referrerId?: number | null;
  dateJoined?: string;
}

// Brand palette for pie slices (approved tokens only)
const PIE_COLORS = ["#043F2E", "#9ADD00", "#BEE663", "#065f46", "#DEFF90", "#2A5A45"];

export default function StudentProfileView({
  userId,
  initialYear,
  initialMonth,
  initialPoints,
  initialActivities,
  initialRank,
  categories,
  peers,
  supervisorName,
  supervisorId,
  referrerName,
  referrerId,
  dateJoined,
}: Props) {
  const now = new Date();
  const hijriToday = gregorianToHijri({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  });

  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [points, setPoints] = useState(initialPoints);
  const [activities, setActivities] = useState<UserActivity[]>(initialActivities);
  const [rank, setRank] = useState<number | null | undefined>(initialRank);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isCurrentMonth = year === hijriToday.year && month === hijriToday.month;
  const monthLabel = `${getHijriMonth(month - 1)} ${toArabicDigits(year)}`;

  const goToMonth = useCallback(
    (nextYear: number, nextMonth: number) => {
      setYear(nextYear);
      setMonth(nextMonth);

      // The month we arrived on is already on screen from the server render
      if (nextYear === initialYear && nextMonth === initialMonth) {
        setPoints(initialPoints);
        setActivities(initialActivities);
        setRank(initialRank);
        setLoadError(null);
        return;
      }

      setLoading(true);
      setLoadError(null);
      Promise.all([
        getUserPointsForMonth(userId, nextYear, nextMonth),
        getStudentRank(userId, nextYear, nextMonth),
      ])
        .then(([monthRes, rankRes]) => {
          if (!monthRes.success || !monthRes.data) {
            setLoadError(monthRes.error || "تعذّر تحميل نقاط الشهر");
            return;
          }
          const byId = new Map(categories.map((c) => [c.id, c]));
          setPoints(monthRes.data.points);
          setActivities(
            monthRes.data.activities.map((a) => ({
              ...a,
              category_name: byId.get(a.category)?.name,
              points: (byId.get(a.category)?.value ?? 0) * a.multiplier,
            })),
          );
          setRank(rankRes.success ? rankRes.data : null);
        })
        .catch(() => setLoadError("تعذّر الاتصال، حاول مرة أخرى"))
        .finally(() => setLoading(false));
    },
    [userId, categories, initialYear, initialMonth, initialPoints, initialActivities, initialRank],
  );

  const goPrev = () =>
    month === 1 ? goToMonth(year - 1, 12) : goToMonth(year, month - 1);
  const goNext = () => {
    if (isCurrentMonth) return;
    month === 12 ? goToMonth(year + 1, 1) : goToMonth(year, month + 1);
  };

  const recentActivities = [...activities]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  // Group activities by category
  const categoryMap = new Map<number, { count: number; points: number; name?: string }>();
  for (const a of activities) {
    const existing = categoryMap.get(a.category) || { count: 0, points: 0, name: a.category_name };
    existing.count++;
    existing.points += a.points || 0;
    categoryMap.set(a.category, existing);
  }

  const pieSlices: PieSlice[] = Array.from(categoryMap.entries()).map(([catId, info], i) => ({
    id: catId,
    name: info.name || "نشاط",
    count: info.count,
    points: info.points,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const hasInfo = Boolean(supervisorName || referrerName || dateJoined);

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      {/* Month navigator — everything below it belongs to the month it names */}
      <div className="bg-white rounded-3xl border border-[#043F2E]/10 shadow-sm px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#F7FBEA] text-[#043F2E] flex items-center justify-center shrink-0">
            <CalendarRange className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className={`${lalezar.className} text-lg text-[#043F2E] leading-tight truncate`}>
              {monthLabel} هـ
            </p>
            <p className={`${tajawal.className} text-[11px] text-[#043F2E]/60`}>
              {isCurrentMonth ? "الشهر الحالي" : "شهر سابق"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#F7FBEA] border border-[#043F2E]/15 rounded-2xl p-1.5 shrink-0">
          <button
            onClick={goPrev}
            disabled={loading}
            aria-label="الشهر السابق"
            className="w-10 h-10 rounded-xl bg-white hover:bg-[#BEE663] text-[#043F2E] flex items-center justify-center transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" strokeWidth={2.4} aria-hidden="true" />
          </button>
          <button
            onClick={goNext}
            disabled={loading || isCurrentMonth}
            aria-label="الشهر التالي"
            className="w-10 h-10 rounded-xl bg-white hover:bg-[#BEE663] text-[#043F2E] flex items-center justify-center transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-2xl bg-[#F4E0D6] border border-[#9B3D2E]/30 px-4 py-3"
        >
          <AlertCircle className="w-4 h-4 text-[#9B3D2E] shrink-0" strokeWidth={2.2} />
          <span className={`${tajawal.className} text-xs text-[#9B3D2E]`}>{loadError}</span>
        </div>
      )}

      {/* Hero stats banner — all three now describe the selected month */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <HeroStat
          label="نقاط الشهر"
          value={toArabicDigits(points)}
          icon={<Trophy className="w-5 h-5" strokeWidth={2.2} />}
          accent
          loading={loading}
        />
        <HeroStat
          label="أنشطة الشهر"
          value={toArabicDigits(activities.length)}
          icon={<Activity className="w-5 h-5" strokeWidth={2.2} />}
          loading={loading}
        />
        <HeroStat
          label="ترتيبي في الشهر"
          value={rank ? toArabicDigits(rank) : "—"}
          icon={<Award className="w-5 h-5" strokeWidth={2.2} />}
          loading={loading}
        />
      </div>

      {/* Info section — supervisor, referrer, date joined */}
      <div className="bg-white rounded-3xl border border-[#043F2E]/10 shadow-sm p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#F7FBEA] text-[#043F2E]/70 flex items-center justify-center shrink-0">
            <Info className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
          </div>
          <h3 className={`${lalezar.className} text-lg text-[#043F2E] leading-none`}>معلومات</h3>
        </div>
        {hasInfo ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {supervisorName && (
              supervisorId ? (
                <Link
                  href={`/profile/${supervisorId}`}
                  className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#043F2E] focus-visible:ring-offset-2"
                >
                  <InfoCard
                    icon={<UserCheck className="w-4 h-4" strokeWidth={2.2} />}
                    label="المشرف"
                    value={supervisorName}
                    clickable
                  />
                </Link>
              ) : (
                <InfoCard
                  icon={<UserCheck className="w-4 h-4" strokeWidth={2.2} />}
                  label="المشرف"
                  value={supervisorName}
                />
              )
            )}
            {referrerName && (
              referrerId ? (
                <Link
                  href={`/profile/${referrerId}`}
                  className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#043F2E] focus-visible:ring-offset-2"
                >
                  <InfoCard
                    icon={<UserPlus className="w-4 h-4" strokeWidth={2.2} />}
                    label="بدعوة من"
                    value={referrerName}
                    clickable
                  />
                </Link>
              ) : (
                <InfoCard
                  icon={<UserPlus className="w-4 h-4" strokeWidth={2.2} />}
                  label="بدعوة من"
                  value={referrerName}
                />
              )
            )}
            {dateJoined && (
              <InfoCard
                icon={<Calendar className="w-4 h-4" strokeWidth={2.2} />}
                label="تاريخ الانضمام"
                value={formatArabicDate(dateJoined)}
              />
            )}
          </div>
        ) : (
          <p className={`${tajawal.className} text-xs text-[#043F2E]/50`}>
            لا توجد معلومات إضافية بعد
          </p>
        )}
      </div>

      {/* Circle peers — the people you memorise alongside. Names only, on purpose:
          a number beside each name would turn this into a small leaderboard. */}
      {supervisorName && (
        <div className="bg-white rounded-3xl border border-[#043F2E]/10 shadow-sm p-5 md:p-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#F7FBEA] text-[#043F2E]/70 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
            </div>
            <h3 className={`${lalezar.className} text-lg text-[#043F2E] leading-none`}>
              زملاء حلقتي
            </h3>
          </div>
          <p className={`${tajawal.className} text-[11px] text-[#043F2E]/60 mb-4`}>
            في حلقة {supervisorName}
          </p>

          {peers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {peers.map((peer) => (
                <Link
                  key={peer.id}
                  href={`/profile/${peer.id}`}
                  className={`${tajawal.className} inline-flex items-center h-9 px-3.5 rounded-xl bg-[#F7FBEA] border border-[#043F2E]/10 text-sm font-medium text-[#043F2E] hover:bg-[#BEE663]/30 hover:border-[#043F2E]/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#043F2E] focus-visible:ring-offset-2`}
                >
                  {peer.fullName}
                </Link>
              ))}
            </div>
          ) : (
            <p className={`${tajawal.className} text-xs text-[#043F2E]/60`}>
              أنت أول من انضم إلى هذه الحلقة
            </p>
          )}
        </div>
      )}

      {/* Progress + points breakdown pie chart */}
      <div className="bg-white rounded-3xl border border-[#043F2E]/10 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-l from-[#043F2E] to-[#065f46] px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#BEE663] flex items-center justify-center shrink-0">
              <Target className="w-4 h-4 text-[#043F2E]" strokeWidth={2.4} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className={`${lalezar.className} text-lg text-white leading-tight truncate`}>
                {isCurrentMonth ? "تقدمي هذا الشهر" : "تقدمي في ذلك الشهر"}
              </h3>
              <p className={`${tajawal.className} text-[11px] text-[#BEE663]/80 truncate`}>
                {monthLabel} هـ
              </p>
            </div>
          </div>
          <div className="text-left shrink-0">
            <span className={`${lalezar.className} text-3xl text-[#BEE663]`}>
              {toArabicDigits(points)}
            </span>
            <span className={`${tajawal.className} text-xs text-white/60 mr-1`}>نقطة</span>
          </div>
        </div>

        {/* Points breakdown — pie chart */}
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#043F2E]/60" strokeWidth={2.2} aria-hidden="true" />
            <h4 className={`${tajawal.className} text-sm font-bold text-[#043F2E]`}>توزيع النقاط</h4>
          </div>
          {pieSlices.length > 0 ? (
            <PointsPieChart slices={pieSlices} totalPoints={points} />
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-6 gap-2">
              <div className="w-12 h-12 rounded-2xl bg-[#F7FBEA] flex items-center justify-center">
                <PieChart className="w-5 h-5 text-[#043F2E]/40" strokeWidth={1.8} aria-hidden="true" />
              </div>
              <p className={`${tajawal.className} text-xs text-[#043F2E]/50`}>
                {isCurrentMonth
                  ? "سيظهر توزيع نقاطك هنا بعد تسجيل أول نشاط"
                  : "لا توجد أنشطة مسجّلة في هذا الشهر"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent activities */}
      <div className="bg-white rounded-3xl border border-[#043F2E]/10 shadow-sm p-5 md:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#BEE663] text-[#043F2E] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
            </div>
            <h3 className={`${lalezar.className} text-lg text-[#043F2E] truncate`}>آخر الأنشطة</h3>
          </div>
          <span className={`${tajawal.className} text-xs text-[#043F2E]/40 shrink-0`}>
            {toArabicDigits(recentActivities.length)} من {toArabicDigits(activities.length)}
          </span>
        </div>
        <ProfileActivityList
          activities={recentActivities}
          emptyMessage={
            isCurrentMonth ? "لم تسجّل أي نشاط هذا الشهر بعد" : "لا توجد أنشطة في هذا الشهر"
          }
        />
      </div>
    </div>
  );
}

// ============================
// Points Pie Chart (interactive SVG donut)
// ============================
interface PieSlice {
  id: number;
  name: string;
  count: number;
  points: number;
  color: string;
}

// Donut geometry, in viewBox units (viewBox is 0 0 200 200)
const CX = 100;
const CY = 100;
const R_OUT = 80; // visible outer radius
const R_IN = 54; // visible inner radius (the hole)
const R_HIT_OUT = 92; // invisible hit area — widens the tap target to ~44px on mobile
const R_HIT_IN = 50;
const R_MARKER = 87; // thin arc drawn outside a highlighted slice

const round2 = (v: number) => Math.round(v * 100) / 100;

function polar(radius: number, angle: number) {
  return { x: round2(CX + radius * Math.cos(angle)), y: round2(CY + radius * Math.sin(angle)) };
}

// Annular wedge between two angles
function wedgePath(rOut: number, rIn: number, start: number, end: number) {
  const largeArc = end - start > Math.PI ? 1 : 0;
  const a = polar(rOut, start);
  const b = polar(rOut, end);
  const c = polar(rIn, end);
  const d = polar(rIn, start);
  return `M ${a.x} ${a.y} A ${rOut} ${rOut} 0 ${largeArc} 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${rIn} ${rIn} 0 ${largeArc} 0 ${d.x} ${d.y} Z`;
}

// Full ring (single category owning 100% of the points) — outer circle with the
// inner circle punched out via fill-rule="evenodd"
function ringPath(rOut: number, rIn: number) {
  return `${circlePath(rOut)} Z ${circlePath(rIn)} Z`;
}

function circlePath(radius: number) {
  return `M ${CX} ${round2(CY - radius)} A ${radius} ${radius} 0 1 1 ${CX} ${round2(CY + radius)} A ${radius} ${radius} 0 1 1 ${CX} ${round2(CY - radius)}`;
}

function markerPath(start: number, end: number, full: boolean) {
  if (full) return circlePath(R_MARKER);
  const largeArc = end - start > Math.PI ? 1 : 0;
  const a = polar(R_MARKER, start);
  const b = polar(R_MARKER, end);
  return `M ${a.x} ${a.y} A ${R_MARKER} ${R_MARKER} 0 ${largeArc} 1 ${b.x} ${b.y}`;
}

// prefers-reduced-motion, resolved after mount so SSR and the first client
// render agree (no hydration mismatch)
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function PointsPieChart({ slices, totalPoints }: { slices: PieSlice[]; totalPoints: number }) {
  const reduceMotion = useReducedMotion();
  // `selectedId` is the pinned slice (click / Enter / Space).
  // `previewId` is the lighter hover / focus preview.
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);

  const total = slices.reduce((s, x) => s + x.points, 0);

  const arcs = useMemo(() => {
    if (total <= 0) return [];
    let angle = -Math.PI / 2;
    return slices
      .filter((s) => s.points > 0)
      .map((s) => {
        const frac = s.points / total;
        const start = angle;
        const end = angle + frac * Math.PI * 2;
        angle = end;
        const full = frac >= 0.999;
        return {
          slice: s,
          full,
          d: full ? ringPath(R_OUT, R_IN) : wedgePath(R_OUT, R_IN, start, end),
          hitD: full ? ringPath(R_HIT_OUT, R_HIT_IN) : wedgePath(R_HIT_OUT, R_HIT_IN, start, end),
          markerD: markerPath(start, end, full),
        };
      });
  }, [slices, total]);

  const clear = useCallback(() => {
    setSelectedId(null);
    setPreviewId(null);
  }, []);

  // Clicking away (anywhere that is not a slice or a legend row) or pressing
  // Escape returns the chart to the neutral "total" state.
  useEffect(() => {
    if (selectedId === null) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target && typeof target.closest === "function" && target.closest("[data-pie-item]")) return;
      clear();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") clear();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedId, clear]);

  // All slices zero points — nothing to draw
  if (total <= 0) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-4 justify-center py-2">
        <svg
          viewBox="0 0 200 200"
          className="w-[120px] h-[120px] shrink-0"
          role="img"
          aria-label="لا توجد نقاط مسجّلة بعد"
        >
          <path d={ringPath(R_OUT, R_IN)} fillRule="evenodd" fill="#043F2E" fillOpacity={0.08} />
        </svg>
        <p className={`${tajawal.className} text-xs text-[#043F2E]/50 text-center sm:text-start`}>
          لا توجد نقاط مسجّلة بعد — سجّل نشاطك الأول ليظهر توزيع نقاطك هنا
        </p>
      </div>
    );
  }

  const percentOf = (p: number) => Math.round((p / total) * 100);
  const highlightId = selectedId ?? previewId;
  const highlighted = highlightId !== null ? slices.find((s) => s.id === highlightId) ?? null : null;

  const previewOnly = (id: number) => setPreviewId(id);
  const previewOff = (id: number) => setPreviewId((prev) => (prev === id ? null : prev));
  const toggle = (id: number) => setSelectedId((prev) => (prev === id ? null : id));

  // Growth. With reduced motion the slice never grows and nothing transitions —
  // the marker arc + dimming carry the highlight instead.
  // Kept separate from opacity so the focus-ring paths can keep using their
  // `peer-focus-visible:opacity-*` classes (an inline opacity would win over them).
  const motionStyle = (id: number): React.CSSProperties => {
    const isHighlighted = highlightId === id;
    const scale = reduceMotion ? 1 : isHighlighted ? (selectedId === id ? 1.075 : 1.035) : 1;
    return {
      transform: `scale(${scale})`,
      transformOrigin: `${CX}px ${CY}px`,
      transformBox: "view-box",
      transition: reduceMotion
        ? undefined
        : "transform 260ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity 200ms ease-out",
    };
  };

  const sliceOpacity = (id: number) => {
    const isDimmed = highlightId !== null && highlightId !== id;
    if (!isDimmed) return 1;
    return selectedId !== null ? 0.3 : 0.5;
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* Donut */}
        <div className="relative shrink-0">
          <svg
            viewBox="0 0 200 200"
            className="w-[208px] h-[208px] sm:w-[224px] sm:h-[224px] overflow-visible"
            role="group"
            aria-label="توزيع النقاط حسب النشاط"
          >
            {arcs.map(({ slice, d, hitD, markerD }) => {
              const style = motionStyle(slice.id);
              const isHighlighted = highlightId === slice.id;
              const percent = percentOf(slice.points);
              return (
                <g key={slice.id}>
                  {/* Invisible, wider hit area — also the focusable control */}
                  <path
                    d={hitD}
                    fill="transparent"
                    fillRule="evenodd"
                    role="button"
                    tabIndex={0}
                    aria-pressed={selectedId === slice.id}
                    aria-label={`${slice.name}: النقاط ${toArabicDigits(slice.points)}، النسبة ${toArabicDigits(percent)} بالمئة من إجمالي النقاط`}
                    data-pie-item=""
                    className="peer cursor-pointer outline-none"
                    style={style}
                    onClick={() => toggle(slice.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
                        e.preventDefault();
                        toggle(slice.id);
                      }
                    }}
                    onPointerEnter={() => previewOnly(slice.id)}
                    onPointerLeave={() => previewOff(slice.id)}
                    onFocus={() => previewOnly(slice.id)}
                    onBlur={() => previewOff(slice.id)}
                  />

                  {/* The visible slice */}
                  <path
                    d={d}
                    fill={slice.color}
                    fillRule="evenodd"
                    stroke="#FFFFFF"
                    strokeWidth={arcs.length > 1 ? 2 : 0}
                    strokeLinejoin="round"
                    className="pointer-events-none"
                    style={{ ...style, opacity: sliceOpacity(slice.id) }}
                    aria-hidden="true"
                  />

                  {/* Highlight marker — a thin arc in the slice's own colour,
                      readable on white in every palette tone and independent of
                      the growth animation */}
                  <path
                    d={markerD}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={3}
                    strokeLinecap="round"
                    className="pointer-events-none"
                    style={{
                      ...style,
                      opacity: isHighlighted ? 1 : 0,
                    }}
                    aria-hidden="true"
                  />

                  {/* Keyboard focus ring — white underlay + dark outline so it
                      stays visible on both the dark and the lime slices */}
                  <path
                    d={d}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={5}
                    className="pointer-events-none opacity-0 peer-focus-visible:opacity-100"
                    style={style}
                    aria-hidden="true"
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke="#043F2E"
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    className="pointer-events-none opacity-0 peer-focus-visible:opacity-100"
                    style={style}
                    aria-hidden="true"
                  />
                </g>
              );
            })}
          </svg>

          {/* Centre readout — the active activity's own numbers, or the total */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="flex flex-col items-center justify-center text-center max-w-[52%]"
            >
              {highlighted ? (
                <>
                  <span
                    className="w-2.5 h-2.5 rounded-full mb-1 shrink-0"
                    style={{ backgroundColor: highlighted.color }}
                  />
                  <span
                    className={`${tajawal.className} text-[10px] font-bold text-[#043F2E]/70 leading-tight line-clamp-2`}
                  >
                    {highlighted.name}
                  </span>
                  <span className={`${lalezar.className} text-[22px] text-[#043F2E] leading-none mt-1`}>
                    +{toArabicDigits(highlighted.points)}
                  </span>
                  <span className={`${tajawal.className} text-[9px] text-[#043F2E]/50 mt-0.5`}>
                    نقطة · {toArabicDigits(percentOf(highlighted.points))}٪
                  </span>
                </>
              ) : (
                <>
                  <span className={`${lalezar.className} text-[28px] text-[#043F2E] leading-none`}>
                    {toArabicDigits(totalPoints)}
                  </span>
                  <span className={`${tajawal.className} text-[10px] text-[#043F2E]/50 mt-0.5`}>
                    نقطة
                  </span>
                  <span className={`${tajawal.className} text-[9px] text-[#043F2E]/40 mt-1`}>
                    الإجمالي
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Legend — stays in sync with the chart in both directions */}
        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-2">
          {slices.map((s) => {
            const percent = total > 0 ? percentOf(s.points) : 0;
            const interactive = s.points > 0;
            const isHighlighted = highlightId === s.id;
            const isSelected = selectedId === s.id;
            const isDimmed = highlightId !== null && !isHighlighted;

            const body = (
              <>
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      "rounded-full shrink-0",
                      reduceMotion ? "" : "transition-all duration-200",
                      isHighlighted ? "w-3.5 h-3.5" : "w-3 h-3",
                    )}
                    style={{ backgroundColor: s.color }}
                  />
                  <span
                    className={cn(
                      tajawal.className,
                      "text-xs font-medium truncate",
                      isHighlighted ? "text-[#043F2E] font-bold" : "text-[#043F2E]/70",
                    )}
                  >
                    {s.name}
                  </span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className={`${tajawal.className} text-[10px] text-[#043F2E]/50`}>
                    {toArabicDigits(percent)}٪
                  </span>
                  <span
                    className={`${tajawal.className} text-xs font-bold text-[#043F2E] bg-[#BEE663] rounded-full px-2 py-0.5`}
                  >
                    +{toArabicDigits(s.points)}
                  </span>
                </span>
              </>
            );

            const base =
              "w-full min-h-[44px] flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-start";

            if (!interactive) {
              // A category with no points has no slice to highlight — keep the
              // row visible but inert.
              return (
                <div
                  key={s.id}
                  className={cn(base, "bg-[#F7FBEA] border-[#043F2E]/8 opacity-60")}
                >
                  {body}
                </div>
              );
            }

            return (
              <button
                key={s.id}
                type="button"
                data-pie-item=""
                aria-pressed={isSelected}
                aria-label={`${s.name}: النقاط ${toArabicDigits(s.points)}، النسبة ${toArabicDigits(percent)} بالمئة من إجمالي النقاط`}
                onClick={() => toggle(s.id)}
                onPointerEnter={() => previewOnly(s.id)}
                onPointerLeave={() => previewOff(s.id)}
                onFocus={() => previewOnly(s.id)}
                onBlur={() => previewOff(s.id)}
                className={cn(
                  base,
                  "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#043F2E] focus-visible:ring-offset-2",
                  reduceMotion ? "" : "transition-all duration-200",
                  isSelected
                    ? "bg-white border-[#043F2E]/40 shadow-sm"
                    : isHighlighted
                      ? "bg-white border-[#043F2E]/25 shadow-sm"
                      : "bg-[#F7FBEA] border-[#043F2E]/8 hover:border-[#043F2E]/20",
                  isDimmed ? "opacity-55" : "opacity-100",
                )}
              >
                {body}
              </button>
            );
          })}
        </div>
      </div>

      {/* Affordance hint */}
      <p className={`${tajawal.className} text-[11px] text-[#043F2E]/40 text-center sm:text-start`}>
        {selectedId !== null
          ? "اضغط مرة أخرى — أو في أي مكان آخر — للعودة إلى الإجمالي"
          : "اضغط على أي شريحة أو نشاط لعرض تفاصيل نقاطه"}
      </p>
    </div>
  );
}

// ============================
// Hero Stat Card
// ============================
function HeroStat({
  label,
  value,
  icon,
  accent,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl px-4 py-4 border flex items-center gap-3 transition-colors ${
        accent
          ? "bg-[#043F2E] text-[#BEE663] border-[#043F2E]/15"
          : "bg-white text-[#043F2E] border-[#043F2E]/10 shadow-sm hover:border-[#043F2E]/20"
      }`}
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
          accent ? "bg-white/10" : "bg-[#F7FBEA]"
        }`}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className={`${tajawal.className} text-[11px] font-medium opacity-70`}>{label}</span>
        {loading ? (
          <span className="mt-1 h-6 w-10 rounded-md bg-current/20 animate-pulse" aria-hidden="true" />
        ) : (
          <span className={`${lalezar.className} text-2xl leading-tight`}>{value}</span>
        )}
      </div>
    </div>
  );
}

// ============================
// Info Card (supervisor / referrer / date)
// ============================
function InfoCard({
  icon,
  label,
  value,
  clickable,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  clickable?: boolean;
}) {
  return (
    <div
      className={`bg-[#F7FBEA] rounded-2xl border border-[#043F2E]/8 px-4 py-3 flex items-center gap-3 h-full transition-colors ${
        clickable ? "hover:border-[#043F2E]/30 hover:bg-white cursor-pointer" : ""
      }`}
    >
      <div
        className="w-9 h-9 rounded-lg bg-[#043F2E]/5 flex items-center justify-center shrink-0 text-[#043F2E]/70"
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className={`${tajawal.className} text-[11px] font-medium text-[#043F2E]/50`}>{label}</span>
        <span className={`${tajawal.className} text-sm font-bold text-[#043F2E] truncate ${clickable ? "hover:underline" : ""}`}>{value}</span>
      </div>
    </div>
  );
}
