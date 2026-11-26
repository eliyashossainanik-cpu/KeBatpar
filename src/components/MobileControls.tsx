import { memo, useEffect, useRef, useState } from 'react';
import { ArrowUp, OctagonAlert, Volume2, Zap } from 'lucide-react';

export interface MobileControlsProps {
  visible: boolean;
  joystickInputRef: React.MutableRefObject<{ x: number; y: number }>;
  onJump?: () => void;
  isDriving?: boolean;
  onHorn?: () => void;
  onHandbrakeChange?: (active: boolean) => void;
  onBoostChange?: (active: boolean) => void;
}

const MAX_RADIUS = 38;

export const MobileControls = memo(function MobileControls({
  visible,
  joystickInputRef,
  onJump,
  isDriving = false,
  onHorn,
  onHandbrakeChange,
  onBoostChange,
}: MobileControlsProps) {
  const [sprinting, setSprinting] = useState(false);
  const [isLandscapeCompact, setIsLandscapeCompact] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight <= 540 : false,
  );
  const padRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  const setKnobTransform = (ox: number, oy: number) => {
    if (knobRef.current) {
      knobRef.current.style.transform = `translate3d(${ox}px, ${oy}px, 0)`;
    }
  };

  useEffect(() => {
    const checkViewport = () => {
      setIsLandscapeCompact(window.innerHeight <= 540);
    };
    window.addEventListener('resize', checkViewport);
    window.visualViewport?.addEventListener('resize', checkViewport);
    return () => {
      window.removeEventListener('resize', checkViewport);
      window.visualViewport?.removeEventListener('resize', checkViewport);
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      joystickInputRef.current = { x: 0, y: 0 };
      setKnobTransform(0, 0);
      setSprinting(false);
      activePointerIdRef.current = null;
    }
  }, [visible, joystickInputRef]);

  useEffect(() => {
    const resetStick = () => {
      joystickInputRef.current = { x: 0, y: 0 };
      setKnobTransform(0, 0);
      setSprinting(false);
      activePointerIdRef.current = null;
    };
    window.addEventListener('blur', resetStick);
    return () => {
      window.removeEventListener('blur', resetStick);
      joystickInputRef.current = { x: 0, y: 0 };
    };
  }, [joystickInputRef]);

  if (!visible) return null;

  const updateStickFromPointer = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, MAX_RADIUS);
    const angle = Math.atan2(dy, dx);
    const ox = dist > 0 ? Math.cos(angle) * clampedDist : 0;
    const oy = dist > 0 ? Math.sin(angle) * clampedDist : 0;

    setKnobTransform(ox, oy);

    const norm = clampedDist / MAX_RADIUS;
    if (norm < 0.12) {
      joystickInputRef.current = { x: 0, y: 0 };
      setSprinting((prev) => (prev ? false : prev));
    } else {
      joystickInputRef.current = {
        x: dist > 0 ? Math.cos(angle) * norm : 0,
        y: dist > 0 ? Math.sin(angle) * norm : 0,
      };
      const nextSprint = norm >= 0.85;
      setSprinting((prev) => (prev === nextSprint ? prev : nextSprint));
    }
  };

  return (
    <>
      <div
        className="fixed z-20 pointer-events-auto select-none flex flex-col items-center gap-1"
        style={{
          left: 'max(0.75rem, env(safe-area-inset-left))',
          bottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          touchAction: 'none',
        }}
      >
        <div
          ref={padRef}
          role="application"
          aria-label="ভার্চুয়াল চলাফেরার জয়স্টিক"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            activePointerIdRef.current = e.pointerId;
            updateStickFromPointer(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (activePointerIdRef.current !== e.pointerId) return;
            e.preventDefault();
            updateStickFromPointer(e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            if (activePointerIdRef.current !== e.pointerId) return;
            e.preventDefault();
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
            activePointerIdRef.current = null;
            setKnobTransform(0, 0);
            setSprinting(false);
            joystickInputRef.current = { x: 0, y: 0 };
          }}
          onPointerCancel={() => {
            activePointerIdRef.current = null;
            setKnobTransform(0, 0);
            setSprinting(false);
            joystickInputRef.current = { x: 0, y: 0 };
          }}
          className={`relative ${
            isLandscapeCompact ? 'w-[96px] h-[96px]' : 'w-[110px] h-[110px] sm:w-[120px] sm:h-[120px]'
          } rounded-full border-2 ${
            sprinting
              ? 'border-emerald-400 shadow-[0_0_22px_rgba(52,211,153,0.45)]'
              : 'border-amber-300/60 shadow-[0_0_18px_rgba(251,191,36,0.18)]'
          } flex items-center justify-center transition-colors`}
          style={{ backgroundColor: 'rgba(9, 14, 24, 0.78)', touchAction: 'none' }}
        >
          {sprinting && (
            <span className="absolute -top-2.5 px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-display text-[8px] font-black tracking-wider pointer-events-none shadow">
              দৌড়
            </span>
          )}
          {/* PUBG tactical directional crosshairs inside thumbpad */}
          <span className="absolute top-1.5 w-1 h-1.5 rounded-full bg-white/30 pointer-events-none" />
          <span className="absolute bottom-1.5 w-1 h-1.5 rounded-full bg-white/30 pointer-events-none" />
          <span className="absolute left-1.5 w-1.5 h-1 rounded-full bg-white/30 pointer-events-none" />
          <span className="absolute right-1.5 w-1.5 h-1 rounded-full bg-white/30 pointer-events-none" />
          <div
            className={`${
              isLandscapeCompact ? 'w-[60px] h-[60px]' : 'w-[70px] h-[70px]'
            } rounded-full border border-dashed border-white/20 pointer-events-none`}
          />
          <div className="w-2 h-2 rounded-full bg-amber-300/35 pointer-events-none" />
          <div
            ref={knobRef}
            className={`absolute ${
              isLandscapeCompact ? 'w-10 h-10' : 'w-11 h-11 sm:w-12 sm:h-12'
            } rounded-full ${
              sprinting ? 'bg-emerald-400' : 'bg-amber-400'
            } border-2 border-white shadow-xl pointer-events-none will-change-transform flex items-center justify-center`}
            style={{
              transform: 'translate3d(0px, 0px, 0)',
            }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-slate-950/35 border border-white/40" />
          </div>
        </div>
        {!isLandscapeCompact && (
          <span
            className="text-[10px] font-semibold text-slate-200 px-2 py-0.5 rounded-md border border-white/15 max-w-[124px] text-center leading-tight"
            style={{ backgroundColor: 'rgba(9, 14, 24, 0.78)' }}
          >
            ড্র্যাগ: ৩৬০° ঘুরে দেখো
          </span>
        )}
      </div>

      {isDriving ? (
        <div
          className="fixed z-20 pointer-events-auto select-none flex flex-col items-center gap-2"
          style={{
            right: 'max(0.75rem, env(safe-area-inset-right))',
            bottom: isLandscapeCompact ? '5.05rem' : '5.85rem',
            touchAction: 'none',
          }}
        >
          {onHorn && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onHorn();
              }}
              aria-label="গাড়ির হর্ন"
              className={`${
                isLandscapeCompact ? 'w-[44px] h-[44px]' : 'w-[48px] h-[48px]'
              } rounded-full border-2 border-sky-300/80 flex flex-col items-center justify-center text-sky-200 active:scale-90 transition-transform shadow-lg`}
              style={{ backgroundColor: 'rgba(10, 16, 28, 0.88)', touchAction: 'none' }}
            >
              <Volume2 className="w-4 h-4" />
              <span className="text-[8px] font-display font-black leading-none mt-0.5">হর্ন</span>
            </button>
          )}
          {onBoostChange && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onBoostChange(true);
              }}
              onPointerUp={() => onBoostChange(false)}
              onPointerLeave={() => onBoostChange(false)}
              onPointerCancel={() => onBoostChange(false)}
              aria-label="গতি বাড়াও"
              className={`${
                isLandscapeCompact ? 'w-[46px] h-[46px]' : 'w-[52px] h-[52px]'
              } rounded-full border-2 border-emerald-300/80 flex flex-col items-center justify-center text-emerald-200 active:scale-90 transition-transform shadow-lg`}
              style={{ backgroundColor: 'rgba(6, 40, 32, 0.9)', touchAction: 'none' }}
            >
              <Zap className="w-4 h-4" />
              <span className="text-[8.5px] font-display font-black leading-none mt-0.5">নাইট্রো</span>
            </button>
          )}
          {onHandbrakeChange && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onHandbrakeChange(true);
              }}
              onPointerUp={() => onHandbrakeChange(false)}
              onPointerLeave={() => onHandbrakeChange(false)}
              onPointerCancel={() => onHandbrakeChange(false)}
              aria-label="হ্যান্ডব্রেক"
              className={`${
                isLandscapeCompact ? 'w-[48px] h-[48px]' : 'w-[54px] h-[54px]'
              } rounded-full border-2 border-rose-400/80 flex flex-col items-center justify-center text-rose-200 active:scale-90 transition-transform shadow-lg`}
              style={{ backgroundColor: 'rgba(42, 12, 20, 0.9)', touchAction: 'none' }}
            >
              <OctagonAlert className="w-4 h-4" />
              <span className="text-[8.5px] font-display font-black leading-none mt-0.5">ব্রেক</span>
            </button>
          )}
        </div>
      ) : (
        onJump && (
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onJump();
            }}
            aria-label="লাফ দাও"
            className={`fixed z-20 pointer-events-auto select-none ${
              isLandscapeCompact ? 'w-[48px] h-[48px] bottom-[5.05rem]' : 'w-[54px] h-[54px] bottom-[5.85rem]'
            } rounded-full border-2 border-amber-300/75 flex flex-col items-center justify-center text-amber-200 active:scale-90 transition-transform shadow-[0_6px_20px_rgba(0,0,0,0.65)]`}
            style={{
              right: 'max(0.75rem, env(safe-area-inset-right))',
              backgroundColor: 'rgba(10, 16, 28, 0.88)',
              touchAction: 'none',
            }}
          >
            <span className="absolute inset-[3px] rounded-full border border-white/15 pointer-events-none" />
            <ArrowUp className={isLandscapeCompact ? 'w-4 h-4' : 'w-5 h-5'} />
            <span className="text-[9px] font-display font-black tracking-wider leading-none mt-0.5">লাফ</span>
          </button>
        )
      )}
    </>
  );
});
