import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/cn';
import { phraseMatches } from '@/lib/phrase';
import { Button, Field, Input, Modal, Textarea } from './index';

/* ------------------------------ Toast ------------------------------ */

type ToastKind = 'ok' | 'err' | 'info';
interface Toast { id: number; kind: ToastKind; text: string }
interface ToastApi { toast: (text: string, kind?: ToastKind) => void; ok: (t: string) => void; err: (t: string) => void }

const ToastCtx = createContext<ToastApi | null>(null);
export function useToast(): ToastApi {
  const v = useContext(ToastCtx);
  if (!v) throw new Error('useToast outside <ToastProvider>');
  return v;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);
  const toast = useCallback((text: string, kind: ToastKind = 'ok') => {
    const id = ++seq.current;
    setItems((l) => [...l.slice(-3), { id, kind, text }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), kind === 'err' ? 6500 : 3800);
  }, []);
  const api = useMemo<ToastApi>(() => ({ toast, ok: (t) => toast(t, 'ok'), err: (t) => toast(t, 'err') }), [toast]);
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[1100] flex flex-col gap-2 w-[min(520px,92vw)] pointer-events-none" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className={cn('pointer-events-auto flex items-start gap-2.5 rounded-xl px-4 py-3 text-[0.94rem] shadow-panel border', t.kind === 'err' ? 'border-danger/45 text-danger' : 'hairline text-ink')}
              style={{ background: 'rgb(var(--panel2))' }}>
              {t.kind === 'err' ? <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> : t.kind === 'info' ? <Info className="h-4 w-4 mt-0.5 shrink-0 text-info" /> : <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-ok" />}
              <span>{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/* ------------------------------ Confirm ------------------------------ */

export interface ConfirmOptions {
  kicker?: string;
  title: string;
  body?: ReactNode;
  /** Rich note block (list of consequences etc). */
  note?: ReactNode;
  danger?: boolean;
  confirmText?: string;
  cancelText?: string;
  /** Require the user to type this sentence exactly (case/space-insensitive). */
  phrase?: string;
  /** Collect a free-text note. */
  input?: { label: string; placeholder?: string; minLen?: number; rows?: number };
}
export type ConfirmResult = { ok: true; value: string } | { ok: false };

interface ConfirmApi { confirm: (o: ConfirmOptions) => Promise<ConfirmResult> }
const ConfirmCtx = createContext<ConfirmApi | null>(null);
export function useConfirm(): ConfirmApi['confirm'] {
  const v = useContext(ConfirmCtx);
  if (!v) throw new Error('useConfirm outside <ConfirmProvider>');
  return v.confirm;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ o: ConfirmOptions; resolve: (r: ConfirmResult) => void } | null>(null);
  const [typed, setTyped] = useState('');
  const [value, setValue] = useState('');
  const [msg, setMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const confirm = useCallback((o: ConfirmOptions) => new Promise<ConfirmResult>((resolve) => {
    setState((prev) => { prev?.resolve({ ok: false }); return { o, resolve }; });
    setTyped(''); setValue(''); setMsg('');
  }), []);

  useEffect(() => {
    if (!state) return;
    const t = setTimeout(() => (state.o.phrase ? inputRef.current : areaRef.current)?.focus(), 40);
    return () => clearTimeout(t);
  }, [state]);

  const close = useCallback((ok: boolean) => {
    setState((s) => {
      if (!s) return null;
      if (ok) {
        if (s.o.phrase && !phraseMatches(typed, s.o.phrase)) { setMsg('The sentence does not match. Type it exactly as shown.'); return s; }
        const min = s.o.input?.minLen || 0;
        if (s.o.input && value.trim().length < min) { setMsg(`Please write at least ${min} characters.`); return s; }
        s.resolve({ ok: true, value: value.trim() });
      } else {
        s.resolve({ ok: false });
      }
      return null;
    });
  }, [typed, value]);

  const api = useMemo(() => ({ confirm }), [confirm]);
  const o = state?.o;
  const phraseOk = !o?.phrase || phraseMatches(typed, o.phrase);

  return (
    <ConfirmCtx.Provider value={api}>
      {children}
      <Modal open={!!state} onClose={() => close(false)} kicker={o?.kicker || 'Confirm'} kickerTone={o?.danger ? 'danger' : 'gold'} title={o?.title}>
        {o && (
          <form onSubmit={(e) => { e.preventDefault(); close(true); }}>
            {o.body && <p className="text-muted text-[0.95rem] leading-relaxed mb-3">{o.body}</p>}
            {o.note && (
              <div className={cn('rounded-xl px-4 py-3 text-[0.9rem] leading-relaxed mb-4 border', o.danger ? 'bg-danger/10 border-danger/40 text-ink' : 'surface-2 text-muted')}>{o.note}</div>
            )}
            {o.phrase && (
              <Field label="Type this exactly to confirm">
                <code className="block select-all mb-2 px-3.5 py-2.5 rounded-[10px] field-bg border border-dashed border-gold/45 text-gold-2 font-sans font-bold text-[0.95rem]">{o.phrase}</code>
                <Input ref={inputRef} value={typed} onChange={(e) => { setTyped(e.target.value); setMsg(''); }} placeholder="Type the sentence above" autoComplete="off" autoCapitalize="off" spellCheck={false} />
              </Field>
            )}
            {o.input && (
              <Field label={o.input.label}>
                <Textarea ref={areaRef} rows={o.input.rows || 3} value={value} onChange={(e) => { setValue(e.target.value); setMsg(''); }} placeholder={o.input.placeholder} />
              </Field>
            )}
            <div className="flex flex-wrap justify-end gap-2 mt-5">
              <Button onClick={() => close(false)}>{o.cancelText || 'Cancel'}</Button>
              <Button type="submit" variant={o.danger ? 'danger' : 'gold'} disabled={!phraseOk}>{o.confirmText || 'Confirm'}</Button>
            </div>
            {msg && <p className="text-danger text-[0.85rem] mt-2.5">{msg}</p>}
          </form>
        )}
      </Modal>
    </ConfirmCtx.Provider>
  );
}

/* ------------------------------ Theme (hub only) ------------------------------ */

export type Theme = 'dark' | 'light';
interface ThemeApi { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void }
const ThemeCtx = createContext<ThemeApi>({ theme: 'dark', setTheme: () => {}, toggle: () => {} });
export const useTheme = () => useContext(ThemeCtx);

/**
 * Applies `data-theme` to <html>. Marketing pages force dark; the hub reads the
 * saved preference. Mount with `scoped` on the hub only.
 */
export function ThemeProvider({ children, scoped }: { children: ReactNode; scoped: boolean }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try { return scoped && localStorage.getItem('fbla-hub-theme') === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
  });
  useEffect(() => {
    const t: Theme = scoped ? theme : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.style.background = t === 'light' ? '#eef1f6' : '#05102a';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'light' ? '#eef1f6' : '#05102a');
  }, [theme, scoped]);
  const setTheme = useCallback((t: Theme) => { setThemeState(t); try { localStorage.setItem('fbla-hub-theme', t); } catch { /* private mode */ } }, []);
  const api = useMemo(() => ({ theme, setTheme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') }), [theme, setTheme]);
  return <ThemeCtx.Provider value={api}>{children}</ThemeCtx.Provider>;
}
