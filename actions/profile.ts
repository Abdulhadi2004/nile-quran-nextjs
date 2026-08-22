"use server";

import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import { gregorianToHijri, hijriToGregorian } from "@tabby_ai/hijri-converter";
import { getHijriMonthDays } from "@/lib/utils";

const API_BASE = process.env.BASE_URL;

function toIsoDate(d: { year: number; month: number; day: number }): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

// Current Hijri week range (same bucketing as the control board)
function getCurrentHijriWeekRange(): { start: string; end: string } {
  const now = new Date();
  const hijri = gregorianToHijri({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  });
  const week = hijri.day <= 28 ? Math.ceil(hijri.day / 7) : 5;
  const monthDays = getHijriMonthDays(hijri.year, hijri.month);
  const startHijriDay = (week - 1) * 7 + 1;
  const endHijriDay = week < 5 ? week * 7 : monthDays;
  const start = hijriToGregorian({ year: hijri.year, month: hijri.month, day: startHijriDay });
  const end = hijriToGregorian({ year: hijri.year, month: hijri.month, day: endHijriDay });
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

// Current Hijri month range (same as the home leaderboard)
function getCurrentHijriMonthRange(): { start: string; end: string } {
  const now = new Date();
  const hijri = gregorianToHijri({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  });
  const monthDays = getHijriMonthDays(hijri.year, hijri.month);
  const start = hijriToGregorian({ year: hijri.year, month: hijri.month, day: 1 });
  const end = hijriToGregorian({ year: hijri.year, month: hijri.month, day: monthDays });
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

// ===============================
// Types
// ===============================

interface ApiUser {
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

interface ApiActivity {
  id: number;
  category: number;
  date: string;
  multiplier: number;
}

interface ApiPoints {
  user: number;
  points: number;
  activities: ApiActivity[];
}

interface ApiCategory {
  id: number;
  name: string;
  value: number;
}

export interface FetchResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ===============================
// Token helper
// ===============================

async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("access")?.value ?? null;
}

async function fetchJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Accept-Language": "ar",
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

// ===============================
// Get User by Username (for supervisor/referrer links)
// ===============================

export async function getUserByUsername(
  username: string,
): Promise<FetchResult<ApiUser>> {
  try {
    const token = await getToken();
    if (!token) throw new Error("No access token");

    const data = await fetchJson<{ results: ApiUser[] }>(
      `${API_BASE}api/v1/users/?username=${encodeURIComponent(username)}`,
      token,
    );

    if (!data.results || data.results.length === 0) {
      return { success: false, error: "User not found" };
    }

    return { success: true, data: data.results[0] };
  } catch (error) {
    console.error("Error fetching user by username:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ===============================
// Get User Profile by ID
// ===============================

export async function getUserProfile(
  userId: number,
): Promise<FetchResult<{ user: ApiUser; points: number; activities: ApiActivity[] }>> {
  try {
    const token = await getToken();
    if (!token) throw new Error("No access token");

    const [userRes, pointsRes] = await Promise.all([
      fetchJson<ApiUser>(`${API_BASE}api/v1/users/${userId}/`, token),
      fetchJson<ApiPoints | { results: ApiPoints[] }>(
        `${API_BASE}api/v1/users/${userId}/points/`,
        token,
      ),
    ]);

    // Points endpoint may return a single object or paginated results
    let pointsData: ApiPoints;
    if (Array.isArray(pointsRes)) {
      pointsData = pointsRes[0] ?? { user: userId, points: 0, activities: [] };
    } else if ("results" in pointsRes && Array.isArray(pointsRes.results)) {
      pointsData = pointsRes.results[0] ?? { user: userId, points: 0, activities: [] };
    } else {
      pointsData = pointsRes as ApiPoints;
    }

    return {
      success: true,
      data: {
        user: userRes,
        points: pointsData.points ?? 0,
        activities: pointsData.activities ?? [],
      },
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ===============================
// Get Student Rank (monthly leaderboard position)
// ===============================

export async function getStudentRank(
  userId: number,
): Promise<FetchResult<number | null>> {
  try {
    const token = await getToken();
    if (!token) throw new Error("No access token");

    const { start, end } = getCurrentHijriMonthRange();
    const data = await fetchJson<{ results: ApiPoints[] } | ApiPoints[]>(
      `${API_BASE}api/v1/users/points/?date_after=${start}&date_before=${end}&ordering=-points`,
      token,
    );

    const results = Array.isArray(data) ? data : (data.results ?? []);
    const me = results.find((p) => p.user === userId);
    if (!me) return { success: true, data: null };

    // Rank = 1 + number of students with strictly more points (ties share rank)
    const rank = 1 + results.filter((p) => (p.points ?? 0) > (me.points ?? 0)).length;
    return { success: true, data: rank };
  } catch (error) {
    console.error("Error fetching student rank:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ===============================
// Get Supervised Students (Moderator only)
// ===============================

export async function getSupervisedStudents(
  supervisorUsername: string,
): Promise<
  FetchResult<
    Array<{
      id: number;
      username: string;
      first_name: string;
      last_name: string;
      groups: string[];
      points: number;
      activities_count: number;
      weekly_activities_count: number;
    }>
  >
> {
  try {
    const token = await getToken();
    if (!token) throw new Error("No access token");

    const { start, end } = getCurrentHijriWeekRange();

    // Students supervised by this moderator + all-time points + current-week points
    const [data, pointsData, weekPointsData] = await Promise.all([
      fetchJson<{ results: ApiUser[] }>(
        `${API_BASE}api/v1/users/?supervisor=${supervisorUsername}&group=Student`,
        token,
      ),
      fetchJson<{ results: ApiPoints[] } | ApiPoints[]>(
        `${API_BASE}api/v1/users/points/`,
        token,
      ),
      fetchJson<{ results: ApiPoints[] } | ApiPoints[]>(
        `${API_BASE}api/v1/users/points/?date_after=${start}&date_before=${end}`,
        token,
      ),
    ]);

    const normalize = (d: { results: ApiPoints[] } | ApiPoints[]): ApiPoints[] =>
      Array.isArray(d) ? d : (d.results ?? []);

    const allPoints = normalize(pointsData);
    const weekPoints = normalize(weekPointsData);

    const students = data.results.map((student) => {
      const pointsInfo = allPoints.find((p) => p.user === student.id);
      const weekInfo = weekPoints.find((p) => p.user === student.id);
      return {
        id: student.id,
        username: student.username,
        first_name: student.first_name,
        last_name: student.last_name,
        groups: student.groups,
        points: pointsInfo?.points ?? 0,
        activities_count: pointsInfo?.activities?.length ?? 0,
        weekly_activities_count: weekInfo?.activities?.length ?? 0,
      };
    });

    return {
      success: true,
      data: students,
    };
  } catch (error) {
    console.error("Error fetching supervised students:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ===============================
// Update User (Admin only)
// ===============================

export async function updateUser(
  userId: number,
 data: { first_name?: string; last_name?: string; email?: string; supervisor?: string | null; referrer?: string | null; groups?: string[] },
): Promise<FetchResult<null>> {
  try {
    const token = await getToken();
    if (!token) throw new Error("No access token");

    const res = await fetch(`${API_BASE}api/v1/users/${userId}/`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Accept-Language": "ar",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const text = await res.text();
      let errorMsg = `فشل تحديث البيانات (${res.status})`;
      try {
        const errData = JSON.parse(text);
        errorMsg = errData?.detail || errData?.email?.[0] || errData?.first_name?.[0] || errorMsg;
      } catch {
        // not JSON
      }
      return { success: false, error: errorMsg };
    }

    return { success: true, data: null };
  } catch (error) {
    console.error("Error updating user:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ===============================
// Get Categories (cached 1h)
// ===============================

const getCategoriesCached = unstable_cache(
  async (token: string) => {
    const res = await fetch(`${API_BASE}api/v1/users/points/categories/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Accept-Language": "ar",
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`);
    const data = await res.json();
    return data.results as ApiCategory[];
  },
  ["profile-categories"],
  { revalidate: 3600 },
);

// ===============================
// Add Student Activity (Moderator/Admin)
// ===============================

export async function addStudentActivity(
  studentId: number,
  categoryId: number,
  multiplier: number,
): Promise<FetchResult<{ id: number }>> {
  try {
    const token = await getToken();
    if (!token) throw new Error("No access token");

    const date = new Date().toISOString();

    const res = await fetch(`${API_BASE}api/v1/users/${studentId}/activities/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Accept-Language": "ar",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ category: categoryId, multiplier, date }),
    });

    if (!res.ok) {
      const text = await res.text();
      let errorMsg = `فشل إضافة النشاط (${res.status})`;
      try {
        const data = JSON.parse(text);
        errorMsg = data?.detail || data?.error || errorMsg;
      } catch {
        // not JSON
      }
      return { success: false, error: errorMsg };
    }

    const data = await res.json();
    return { success: true, data: { id: data.id } };
  } catch (error) {
    console.error("Error adding student activity:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getProfileCategories(): Promise<FetchResult<ApiCategory[]>> {
  try {
    const token = await getToken();
    if (!token) throw new Error("No access token");
    const categories = await getCategoriesCached(token);
    return { success: true, data: categories };
  } catch (error) {
    console.error("Error fetching categories:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
