// ── Centralized Role-Based Access Control Configuration ───────────────────────
// Single source of truth for all role definitions and route access in the system.

// All valid roles in the system
export type Role = 'user' | 'agency' | 'super_admin' | 'registrar' | 'processor' | 'coordinator' | 'accountant' | 'video_uploader' | 'genaral' | 'calling';

// Roles that can access the internal dashboard (agency is treated like user for now)
export const DASHBOARD_ROLES: Role[] = [
  'super_admin',
  'registrar',
  'processor',
  'coordinator',
  'accountant',
  'video_uploader',
  'agency',
  'genaral',
  'calling',
];

// Route → which roles can see/access it
export const ROUTE_ACCESS: Record<string, Role[]> = {
  '/dashboard': ['super_admin', 'registrar', 'processor', 'coordinator', 'accountant', 'genaral', 'calling'],
  '/candidates': ['super_admin', 'processor', 'coordinator', 'genaral', 'calling'],
  '/quick-registration': ['super_admin', 'registrar', 'genaral', 'calling'],
  '/quick-registered': ['super_admin', 'registrar', 'processor', 'genaral'],
  '/requested': ['super_admin', 'coordinator', 'accountant', 'genaral'],
  '/flagged': ['super_admin', 'coordinator', 'processor', 'genaral'],
  '/fit-candidates': ['super_admin', 'coordinator', 'genaral'],
  '/registration': ['super_admin', 'processor', 'genaral'],
  '/cv-generator': ['super_admin', 'processor', 'coordinator', 'genaral'],
  '/generated-cvs': ['super_admin', 'processor', 'genaral'],
  '/invoice': ['super_admin', 'accountant', 'genaral'],
  '/deployments': ['super_admin', 'registrar', 'processor', 'coordinator', 'accountant', 'genaral'],
  '/brokers': ['super_admin', 'registrar', 'processor', 'genaral'],
  '/backup': ['super_admin', 'processor', 'coordinator', 'genaral'],
  '/settings': ['super_admin', 'registrar', 'processor', 'coordinator', 'accountant', 'video_uploader', 'agency', 'genaral', 'calling'],
  '/users': ['super_admin'],
  '/video-uploads': ['super_admin', 'video_uploader'],
  '/uploaded-videos': ['super_admin', 'video_uploader', 'processor', 'coordinator', 'registrar', 'accountant'],
  '/agency/available-candidates': ['super_admin', 'agency'],
  '/agency/contracts': ['super_admin', 'agency'],
  '/passport-registration': ['super_admin', 'genaral'],
  '/available-passport': ['super_admin', 'genaral'],
};

// All valid roles in the system
export const ALL_ROLES: Role[] = [
  'super_admin',
  'genaral',
  'registrar',
  'processor',
  'coordinator',
  'accountant',
  'video_uploader',
  'agency',
  'calling',
  'user',
];

export interface SystemPageInfo {
  path: string;
  name: string;
  category: 'Overview' | 'Registrations & Passports' | 'Candidates & CVs' | 'Agency & Deployments' | 'Media' | 'Administration';
  description: string;
}

export const SYSTEM_PAGES: SystemPageInfo[] = [
  // Overview
  { path: '/dashboard', name: 'Dashboard', category: 'Overview', description: 'System overview, statistics, and quick metrics' },
  { path: '/settings', name: 'Settings', category: 'Overview', description: 'System settings, user preferences, and role permissions' },

  // Registrations & Passports
  { path: '/quick-registration', name: 'Entry (Quick Registration)', category: 'Registrations & Passports', description: 'Fast-track candidate entry and passport scanning' },
  { path: '/quick-registered', name: 'Records (Quick Registered)', category: 'Registrations & Passports', description: 'Directory and verification of quick-registered candidates' },
  { path: '/passport-registration', name: 'Passport Registration', category: 'Registrations & Passports', description: 'Assign physical shelf locations and register passports' },
  { path: '/available-passport', name: 'Available Passports', category: 'Registrations & Passports', description: 'Track physical passport statuses and inventory' },
  { path: '/registration', name: 'Full Registration', category: 'Registrations & Passports', description: 'Detailed full candidate registration form' },

  // Candidates & CVs
  { path: '/candidates', name: 'Candidates List', category: 'Candidates & CVs', description: 'Primary directory and detailed profiles of candidates' },
  { path: '/cv-generator', name: 'CV Generator', category: 'Candidates & CVs', description: 'Generate formatted candidate CVs with custom agency templates' },
  { path: '/generated-cvs', name: 'Generated CVs', category: 'Candidates & CVs', description: 'Library and download center for exported candidate CVs' },
  { path: '/fit-candidates', name: 'Fit Candidates', category: 'Candidates & CVs', description: 'Candidates with verified medical and biometric clearance' },
  { path: '/requested', name: 'Visa Selected', category: 'Candidates & CVs', description: 'Candidates selected for visa processing' },
  { path: '/flagged', name: 'Flagged Candidates', category: 'Candidates & CVs', description: 'Candidates with alerts, rejections, or blacklist flags' },

  // Agency & Deployments
  { path: '/agency/available-candidates', name: 'Agency Candidates', category: 'Agency & Deployments', description: 'Browse and select available candidates for client agencies' },
  { path: '/agency/contracts', name: 'Contracts', category: 'Agency & Deployments', description: 'Agency candidate contracts, terms, and agreement tracking' },
  { path: '/invoice', name: 'Invoice', category: 'Agency & Deployments', description: 'Billing statements and receipts for candidate deployments' },
  { path: '/deployments', name: 'Candidate Deployment', category: 'Agency & Deployments', description: 'Flight scheduling, travel dates, and departure status' },
  { path: '/brokers', name: 'Brokers', category: 'Agency & Deployments', description: 'Broker management, commission tracking, and leader assignment' },

  // Media
  { path: '/video-uploads', name: 'Video Uploads', category: 'Media', description: 'Candidate interview video upload and recording tool' },
  { path: '/uploaded-videos', name: 'Uploaded Videos', category: 'Media', description: 'Media gallery of pre-registered candidate interview videos' },

  // Administration
  { path: '/users', name: 'Users', category: 'Administration', description: 'Manage system users, login credentials, and user accounts' },
  { path: '/backup', name: 'Backup CVs', category: 'Administration', description: 'Database backup creation, recovery, and data security' },
];

// Helper to compute system default allowed routes for each role
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, string[]> = ALL_ROLES.reduce((acc, role) => {
  if (role === 'super_admin') {
    acc[role] = SYSTEM_PAGES.map(p => p.path);
  } else {
    acc[role] = SYSTEM_PAGES
      .filter(p => ROUTE_ACCESS[p.path]?.includes(role))
      .map(p => p.path);
  }
  return acc;
}, {} as Record<Role, string[]>);

// Helper: check if a role can access a specific route, taking into account dynamic DB permissions
export function canRoleAccessRoute(
  role: string,
  route: string,
  customPermissions?: Record<string, string[]> | null
): boolean {
  // Super admin always retains unrestricted access
  if (role === 'super_admin') return true;

  // Clean path to ignore query parameters
  const cleanRoute = route.split('?')[0].split('#')[0];

  // If custom permissions are provided from the database
  if (customPermissions && Array.isArray(customPermissions[role])) {
    const allowed = customPermissions[role];
    if (allowed.includes(cleanRoute)) return true;
    // Prefix matching for sub-routes (e.g., /candidates/uuid matches /candidates)
    return allowed.some(p => cleanRoute === p || (cleanRoute.startsWith(p) && cleanRoute.charAt(p.length) === '/'));
  }

  // Fallback to default ROUTE_ACCESS
  const exactMatch = ROUTE_ACCESS[cleanRoute];
  if (exactMatch && exactMatch.includes(role as Role)) return true;

  for (const [path, roles] of Object.entries(ROUTE_ACCESS)) {
    if (cleanRoute === path || (cleanRoute.startsWith(path) && cleanRoute.charAt(path.length) === '/')) {
      if (roles.includes(role as Role)) return true;
    }
  }

  return false;
}

// Backwards-compatible alias
export function canAccess(
  role: string,
  route: string,
  customPermissions?: Record<string, string[]> | null
): boolean {
  return canRoleAccessRoute(role, route, customPermissions);
}

// Role display configuration for UI
export const ROLE_CONFIG: Record<Role, { label: string; color: string; badgeBg: string; badgeText: string; badgeBorder: string }> = {
  super_admin: { label: 'Super Admin', color: 'amber', badgeBg: 'bg-amber-100', badgeText: 'text-amber-700', badgeBorder: 'border-amber-200' },
  video_uploader: { label: 'Video Uploader', color: 'rose', badgeBg: 'bg-rose-100', badgeText: 'text-rose-700', badgeBorder: 'border-rose-200' },
  genaral: { label: 'General', color: 'indigo', badgeBg: 'bg-indigo-100', badgeText: 'text-indigo-700', badgeBorder: 'border-indigo-200' },
  registrar: { label: 'Registrar', color: 'emerald', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700', badgeBorder: 'border-emerald-200' },
  processor: { label: 'Processor', color: 'blue', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', badgeBorder: 'border-blue-200' },
  coordinator: { label: 'Coordinator', color: 'violet', badgeBg: 'bg-violet-100', badgeText: 'text-violet-700', badgeBorder: 'border-violet-200' },
  accountant: { label: 'Accountant', color: 'orange', badgeBg: 'bg-orange-100', badgeText: 'text-orange-700', badgeBorder: 'border-orange-200' },
  agency: { label: 'Agency', color: 'cyan', badgeBg: 'bg-cyan-100', badgeText: 'text-cyan-700', badgeBorder: 'border-cyan-200' },
  user: { label: 'User', color: 'gray', badgeBg: 'bg-gray-100', badgeText: 'text-gray-500', badgeBorder: 'border-gray-200' },
  calling: { label: 'Calling', color: 'teal', badgeBg: 'bg-teal-100', badgeText: 'text-teal-700', badgeBorder: 'border-teal-200' },
};

// Sidebar badge colors (dark theme for sidebar)
export const SIDEBAR_BADGE_COLORS: Record<string, string> = {
  super_admin: 'bg-amber-400/20 text-amber-300',
  registrar: 'bg-emerald-400/20 text-emerald-300',
  processor: 'bg-blue-400/20 text-blue-300',
  coordinator: 'bg-violet-400/20 text-violet-300',
  accountant: 'bg-orange-400/20 text-orange-300',
  agency: 'bg-cyan-400/20 text-cyan-300',
  video_uploader: 'bg-rose-400/20 text-rose-300',
  genaral: 'bg-indigo-400/20 text-indigo-300',
  user: 'bg-white/10 text-white/40',
  calling: 'bg-teal-400/20 text-teal-300',
};
