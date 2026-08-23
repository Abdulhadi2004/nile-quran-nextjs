import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { checkTokenValidity } from "@/actions/auth-actions";
import {
  getUserProfile,
  getUserByUsername,
  getProfileCategories,
  getSupervisedStudents,
  getStudentRank,
  getUserPointsForMonth,
  getCirclePeers,
  type CirclePeer,
} from "@/actions/profile";
import { gregorianToHijri } from "@tabby_ai/hijri-converter";

import { Lalezar, Tajawal } from "next/font/google";
import { ArrowRight, Shield, BookOpen, BellRing } from "lucide-react";
import Link from "next/link";

import ProfileHeader from "@/components/Profile/ProfileHeader";
import ProfileMetaInfo from "@/components/Profile/ProfileMetaInfo";
import ProfileActivityList from "@/components/Profile/ProfileActivityList";
import EditOwnProfile from "@/components/Profile/EditOwnProfile";
import ModeratorProfileView from "@/components/Profile/views/ModeratorProfileView";
import StudentProfileView from "@/components/Profile/views/StudentProfileView";

import { toArabicDigits } from "@/lib/utils";
import {
  getPrimaryRole,
  getVisibility,
  isLongInactive,
  weeksSinceActivity,
  type UserActivity,
  type SupervisedStudent,
} from "@/lib/profile-types";

const lalezar = Lalezar({ subsets: ["arabic"], weight: "400" });
const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "الملف الشخصي",
  description: "عرض الملف الشخصي لأعضاء مقرأة النيل",
  robots: { index: false, follow: false },
};

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { isValid, user: currentUser } = await checkTokenValidity();

  if (!isValid || !currentUser) {
    redirect("/auth");
  }

  const { id } = await params;
  const targetUserId = parseInt(id, 10);

  if (isNaN(targetUserId)) {
    redirect("/");
  }

  const isOwnProfile = currentUser.id === targetUserId;
  const viewerRole = getPrimaryRole(currentUser.groups || []);

  // Fetch target user's profile
  const profileResult = await getUserProfile(targetUserId);

  if (!profileResult.success || !profileResult.data) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <h1 className={`${lalezar.className} text-2xl text-[#043F2E]`}>
            تعذّر تحميل الملف الشخصي
          </h1>
          <p className={`${tajawal.className} text-sm text-[#043F2E]/60`}>
            {profileResult.error || "لم نعثر على هذا العضو"}
          </p>
          <Link
            href="/"
            className={`${tajawal.className} inline-flex items-center gap-2 h-11 px-5 bg-[#043F2E] text-white rounded-xl text-sm font-bold hover:bg-[#065f46] transition-colors`}
          >
            <ArrowRight className="w-4 h-4" strokeWidth={2.4} />
            العودة إلى الرئيسية
          </Link>
        </div>
      </div>
    );
  }

  const { user: targetUser, points, activities } = profileResult.data;
  const visibility = getVisibility(viewerRole, isOwnProfile);

  // Relationship-based activity visibility:
  // - Moderator sees activities only for students they supervise
  // - Student sees activities only on their own profile (already handled by isOwnProfile)
  if (viewerRole === "Supervisor" && !isOwnProfile) {
    const isSupervisorOfTarget = targetUser.supervisor === currentUser.username;
    if (isSupervisorOfTarget) {
      visibility.showDetailedActivities = true;
    }
  }

  // Enrich activities with category names (values come from the API, not hard-coded)
  const categoriesResult = await getProfileCategories();
  const categories = categoriesResult.success ? (categoriesResult.data ?? []) : [];
  const enrichedActivities = enrichActivities(activities, categories);

  // Fetch supervisor info (id + full name) for clickable link
  let supervisorInfo: { id: number; fullName: string; username: string } | null = null;
  if (targetUser.supervisor) {
    const supResult = await getUserByUsername(targetUser.supervisor);
    if (supResult.success && supResult.data) {
      supervisorInfo = {
        id: supResult.data.id,
        fullName: `${supResult.data.first_name} ${supResult.data.last_name}`.trim() || supResult.data.username,
        username: supResult.data.username,
      };
    }
  }

  // Fetch referrer info (id + full name) for clickable link
  let referrerInfo: { id: number; fullName: string; username: string } | null = null;
  if (targetUser.referrer) {
    const refResult = await getUserByUsername(targetUser.referrer);
    if (refResult.success && refResult.data) {
      referrerInfo = {
        id: refResult.data.id,
        fullName: `${refResult.data.first_name} ${refResult.data.last_name}`.trim() || refResult.data.username,
        username: refResult.data.username,
      };
    }
  }

  // ============================
  // Own profile — role-specific sections stacked by the user's groups
  // (a user can be Student + Admin, Supervisor + Admin, Student + Supervisor, ...)
  // ============================
  if (isOwnProfile) {
    const groups = targetUser.groups || [];
    const isAdmin = groups.includes("Admin");
    const isSupervisor = groups.includes("Supervisor");
    const isStudent = groups.includes("Student") || (!isAdmin && !isSupervisor);

    const sections: React.ReactNode[] = [];
    const multiSection = [isStudent, isSupervisor].filter(Boolean).length > 1;

    if (isStudent) {
      // The dashboard speaks about one Hijri month, so it opens on the current one
      const today = new Date();
      const hijriToday = gregorianToHijri({
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        day: today.getDate(),
      });

      const [monthResult, rankResult, peersResult] = await Promise.all([
        getUserPointsForMonth(targetUser.id, hijriToday.year, hijriToday.month),
        getStudentRank(targetUser.id, hijriToday.year, hijriToday.month),
        targetUser.supervisor
          ? getCirclePeers(targetUser.supervisor, targetUser.id)
          : Promise.resolve({ success: true as const, data: [] as CirclePeer[] }),
      ]);

      const monthActivities = enrichActivities(
        monthResult.success ? (monthResult.data?.activities ?? []) : [],
        categories,
      );

      sections.push(
        <section key="student" className="flex flex-col gap-4">
          {multiSection && (
            <SectionTitle icon={<BookOpen className="w-4 h-4" strokeWidth={2.4} />}>
              لوحة الطالب
            </SectionTitle>
          )}
          <StudentProfileView
            userId={targetUser.id}
            initialYear={hijriToday.year}
            initialMonth={hijriToday.month}
            initialPoints={monthResult.success ? (monthResult.data?.points ?? 0) : 0}
            initialActivities={monthActivities}
            initialRank={rankResult.success ? rankResult.data : null}
            categories={categories}
            peers={peersResult.success ? (peersResult.data ?? []) : []}
            supervisorName={supervisorInfo?.fullName || targetUser.supervisor || undefined}
            supervisorId={supervisorInfo?.id}
            referrerName={referrerInfo?.fullName || targetUser.referrer || undefined}
            referrerId={referrerInfo?.id}
            dateJoined={targetUser.date_joined}
          />
        </section>,
      );
    }

    if (isSupervisor) {
      const studentsResult = await getSupervisedStudents(targetUser.username);
      const students: SupervisedStudent[] = studentsResult.success
        ? (studentsResult.data ?? [])
        : [];

      sections.push(
        <section key="supervisor" className="flex flex-col gap-4">
          {multiSection && (
            <SectionTitle icon={<Shield className="w-4 h-4" strokeWidth={2.4} />}>
              لوحة المشرف
            </SectionTitle>
          )}
          <ModeratorProfileView
            students={students}
            categories={categories}
            viewerIsAdmin={isAdmin}
          />
        </section>,
      );
    }

    // Admin with no student/supervisor sections: personal data only —
    // all management lives in the control board
    if (sections.length === 0) {
      sections.push(
        <section
          key="admin"
          className="bg-white rounded-3xl border border-[#043F2E]/10 shadow-sm p-5 md:p-6"
        >
          <h3 className={`${lalezar.className} text-lg text-[#043F2E] mb-4`}>معلومات</h3>
          <ProfileMetaInfo
            supervisor={supervisorInfo}
            referrer={referrerInfo}
            email={targetUser.email}
            dateJoined={targetUser.date_joined}
            visibility={visibility}
          />
        </section>,
      );
    }

    return (
      <div className="w-full min-h-screen bg-[#EBF0EB] py-8" dir="rtl">
        <div className="container mx-auto px-4 lg:px-12 max-w-5xl flex flex-col gap-6">
          {/* Header */}
          <div className="bg-white rounded-3xl border border-[#043F2E]/10 shadow-sm p-5 md:p-7">
            <ProfileHeader
              firstName={targetUser.first_name}
              lastName={targetUser.last_name}
              username={targetUser.username}
              groups={groups}
              supervisor={supervisorInfo}
              action={
                <EditOwnProfile
                  userId={targetUser.id}
                  firstName={targetUser.first_name}
                  lastName={targetUser.last_name}
                  email={targetUser.email}
                />
              }
            />
          </div>

          {/* Role-specific sections */}
          {sections}
        </div>
      </div>
    );
  }

  // ============================
  // Other user's profile — apply visibility rules
  // ============================
  const visibleActivities = visibility.showDetailedActivities
    ? enrichedActivities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
    : [];

  const viewerIsAdmin = (currentUser.groups || []).includes("Admin");
  const lastActivityAt = activities.reduce<string | null>((latest, a) => {
    if (!latest) return a.date;
    return new Date(a.date).getTime() > new Date(latest).getTime() ? a.date : latest;
  }, null);
  const inactiveWeeks = weeksSinceActivity(lastActivityAt);

  return (
    <div className="w-full min-h-screen bg-[#EBF0EB] py-8" dir="rtl">
      <div className="container mx-auto px-4 lg:px-12 max-w-3xl flex flex-col gap-6">
        {/* Header */}
        <div className="bg-white rounded-3xl border border-[#043F2E]/10 shadow-sm p-5 md:p-7">
          <ProfileHeader
            firstName={targetUser.first_name}
            lastName={targetUser.last_name}
            username={targetUser.username}
            groups={targetUser.groups || []}
            supervisor={visibility.showSupervisor ? supervisorInfo : null}
          />
        </div>

        {/* A member who has recorded nothing for weeks has usually stopped coming.
            Only an administrator sees this: reaching out is theirs to do, and a
            supervisor's part is limited to recitation and reading. */}
        {viewerIsAdmin && isLongInactive(lastActivityAt, targetUser.date_joined) && (
          <div className="bg-[#F4E0D6] border border-[#9B3D2E]/30 rounded-3xl p-5 md:p-6 flex items-start gap-3">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-[#9B3D2E]/10 text-[#9B3D2E] flex items-center justify-center">
              <BellRing className="w-4 h-4" strokeWidth={2.4} />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <h3 className={`${lalezar.className} text-lg text-[#9B3D2E] leading-none`}>
                منقطع عن النشاط
              </h3>
              <p className={`${tajawal.className} text-sm text-[#9B3D2E]/90 leading-relaxed`}>
                {inactiveWeeks === null
                  ? "لم يسجّل هذا العضو أي نشاط منذ انضمامه."
                  : `آخر نشاط لهذا العضو كان قبل ${toArabicDigits(inactiveWeeks)} أسبوعًا.`}{" "}
                يُستحسن التواصل معه والاطمئنان عليه.
              </p>
            </div>
          </div>
        )}

        {/* Stats (points always visible) */}
        <div className="bg-white rounded-3xl border border-[#043F2E]/10 shadow-sm p-5 md:p-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#BEE663] rounded-2xl border border-[#043F2E]/15 px-4 py-3 flex flex-col gap-1">
              <span className={`${tajawal.className} text-[11px] font-medium text-[#043F2E]/70`}>النقاط</span>
              <span className={`${lalezar.className} text-2xl text-[#043F2E]`}>
                {toArabicDigits(points)}
              </span>
            </div>
            {/* Hidden activities are hidden — printing ٠ would claim this member did nothing */}
            {visibility.showDetailedActivities && (
              <div className="bg-[#F7FBEA] rounded-2xl border border-[#043F2E]/8 px-4 py-3 flex flex-col gap-1">
                <span className={`${tajawal.className} text-[11px] font-medium text-[#043F2E]/50`}>الأنشطة</span>
                <span className={`${lalezar.className} text-2xl text-[#043F2E]`}>
                  {toArabicDigits(activities.length)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Meta info (visibility-controlled) */}
        <div className="bg-white rounded-3xl border border-[#043F2E]/10 shadow-sm p-5 md:p-6">
          <h3 className={`${lalezar.className} text-lg text-[#043F2E] mb-4`}>معلومات</h3>
          <ProfileMetaInfo
            supervisor={visibility.showSupervisor ? supervisorInfo : null}
            referrer={visibility.showReferrer ? referrerInfo : null}
            email={visibility.showEmail ? targetUser.email : ""}
            dateJoined={visibility.showDateJoined ? targetUser.date_joined : ""}
            visibility={visibility}
          />
        </div>

        {/* Activities (only if visible) */}
        {visibility.showDetailedActivities && visibleActivities.length > 0 && (
          <div className="bg-white rounded-3xl border border-[#043F2E]/10 shadow-sm p-5 md:p-6">
            <h3 className={`${lalezar.className} text-lg text-[#043F2E] mb-4`}>آخر الأنشطة</h3>
            <ProfileActivityList activities={visibleActivities} />
          </div>
        )}
      </div>
    </div>
  );
}

// Category names and point values come from the API — never hard-coded here
function enrichActivities(
  activities: { id: number; category: number; date: string; multiplier: number }[],
  categories: { id: number; name: string; value: number }[],
): UserActivity[] {
  if (categories.length === 0) return activities;
  const byId = new Map(categories.map((c) => [c.id, c]));
  return activities.map((a) => ({
    ...a,
    category_name: byId.get(a.category)?.name,
    points: (byId.get(a.category)?.value ?? 0) * a.multiplier,
  }));
}

function SectionTitle({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-[#043F2E] text-[#BEE663] flex items-center justify-center">
        {icon}
      </div>
      <h2 className={`${lalezar.className} text-xl text-[#043F2E] leading-tight`}>{children}</h2>
    </div>
  );
}
