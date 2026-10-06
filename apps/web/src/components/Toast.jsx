// apps/web/src/components/Toast.jsx
/** Fixed-position HUD toast used for "coming soon" acknowledgements. */
export default function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 max-w-[calc(100vw-2.5rem)] hud-panel-cyan px-4 py-3 text-[12.5px] font-mono text-foreground shadow-hud-cyan animate-toast-in"
    >
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.85)] mr-2 align-middle" />
      {toast.message}
    </div>
  );
}
