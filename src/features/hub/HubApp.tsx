/**
 * Member Hub shell. Owns: auth stage switch, app bar, tab navigation, nested routes.
 * Page components live in ./pages (members) and ./staff (officers/advisers).
 */
import { lazy, Suspense, useEffect } from 'react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Moon, Sun, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { BootScreen, SignInScreen, VerifyEmailScreen, OnboardingScreen, PendingScreen } from './auth/screens';
import { Avatar, Button, Pill, Spinner } from '@/components/ui';
import { useTheme } from '@/components/ui/providers';
import { cn } from '@/lib/cn';
import { SITE } from '@/data/site';
import { ROLE_LABEL } from './data/types';

const Overview = lazy(() => import('./pages/Overview'));
const Calendar = lazy(() => import('./pages/Calendar'));
const EventsPage = lazy(() => import('./pages/Events'));
const CheckIn = lazy(() => import('./pages/CheckIn'));
const Hours = lazy(() => import('./pages/Hours'));
const Announcements = lazy(() => import('./pages/Announcements'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Activity = lazy(() => import('./pages/Activity'));
const StaffCommand = lazy(() => import('./staff/StaffCommand'));
const Attendance = lazy(() => import('./staff/Attendance'));
const Projector = lazy(() => import('./staff/Projector'));

export default function HubApp() {
  return (
    <AuthProvider>
      <HubStage />
    </AuthProvider>
  );
}

function HubStage() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { document.title = 'Member Hub · Steinbrenner FBLA'; }, []);

  // Legacy QR links: /memberhub?checkin=CODE → /memberhub/checkin?code=CODE
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const legacy = p.get('checkin');
    if (legacy) navigate(`/memberhub/checkin?code=${encodeURIComponent(legacy.toUpperCase())}`, { replace: true });
  }, [location.search, navigate]);

  // Remember a pending check-in code across the sign-in flow.
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const code = p.get('code');
    if (code && location.pathname.endsWith('/checkin')) { try { sessionStorage.setItem('fbla-checkin-code', code.toUpperCase()); } catch { /* noop */ } }
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col">
      <AppBar />
      <div className="flex-1 w-full max-w-hub mx-auto px-4 sm:px-6 pt-6 pb-16">
        {auth.stage === 'boot' && <BootScreen />}
        {auth.stage === 'out' && <SignInScreen />}
        {auth.stage === 'verify' && <VerifyEmailScreen />}
        {auth.stage === 'onboard' && <OnboardingScreen />}
        {auth.stage === 'pending' && <PendingScreen />}
        {auth.stage === 'in' && <SignedIn />}
      </div>
    </div>
  );
}

function AppBar() {
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-40 border-b hairline backdrop-blur-xl" style={{ background: 'rgb(var(--bg) / 0.86)' }}>
      <div className="max-w-hub mx-auto px-4 sm:px-6 h-[68px] flex items-center justify-between gap-3">
        <Link to="/memberhub" className="flex items-center gap-3 min-w-0">
          <img src={SITE.logos.crest} alt="" width={34} height={32} className="w-9 h-auto" />
          <div className="min-w-0 leading-tight">
            <strong className="block text-[1.05rem] font-bold">Member Hub</strong>
            <span className="block text-[0.76rem] text-faint truncate">Steinbrenner FBLA · chapter tools</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={toggle} aria-pressed={theme === 'light'} icon={theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}>
            <span className="hidden sm:inline">{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
          </Button>
          <Link to="/" className="btn-ghost btn-sm">← <span className="hidden sm:inline">Chapter website</span><span className="sm:hidden">Site</span></Link>
        </div>
      </div>
    </header>
  );
}

const TABS = [
  { to: '/memberhub', label: 'Home', end: true },
  { to: '/memberhub/calendar', label: 'Calendar' },
  { to: '/memberhub/events', label: 'Events' },
  { to: '/memberhub/checkin', label: 'Check in' },
  { to: '/memberhub/hours', label: 'Hours' },
];

function SignedIn() {
  const { user, profile, isStaff, staffRole, signOut } = useAuth();
  const role = profile?.role || (isStaff ? staffRole! : 'member');
  const location = useLocation();
  const inStaff = location.pathname.startsWith('/memberhub/staff');
  const isProjector = location.pathname.startsWith('/memberhub/staff/projector');
  if (isProjector) {
    return (
      <Suspense fallback={<Spinner />}>
        <Routes><Route path="staff/projector/:eventId" element={isStaff ? <Projector /> : <Navigate to="/memberhub" replace />} /></Routes>
      </Suspense>
    );
  }
  return (
    <>
      {/* Profile strip */}
      <div className="card flex flex-wrap items-center gap-4 px-5 py-4 mb-5 animate-fadeUp">
        <Avatar name={profile?.displayName || user?.displayName} src={user?.photoURL} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[1.5rem] sm:text-[1.8rem] font-bold tracking-tight leading-none">{profile?.displayName || user?.displayName || user?.email}</h1>
            <Pill tone={role === 'advisor' ? 'gold' : role === 'officer' ? 'info' : 'neutral'} dot={false}>{ROLE_LABEL[role]}</Pill>
          </div>
          <div className="text-muted text-[0.92rem] mt-1 truncate">{user?.email}</div>
        </div>
        <Button size="sm" onClick={() => void signOut()} icon={<LogOut className="h-4 w-4" />}>Sign out</Button>
      </div>

      {/* Tabs */}
      <nav className="card flex gap-1 p-1.5 mb-6 overflow-x-auto animate-fadeUp" role="tablist" aria-label="Member Hub sections">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} role="tab" className={({ isActive }) => cn('px-4 py-2.5 rounded-[10px] text-[0.95rem] font-semibold whitespace-nowrap transition', isActive ? 'bg-gold/15 text-gold-2' : 'text-muted hover:text-ink')}>
            {t.label}
          </NavLink>
        ))}
        {isStaff && (
          <NavLink to="/memberhub/staff" role="tab" className={cn('px-4 py-2.5 rounded-[10px] text-[0.95rem] font-semibold whitespace-nowrap transition ml-auto', inStaff ? 'bg-gold/15 text-gold-2' : 'text-muted hover:text-ink')}>
            Staff
          </NavLink>
        )}
      </nav>

      <Suspense fallback={<div className="py-16 flex justify-center"><Spinner /></div>}>
        <Routes>
          <Route element={<Outlet />}>
            <Route index element={<Overview />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="checkin" element={<CheckIn />} />
            <Route path="hours" element={<Hours />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="activity" element={<Activity />} />
            <Route path="staff" element={isStaff ? <StaffCommand /> : <Navigate to="/memberhub" replace />} />
            <Route path="staff/attendance/:eventId" element={isStaff ? <Attendance /> : <Navigate to="/memberhub" replace />} />
            <Route path="*" element={<Navigate to="/memberhub" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
