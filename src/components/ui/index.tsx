/**
 * Shared UI kit. Keep this file the single source of primitives — pages
 * compose these instead of styling raw elements so the app stays coherent.
 */
import { forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/cn';

/* ------------------------------ Button ------------------------------ */

export type ButtonVariant = 'gold' | 'ghost' | 'danger' | 'reject' | 'link';
export type ButtonSize = 'md' | 'sm' | 'xs';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

const VARIANT: Record<ButtonVariant, string> = {
  gold: 'btn-gold',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  reject: 'btn-reject',
  link: 'btn bg-transparent px-1 min-h-0 text-gold-2 hover:underline',
};
const SIZE: Record<ButtonSize, string> = { md: '', sm: 'btn-sm', xs: 'btn-xs' };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'ghost', size = 'md', loading, icon, className, children, disabled, type = 'button', ...rest }, ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={cn(VARIANT[variant], SIZE[size], className)} {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

/* ------------------------------ Pill ------------------------------ */

export type Tone = 'neutral' | 'ok' | 'warn' | 'info' | 'danger' | 'gold';
const TONE: Record<Tone, string> = { neutral: '', ok: 'pill-ok', warn: 'pill-warn', info: 'pill-info', danger: 'pill-danger', gold: 'pill-gold' };

export function Pill({ tone = 'neutral', dot = true, className, children, ...rest }: { tone?: Tone; dot?: boolean; className?: string; children: ReactNode } & ButtonHTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('pill', TONE[tone], !dot && 'plain', className)} {...(rest as any)}>{children}</span>;
}

export function PillButton({ tone = 'neutral', dot = true, className, children, ...rest }: { tone?: Tone; dot?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={cn('pill cursor-pointer transition hover:brightness-110', TONE[tone], !dot && 'plain', className)} {...rest}>{children}</button>;
}

/* ------------------------------ Segmented control ------------------------------ */

export interface SegOption<V extends string> { value: V; label: ReactNode; disabled?: boolean; tone?: Tone }

export function Seg<V extends string>({ value, onChange, options, className, disabled, ariaLabel }: { value: V; onChange: (v: V) => void; options: SegOption<V>[]; className?: string; disabled?: boolean; ariaLabel?: string }) {
  return (
    <div className={cn('seg', className)} role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={disabled || o.disabled}
          className={cn(o.value === value && 'active', o.value === value && o.tone === 'ok' && '!text-ok', o.value === value && o.tone === 'danger' && '!text-danger', o.value === value && o.tone === 'info' && '!text-info')}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ Cards ------------------------------ */

export function Card({ className, children, as: Tag = 'div', ...rest }: { className?: string; children: ReactNode; as?: any } & Record<string, any>) {
  return <Tag className={cn('card', className)} {...rest}>{children}</Tag>;
}

export function Count({ n, hot }: { n: number; hot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-[0.74rem] font-bold border hairline', hot && n > 0 ? 'bg-gold/15 text-gold-2 border-gold/40' : 'bg-panel/5 text-muted')}>
      {n}
    </span>
  );
}

/** Section card with a header row (title · count · actions) and a body. */
export function SectionCard({ id, title, count, hot, sub, actions, children, flush, className, toolbar }: {
  id?: string; title: ReactNode; count?: number; hot?: boolean; sub?: ReactNode; actions?: ReactNode; children: ReactNode; flush?: boolean; className?: string; toolbar?: ReactNode;
}) {
  return (
    <section id={id} className={cn('card overflow-hidden mb-5 scroll-mt-32', className)}>
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b hairline">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h3 className="text-[1.1rem] font-bold tracking-tight">{title}</h3>
            {typeof count === 'number' && <Count n={count} hot={hot} />}
          </div>
          {sub && <p className="text-muted text-[0.86rem] mt-0.5 leading-snug">{sub}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap ml-auto">{actions}</div>}
      </header>
      {toolbar && <div className="flex flex-wrap items-center gap-2.5 px-5 py-3 border-b hairline surface-2 !border-x-0 !border-t-0 rounded-none">{toolbar}</div>}
      <div className={flush ? '' : 'p-5'}>{children}</div>
    </section>
  );
}

export function Stat({ value, label, tone, onClick }: { value: ReactNode; label: ReactNode; tone?: Tone; onClick?: () => void }) {
  const color = tone === 'ok' ? 'text-ok' : tone === 'danger' ? 'text-danger' : tone === 'info' ? 'text-info' : tone === 'gold' ? 'text-gold-2' : '';
  const Tag: any = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className={cn('card-2 text-left p-3.5 min-w-0', onClick && 'cursor-pointer transition hover:border-gold/45 hover:-translate-y-px')}>
      <b className={cn('block font-sans text-[1.5rem] font-bold leading-none tabular-nums', color)}>{value}</b>
      <span className="block text-muted text-[0.76rem] font-semibold mt-1.5 truncate">{label}</span>
    </Tag>
  );
}

/* ------------------------------ Forms ------------------------------ */

export function Field({ label, hint, error, children, className }: { label?: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-4', className)}>
      {label && <label className="label">{label}</label>}
      {children}
      {hint && !error && <p className="text-faint text-[0.8rem] mt-1.5">{hint}</p>}
      {error && <p className="text-danger text-[0.8rem] mt-1.5">{error}</p>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn('input', className)} {...rest} />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, rows = 4, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={cn('input resize-y', className)} {...rest} />;
});
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return <select ref={ref} className={cn('input', className)} {...rest}>{children}</select>;
});

export function Chip({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className={cn('inline-flex items-center gap-2 rounded-[10px] px-3.5 py-2 text-[0.82rem] cursor-pointer select-none border transition', checked ? 'border-gold/45 bg-gold/12 text-gold-2' : 'hairline text-muted hover:text-ink')}>
      <input type="checkbox" className="accent-gold" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

/* ------------------------------ Feedback ------------------------------ */

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-gold-2', className)} aria-label="Loading" />;
}

export function EmptyState({ title, children, action, className }: { title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-[14px] border border-dashed hairline text-center px-6 py-8 text-faint text-[0.9rem] leading-relaxed', className)}>
      {title && <p className="text-ink/80 font-semibold mb-1">{title}</p>}
      {children}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorNote({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return (
    <div className="rounded-[12px] border border-danger/40 bg-danger/10 px-4 py-3 text-[0.9rem] text-ink">
      {children}
      {onRetry && <Button size="xs" className="ml-3" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('kicker', className)}>{children}</div>;
}

/* ------------------------------ Modal ------------------------------ */

export function Modal({ open, onClose, title, kicker, kickerTone, children, width = 'md', labelledBy }: {
  open: boolean; onClose: () => void; title?: ReactNode; kicker?: ReactNode; kickerTone?: 'gold' | 'danger'; children: ReactNode; width?: 'md' | 'lg'; labelledBy?: string;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-5 bg-black/60 backdrop-blur-[2px]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.18 }}
        role="dialog" aria-modal="true" aria-labelledby={labelledBy || id}
        className={cn('relative w-full max-h-[calc(100vh-2.5rem)] overflow-auto rounded-2xl p-6 shadow-panel border hairline', width === 'lg' ? 'max-w-[640px]' : 'max-w-[520px]')}
        style={{ background: 'rgb(var(--panel2))' }}
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-3.5 right-3.5 h-8 w-8 rounded-lg border hairline text-muted hover:text-ink flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
        {kicker && <div className={cn('text-[0.7rem] tracking-[0.14em] uppercase font-bold mb-1.5', kickerTone === 'danger' ? 'text-danger' : 'text-gold-2')}>{kicker}</div>}
        {title && <h3 id={labelledBy || id} className="text-[1.3rem] font-bold tracking-tight pr-8 mb-2">{title}</h3>}
        {children}
      </motion.div>
    </div>
  );
}

/* ------------------------------ Motion helpers ------------------------------ */

/** Fade-up on scroll. Wrap sections; respects reduced motion. */
export function Reveal({ children, className, delay = 0, as: Tag = 'div' }: { children: ReactNode; className?: string; delay?: number; as?: any }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const reduce = useReducedMotion();
  const MTag = (motion as any)[Tag] || motion.div;
  return (
    <MTag ref={ref} className={className} initial={reduce ? false : { opacity: 0, y: 18 }} animate={inView || reduce ? { opacity: 1, y: 0 } : undefined} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}>
      {children}
    </MTag>
  );
}

export function Avatar({ name, src, size = 44, className }: { name?: string | null; src?: string | null; size?: number; className?: string }) {
  const init = String(name || '?').trim().split(/\s+/).filter(Boolean).map((p, i, a) => (i === 0 || i === a.length - 1 ? p[0] : '')).join('').toUpperCase() || '?';
  return src ? (
    <img src={src} alt="" width={size} height={size} className={cn('rounded-full object-cover border-2 border-gold/35 shrink-0', className)} style={{ width: size, height: size }} referrerPolicy="no-referrer" />
  ) : (
    <div className={cn('rounded-full bg-gold/20 text-gold-2 border border-gold/30 flex items-center justify-center font-bold shrink-0', className)} style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden>
      {init}
    </div>
  );
}
