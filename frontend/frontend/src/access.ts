export const appRoles = ["organizer", "participant", "author", "reviewer", "speaker"] as const;

export type AppRole = (typeof appRoles)[number];

type RoleOption = { value: AppRole; label: string };

export const roleOptions: RoleOption[] = [
  { value: "organizer", label: "Organizer" },
  { value: "participant", label: "Participant" },
  { value: "author", label: "Author" },
  { value: "reviewer", label: "Reviewer" },
  { value: "speaker", label: "Speaker" },
];

const everyone: AppRole[] = [...appRoles];
const eventAudience: AppRole[] = ["organizer", "participant", "author", "reviewer", "speaker"];
const attendeeRoles: AppRole[] = ["organizer", "participant"];
const announcementRoles: AppRole[] = ["organizer", "participant", "author", "speaker"];
const certificateRoles: AppRole[] = ["organizer", "participant", "author", "speaker"];

export const routeRoles: Record<string, AppRole[]> = {
  "/profile": everyone,
  "/dashboard": ["organizer"],
  "/conferences": eventAudience,
  "/sessions": eventAudience,
  "/registrations": attendeeRoles,
  "/payments": attendeeRoles,
  "/attendance": attendeeRoles,
  "/submissions": ["author"],
  "/organizer/submissions": ["organizer"],
  "/reviews": ["organizer", "reviewer"],
  "/sponsors": ["organizer"],
  "/exhibitors": ["organizer"],
  "/forecast": ["organizer"],
  "/content-management": ["organizer"],
  "/announcements": announcementRoles,
  "/certificates": certificateRoles,
  "/search": everyone,
  "/feedback": ["organizer", "participant"],
  "/rooms": ["organizer"],
  "/reviewer-workload": ["organizer"],
  "/bottlenecks": ["organizer"],
};

export const navigationItems = [
  ["Profile", "/profile"],
  ["Dashboard", "/dashboard"],
  ["Conferences", "/conferences"],
  ["Sessions", "/sessions"],
  ["Registrations", "/registrations"],
  ["Payments", "/payments"],
  ["Attendance", "/attendance"],
  ["Submissions", "/submissions"],
  ["Organizer Submissions", "/organizer/submissions"],
  ["Content Management", "/content-management"],
  ["Reviews", "/reviews"],
  ["Sponsors", "/sponsors"],
  ["Exhibitors", "/exhibitors"],
  ["Resource Forecast", "/forecast"],
  ["Bottleneck Detector", "/bottlenecks"],
  ["Room Utilization", "/rooms"],
  ["Reviewer Workload", "/reviewer-workload"],
  ["Feedback", "/feedback"],
  ["Announcements", "/announcements"],
  ["Certificates", "/certificates"],
] as const;

export function isAppRole(role: string | null): role is AppRole {
  return role !== null && appRoles.some((appRole) => appRole === role);
}

export function roleHome(role: string | null): string {
  if (!isAppRole(role)) return "/login";
  if (role === "organizer") return "/dashboard";
  if (role === "author") return "/submissions";
  if (role === "reviewer") return "/reviews";
  if (role === "speaker") return "/sessions";
  return "/conferences";
}
