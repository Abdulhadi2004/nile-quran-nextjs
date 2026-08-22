"use client";

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
} from "lucide-react";
import ProfileActivityList from "../ProfileActivityList";
import { toArabicDigits, getHijriMonth, formatArabicDate } from "@/lib/utils";
import { gregorianToHijri } from "@tabby_ai/hijri-converter";
import type { UserActivity } from "@/lib/profile-types";
import Link from "next/link";

const lalezar = Lalezar({ subsets: ["arabic"], weight: "400" });
const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

interface Props {
  points: number;
  activities: UserActivity[];
  rank?: number | null;
  supervisorName?: string;
  supervisorId?: number | null;
  referrerName?: string;
  referrerId?: number | null;
  dateJoined?: string;
}

// Brand palette for pie slices (approved tokens only)
const PIE_COLORS = ["#043F2E", "#9ADD00", "#BEE663", "#065f46", "#DEFF90", "#2A5A45"];

export default function StudentProfileView({
  points,
  activities,
  rank,
  supervisorName,
  supervisorId,
  referrerName,
  referrerId,
  dateJoined,
}: Props) {
  const recentActivities = [...activities]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  const now = new Date();
  const hijriDate = gregorianToHijri({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  });
  const monthLabel = `${getHijriMonth(hijriDate.month - 1)} ${toArabicDigits(hijriDate.year)}`;

  // Group activities by category
  const categoryMap = new Map<number, { count: number; points: number; name?: string }>();
  for (const a of activities) {
    const existing = categoryMap.get(a.category) || { count: 0, points: 0, name: a.category_name };
    existing.count++;
    existing.points += a.points || 0;
    categoryMap.set(a.category, existing);
  }

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      {/* Hero stats banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <HeroStat
          label="نقاطي"
          value={toArabicDigits(points)}
          icon={<Trophy className="w-5 h-5" strokeWidth={2.2} />}
          accent
        />
        <HeroStat
          label="أنشطتي"
          value={toArabicDigits(activities.length)}
          icon={<Activity className="w-5 h-5" strokeWidth={2.2} />}
        />
        <HeroStat
          label="ترتيبي"
          value={rank ? toArabicDigits(rank) : "—"}
          icon={<Award className="w-5 h-5" strokeWidth={2.2} />}
        />
      </div>

      {/* Info section — supervisor, referrer, date joined */}
      <div className="bg-white rounded-3xl border border-[#043F2E]/10 shadow-sm p-5 md:p-6">
        <h3 className={`${lalezar.className} text-lg text-[#043F2E] mb-4`}>معلومات</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {supervisorName && (
            supervisorId ? (
              <Link href={`/profile/${supervisorId}`} className="block">
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
              <Link href={`/profile/${referrerId}`} className="block">
                <InfoCard
                  icon={<UserPlus className="w-4 h-4" strokeWidth={2.2} />}
                  label="المُحيل"
                  value={referrerName}
                  clickable
                />
              </Link>
            ) : (
              <InfoCard
                icon={<UserPlus className="w-4 h-4" strokeWidth={2.2} />}
                label="المُحيل"
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
      </div>

      {/* Progress + points breakdown pie chart */}
      <div className="bg-white rounded-3xl border border-[#043F2E]/10 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-l from-[#043F2E] to-[#065f46] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#BEE663] flex items-center justify-center">
              <Target className="w-4 h-4 text-[#043F2E]" strokeWidth={2.4} />
            </div>
            <div>
              <h3 className={`${lalezar.className} text-lg text-white leading-tight`}>تقدمي هذا الشهر</h3>
              <p className={`${tajawal.className} text-[11px] text-[#BEE663]/80`}>{monthLabel} هـ</p>
            </div>
          </div>
          <div className="text-left">
            <span className={`${lalezar.className} text-3xl text-[#BEE663]`}>{toArabicDigits(points)}</span>
            <span className={`${tajawal.className} text-xs text-white/60 mr-1`}>نقطة</span>
          </div>
        </div>

        {/* Points breakdown — pie chart */}
        {categoryMap.size > 0 && (
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#043F2E]/60" strokeWidth={2.2} />
              <h4 className={`${tajawal.className} text-sm font-bold text-[#043F2E]`}>تقسيمة النقاط</h4>
            </div>
            <PointsPieChart
              slices={Array.from(categoryMap.entries()).map(([catId, info], i) => ({
                id: catId,
                name: info.name || `تصنيف ${toArabicDigits(catId)}`,
                count: info.count,
                points: info.points,
                color: PIE_COLORS[i % PIE_COLORS.length],
              }))}
              totalPoints={points}
            />
          </div>
        )}
      </div>

      {/* Recent activities */}
      <div className="bg-white rounded-3xl border border-[#043F2E]/10 shadow-sm p-5 md:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#BEE663] text-[#043F2E] flex items-center justify-center">
              <Sparkles className="w-4 h-4" strokeWidth={2.2} />
            </div>
            <h3 className={`${lalezar.className} text-lg text-[#043F2E]`}>آخر الأنشطة</h3>
          </div>
          <span className={`${tajawal.className} text-xs text-[#043F2E]/40`}>
            {toArabicDigits(recentActivities.length)} من {toArabicDigits(activities.length)}
          </span>
        </div>
        <ProfileActivityList
          activities={recentActivities}
          emptyMessage="لم تسجل أي نشاط بعد"
        />
      </div>
    </div>
  );
}

// ============================
// Points Pie Chart (SVG donut)
// ============================
interface PieSlice {
  id: number;
  name: string;
  count: number;
  points: number;
  color: string;
}

function PointsPieChart({ slices, totalPoints }: { slices: PieSlice[]; totalPoints: number }) {
  const total = slices.reduce((s, x) => s + x.points, 0);

  // All slices zero points — nothing to draw
  if (total <= 0) {
    return (
      <p className={`${tajawal.className} text-xs text-[#043F2E]/50 text-center py-4`}>
        لا توجد نقاط مسجلة بعد
      </p>
    );
  }

  const cx = 60;
  const cy = 60;
  const r = 48;
  const innerR = 28;

  let angle = -Math.PI / 2;
  const paths = slices
    .filter((s) => s.points > 0)
    .map((s) => {
      const frac = s.points / total;
      const start = angle;
      const end = angle + frac * Math.PI * 2;
      angle = end;

      // Full-circle single slice — draw a ring instead of an arc
      if (frac >= 0.999) {
        return { slice: s, d: null };
      }

      const largeArc = frac > 0.5 ? 1 : 0;
      const x1 = cx + r * Math.cos(start);
      const y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end);
      const y2 = cy + r * Math.sin(end);
      const ix1 = cx + innerR * Math.cos(end);
      const iy1 = cy + innerR * Math.sin(end);
      const ix2 = cx + innerR * Math.cos(start);
      const iy2 = cy + innerR * Math.sin(start);
      const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
      return { slice: s, d };
    });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      {/* Donut */}
      <div className="relative shrink-0">
        <svg width="140" height="140" viewBox="0 0 120 120" role="img" aria-label="تقسيمة النقاط حسب النشاط">
          {paths.map(({ slice, d }) =>
            d === null ? (
              <g key={slice.id}>
                <circle cx={cx} cy={cy} r={r} fill={slice.color} />
                <circle cx={cx} cy={cy} r={innerR} fill="white" />
              </g>
            ) : (
              <path key={slice.id} d={d} fill={slice.color} />
            ),
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className={`${lalezar.className} text-xl text-[#043F2E] leading-none`}>
            {toArabicDigits(totalPoints)}
          </span>
          <span className={`${tajawal.className} text-[9px] text-[#043F2E]/50`}>نقطة</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-2">
        {slices.map((s) => {
          const percent = total > 0 ? Math.round((s.points / total) * 100) : 0;
          return (
            <div
              key={s.id}
              className="flex items-center justify-between bg-[#F7FBEA] rounded-xl border border-[#043F2E]/8 px-3 py-2.5 gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className={`${tajawal.className} text-xs font-medium text-[#043F2E]/70 truncate`}>
                  {s.name}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`${tajawal.className} text-[10px] text-[#043F2E]/50`}>
                  {toArabicDigits(percent)}٪
                </span>
                <span className={`${tajawal.className} text-xs font-bold text-[#043F2E] bg-[#BEE663] rounded-full px-2 py-0.5`}>
                  +{toArabicDigits(s.points)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
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
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl px-4 py-4 border flex items-center gap-3 ${
        accent
          ? "bg-[#043F2E] text-[#BEE663] border-[#043F2E]/15"
          : "bg-white text-[#043F2E] border-[#043F2E]/10 shadow-sm"
      }`}
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
          accent ? "bg-white/10" : "bg-[#F7FBEA]"
        }`}
      >
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className={`${tajawal.className} text-[11px] font-medium opacity-70`}>{label}</span>
        <span className={`${lalezar.className} text-2xl leading-tight`}>{value}</span>
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
      className={`bg-[#F7FBEA] rounded-2xl border border-[#043F2E]/8 px-4 py-3 flex items-center gap-3 transition-colors ${
        clickable ? "hover:border-[#043F2E]/30 hover:bg-white cursor-pointer" : ""
      }`}
    >
      <div className="w-9 h-9 rounded-lg bg-[#043F2E]/5 flex items-center justify-center shrink-0 text-[#043F2E]/70">
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className={`${tajawal.className} text-[11px] font-medium text-[#043F2E]/50`}>{label}</span>
        <span className={`${tajawal.className} text-sm font-bold text-[#043F2E] truncate ${clickable ? "hover:underline" : ""}`}>{value}</span>
      </div>
    </div>
  );
}
