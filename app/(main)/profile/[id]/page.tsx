import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { checkTokenValidity } from "@/actions/auth-actions";
import {
  getUserProfile,
  getUserByUsername,
  getProfileCategories,
  getSupervisedStudents,
  getStudentRank,
} from "@/actions/profile";

import { Lalezar, Tajawal } from "next/font/google";
import { ArrowRight, Shield, BookOpen } from "lucide-react";
import Link from "next/link";

import ProfileHeader from "@/components/Profile/ProfileHeader";
import ProfileMetaInfo from "@/components/Profile/ProfileMetaInfo";
import ProfileActivityList from "@/components/Profile/ProfileActivityList";
import RoleBadge from "@/components/Profile/RoleBadge";
import EditOwnProfile from "@/components/Profile/EditOwnProfile";
import ModeratorProfileView from "@/components/Profile/views/ModeratorProfileView";
import StudentProfileView from "@/components/Profile/views/StudentProfileView";

import { toArabicDigits } from "@/lib/utils";
import {
  getPrimaryRole,
  getRoles,
  getVisibility,
  type UserActivity,
  type SupervisedStudent,
} from "@/lib/profile-types";

const lalezar = Lalezar({ subsets: ["arabic"], weight: "400" });
const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "الملف الشخصي",
  description: "عرض الملف الشخصي للمستخدمين في مقرأة النيل",
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
            {profileResult.error || "لم نتمكن من العثور على هذا المستخدم"}
          </p>
          <Link
            href="/"
            className={`${tajawal.className} inline-flex items-center gap-2 h-11 px-5 bg-[#043F2E] text-white rounded-xl text-sm font-bold hover:bg-[#065f46] transition-colors`}
          >
            <ArrowRight className="w-4 h-4" strokeWidth={2.4} />
            العودة للرئيسية
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
  let enrichedActivities: UserActivity[] = activities;
  const categoriesResult = await getProfileCategories();
  const categories = categoriesResult.success ? (categoriesResult.data ?? []) : [];
  if (categories.length > 0) {
    const catMap = new Map(categories.map((c) => [c.id, c]));
    enrichedActivities = activities.map((a) => ({
      ...a,
      category_name: catMap.get(a.category)?.name,
      points: (catMap.get(a.category)?.value ?? 0) * a.multiplier,
    }));
  }

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
      const rankResult = await getStudentRank(targetUser.id);
      sections.push(
        <section key="student" className="flex flex-col gap-4">
          {multiSection && (
            <SectionTitle icon={<BookOpen className="w-4 h-4" strokeWidth={2.4} />}>
              لوحة الطالب
            </SectionTitle>
          )}
          <StudentProfileView
            points={points}
            activities={enrichedActivities}
            rank={rankResult.success ? rankResult.data : null}
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
          <ModeratorProfileView students={students} categories={categories} />
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

        {/* Stats (points always visible) */}
        <div className="bg-white rounded-3xl border border-[#043F2E]/10 shadow-sm p-5 md:p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-[#BEE663] rounded-2xl border border-[#043F2E]/15 px-4 py-3 flex flex-col gap-1">
              <span className={`${tajawal.className} text-[11px] font-medium text-[#043F2E]/70`}>النقاط</span>
              <span className={`${lalezar.className} text-2xl text-[#043F2E]`}>
                {toArabicDigits(points)}
              </span>
            </div>
            <div className="bg-[#F7FBEA] rounded-2xl border border-[#043F2E]/8 px-4 py-3 flex flex-col gap-1">
              <span className={`${tajawal.className} text-[11px] font-medium text-[#043F2E]/50`}>الأنشطة</span>
              <span className={`${lalezar.className} text-2xl text-[#043F2E]`}>
                {toArabicDigits(visibility.showDetailedActivities ? activities.length : 0)}
              </span>
            </div>
            <div className="bg-[#F7FBEA] rounded-2xl border border-[#043F2E]/8 px-4 py-3 flex flex-col gap-1">
              <span className={`${tajawal.className} text-[11px] font-medium text-[#043F2E]/50`}>الدور</span>
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {getRoles(targetUser.groups || []).map((r) => (
                  <RoleBadge key={r} role={r} size="sm" />
                ))}
              </div>
            </div>
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
