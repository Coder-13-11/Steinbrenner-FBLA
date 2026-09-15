import { Outlet } from 'react-router-dom';
import { Nav } from './Nav';
import { Footer } from './Footer';
import { ParticleCanvas } from './ParticleCanvas';

/** Public site chrome: particle background, sticky nav, footer. */
export function MarketingLayout() {
  return (
    <>
      <ParticleCanvas />
      <Nav />
      <main className="relative z-[1] min-h-screen">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
