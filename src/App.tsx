import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ConfirmProvider, ThemeProvider, ToastProvider } from '@/components/ui/providers';
import { Spinner } from '@/components/ui';
import { MarketingLayout } from '@/components/layout/MarketingLayout';

// Marketing (public) pages
const Home = lazy(() => import('@/features/marketing/pages/Home'));
const About = lazy(() => import('@/features/marketing/pages/About'));
const Events = lazy(() => import('@/features/marketing/pages/Events'));
const Gallery = lazy(() => import('@/features/marketing/pages/Gallery'));
const Join = lazy(() => import('@/features/marketing/pages/Join'));
const Contact = lazy(() => import('@/features/marketing/pages/Contact'));
const NotFound = lazy(() => import('@/features/marketing/pages/NotFound'));

// Member Hub (auth-gated app)
const HubApp = lazy(() => import('@/features/hub/HubApp'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);
  return null;
}

function Fallback() {
  return <div className="min-h-[60vh] flex items-center justify-center"><Spinner /></div>;
}

export default function App() {
  const { pathname } = useLocation();
  const inHub = /^\/memberhub(\/|$)/.test(pathname);
  return (
    <ThemeProvider scoped={inHub}>
      <ToastProvider>
        <ConfirmProvider>
          <ScrollToTop />
          <Suspense fallback={<Fallback />}>
            <Routes>
              <Route path="/memberhub/*" element={<HubApp />} />
              {/* Legacy links */}
              <Route path="/hours" element={<Navigate to="/memberhub" replace />} />
              <Route element={<MarketingLayout />}>
                <Route index element={<Home />} />
                <Route path="about" element={<About />} />
                <Route path="events" element={<Events />} />
                <Route path="events/:slug" element={<Events />} />
                <Route path="gallery" element={<Gallery />} />
                <Route path="join" element={<Join />} />
                <Route path="contact" element={<Contact />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
