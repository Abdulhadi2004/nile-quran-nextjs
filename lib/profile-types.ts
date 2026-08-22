// ===============================
// Profile Types & Visibility Rules
// ===============================

export type RoleType = "Admin" | "Supervisor" | "Student";

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  groups: string[];
  supervisor: string | null;
  referrer: string | null;
  date_joined: string;
}

export interface UserActivity {
  id: number;
  category: number;
  category_name?: string;
  date: string;
  multiplier: number;
  points?: number;
}

export interface UserProfileData {
  user: UserProfile;
  points: number;
  activities: UserActivity[];
}

export interface SupervisedStudent {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  groups: string[];
  points: number;
  activities_count: number;
  weekly_activities_count: number;
  recited_this_week: boolean;
}

// ===============================
// Supervisor Activity Scope
// ===============================
// Recitation (تسميع, id 4) and Quran reading (قراءة, id 3) — the only activities a
// recitation supervisor records or removes. Every other category belongs to the
// control board. The API lets a supervisor touch any category of their own
// students, so this list is what both the profile UI and its server actions
// enforce; keep them reading the same constant.

export const CAT_RECITATION = 4; // تسميع القرآن
export const CAT_QURAN_READING = 3; // قراءة القرآن
export const SUPERVISOR_MANAGED_CATEGORY_IDS = [CAT_RECITATION, CAT_QURAN_READING];

// ===============================
// Role Helpers
// ===============================

export function getPrimaryRole(groups: string[]): RoleType {
  if (groups.includes("Admin")) return "Admin";
  if (groups.includes("Supervisor")) return "Supervisor";
  return "Student";
}

// All roles a user belongs to, highest first (a user can be e.g. Supervisor + Admin)
export function getRoles(groups: string[]): RoleType[] {
  const roles: RoleType[] = [];
  if (groups.includes("Admin")) roles.push("Admin");
  if (groups.includes("Supervisor")) roles.push("Supervisor");
  if (groups.includes("Student")) roles.push("Student");
  if (roles.length === 0) roles.push("Student");
  return roles;
}

export function getRoleLabel(role: RoleType): string {
  switch (role) {
    case "Admin":
      return "مدير";
    case "Supervisor":
      return "مشرف";
    case "Student":
      return "طالب";
  }
}

export function getRoleIcon(role: RoleType): string {
  switch (role) {
    case "Admin":
      return "👑";
    case "Supervisor":
      return "🛡️";
    case "Student":
      return "📚";
  }
}

// ===============================
// Visibility Rules
// ===============================
// Determines which fields are visible when viewerRole looks at targetRole's profile.

export interface ProfileVisibility {
  showEmail: boolean;
  showDetailedActivities: boolean;
  showSupervisor: boolean;
  showReferrer: boolean;
  showDateJoined: boolean;
  showPoints: boolean;
}

export function getVisibility(
  viewerRole: RoleType,
  isOwnProfile: boolean,
): ProfileVisibility {
  // Always full access to own profile
  if (isOwnProfile) {
    return {
      showEmail: true,
      showDetailedActivities: true,
      showSupervisor: true,
      showReferrer: true,
      showDateJoined: true,
      showPoints: true,
    };
  }

  switch (viewerRole) {
    case "Admin":
      return {
        showEmail: true,
        showDetailedActivities: true,
        showSupervisor: true,
        showReferrer: true,
        showDateJoined: true,
        showPoints: true,
      };

    case "Supervisor":
      return {
        showEmail: false,
        showDetailedActivities: false, // overridden per-relationship in page
        showSupervisor: true,
        showReferrer: false,
        showDateJoined: true,
        showPoints: true,
      };

    case "Student":
      return {
        showEmail: false,
        showDetailedActivities: true, // students can see other students' activities
        showSupervisor: true,
        showReferrer: false,
        showDateJoined: false,
        showPoints: true,
      };
  }
}
