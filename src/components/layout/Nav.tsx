// STUB — marketing agent implements. Must use NAV_LINKS from @/data/site and react-router NavLink.
import { NavLink } from 'react-router-dom';
import { NAV_LINKS } from '@/data/site';
export function Nav() {
  return <nav className="fixed top-0 inset-x-0 z-50 flex gap-4 p-4">{NAV_LINKS.map((l) => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}</nav>;
}
