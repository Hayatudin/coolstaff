// ── Centralized Role-Based Access Control Configuration ───────────────────────
// Single source of truth for all role definitions and route access in the system.

// All valid roles in the system
export type Role = 'user' | 'agency' | 'super_admin' | 'registrar' | 'processor' | 'coordinator' | 'accountant' | 'video_uploader' | 'genaral';

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
];

// Route → which roles can see/access it
export const ROUTE_ACCESS: Record<string, Role[]> = {
  '/dashboard':          ['super_admin', 'registrar', 'processor', 'coordinator', 'accountant', 'genaral'],
  '/candidates':         ['super_admin', 'processor', 'coordinator', 'genaral'],
  '/quick-registration': ['super_admin', 'registrar', 'genaral'],
  '/quick-registered':   ['super_admin', 'registrar', 'processor', 'genaral'],
  '/requested':          ['super_admin', 'coordinator', 'accountant', 'genaral'],
  '/fit-candidates':     ['super_admin', 'coordinator', 'genaral'],
  '/registration':       ['super_admin', 'processor', 'genaral'],
  '/cv-generator':       ['super_admin', 'processor', 'coordinator', 'genaral'],
  '/generated-cvs':      ['super_admin', 'processor', 'genaral'],
  '/invoice':            ['super_admin', 'accountant', 'genaral'],
  '/deployments':        ['super_admin', 'registrar', 'processor', 'coordinator', 'accountant', 'genaral'],
  '/brokers':            ['super_admin', 'registrar', 'processor', 'genaral'],
  '/backup':             ['super_admin', 'processor', 'coordinator', 'genaral'],
  '/settings':           ['super_admin', 'registrar', 'processor', 'coordinator', 'accountant', 'video_uploader', 'agency', 'genaral'],
  '/users':              ['super_admin'],
  '/video-uploads':      ['super_admin', 'video_uploader'],
  '/uploaded-videos':    ['super_admin', 'video_uploader', 'processor', 'coordinator', 'registrar', 'accountant'],
  '/agency/available-candidates': ['super_admin', 'agency'],
  '/agency/contracts':   ['super_admin', 'agency'],
};

// Helper: check if a role can access a specific route
export function canAccess(role: string, route: string): boolean {
  // Super admin can access everything
  if (role === 'super_admin') return true;
  
  // Find the matching route (exact or prefix match)
  const exactMatch = ROUTE_ACCESS[route];
  if (exactMatch) return exactMatch.includes(role as Role);
  
  // Prefix match for nested routes like /candidates/[id]
  for (const [path, roles] of Object.entries(ROUTE_ACCESS)) {
    if (route.startsWith(path)) {
      return roles.includes(role as Role);
    }
  }
  
  return false;
}

// Role display configuration for UI
export const ROLE_CONFIG: Record<Role, { label: string; color: string; badgeBg: string; badgeText: string; badgeBorder: string }> = {
  super_admin:    { label: 'Super Admin',    color: 'amber',    badgeBg: 'bg-amber-100',   badgeText: 'text-amber-700',   badgeBorder: 'border-amber-200' },
  registrar:      { label: 'Registrar',      color: 'emerald',  badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700', badgeBorder: 'border-emerald-200' },
  processor:      { label: 'Processor',      color: 'blue',     badgeBg: 'bg-blue-100',    badgeText: 'text-blue-700',    badgeBorder: 'border-blue-200' },
  coordinator:    { label: 'Coordinator',    color: 'violet',   badgeBg: 'bg-violet-100',  badgeText: 'text-violet-700',  badgeBorder: 'border-violet-200' },
  accountant:     { label: 'Accountant',     color: 'orange',   badgeBg: 'bg-orange-100',  badgeText: 'text-orange-700',  badgeBorder: 'border-orange-200' },
  agency:         { label: 'Agency',         color: 'cyan',     badgeBg: 'bg-cyan-100',    badgeText: 'text-cyan-700',    badgeBorder: 'border-cyan-200' },
  video_uploader: { label: 'Video Uploader', color: 'rose',     badgeBg: 'bg-rose-100',    badgeText: 'text-rose-700',    badgeBorder: 'border-rose-200' },
  genaral:        { label: 'General',        color: 'indigo',   badgeBg: 'bg-indigo-100',  badgeText: 'text-indigo-700',  badgeBorder: 'border-indigo-200' },
  user:           { label: 'User',           color: 'gray',     badgeBg: 'bg-gray-100',    badgeText: 'text-gray-500',    badgeBorder: 'border-gray-200' },
};

// Sidebar badge colors (dark theme for sidebar)
export const SIDEBAR_BADGE_COLORS: Record<string, string> = {
  super_admin:    'bg-amber-400/20 text-amber-300',
  registrar:      'bg-emerald-400/20 text-emerald-300',
  processor:      'bg-blue-400/20 text-blue-300',
  coordinator:    'bg-violet-400/20 text-violet-300',
  accountant:     'bg-orange-400/20 text-orange-300',
  agency:         'bg-cyan-400/20 text-cyan-300',
  video_uploader: 'bg-rose-400/20 text-rose-300',
  genaral:        'bg-indigo-400/20 text-indigo-300',
  user:           'bg-white/10 text-white/40',
};
