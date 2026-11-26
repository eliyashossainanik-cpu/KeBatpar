import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PLAYER_COLORS,
  SPECIAL_ROLES,
  type EjectionInfo,
  type MatchOutcome,
  type RoomSnapshot,
  type SpecialRole,
} from '../shared/types';
import { loadCareerStats } from '../game/statsStore';
import { isNeutralRole } from '../shared/gameRules';
import { getChubaniTaunts, ROLE_COMEDY_TAGLINES } from '../shared/banglaComedy';
import { soundEngine } from '../audio/soundEngine';
import {
  RotateCcw,
  Home,
  Play,
  Trophy,
  Skull,
  Sparkles,
  Music2,
  BookOpen,
  ShieldCheck,
  Users,
  EyeOff,
  Waves,
  Volume2,
} from 'lucide-react';

interface RouletteCardDef {
  id: string;
  label: string;
  bangla: string;
  faction: 'parabasi' | 'vondo' | 'neutral';
  accent: string;
}

const ROLE_ROULETTE_DECK: RouletteCardDef[] = [
  { id: 'none', label: 'পাড়াবাসী', bangla: 'মহল্লা দল', faction: 'parabasi', accent: '#38bdf8' },
  { id: 'vondo', label: 'বাটপার', bangla: 'বাটপার গ্যাং', faction: 'vondo', accent: '#fb7185' },
  { id: 'goyenda', label: 'গোয়েন্দা মফিজ', bangla: 'পাড়াবাসী দল', faction: 'parabasi', accent: '#22d3ee' },
  { id: 'bohurupi', label: 'বহুরূপী বাটপার', bangla: 'বাটপার গ্যাং', faction: 'vondo', accent: '#f43f5e' },
  { id: 'kobiraj', label: 'তাবিজ বাবা', bangla: 'পাড়াবাসী দল', faction: 'parabasi', accent: '#34d399' },
  { id: 'daroga', label: 'পাড়া দারোগা', bangla: 'পাড়াবাসী দল', faction: 'parabasi', accent: '#f97316' },
  { id: 'jharudar', label: 'সাফাই বাটপার', bangla: 'বাটপার গ্যাং', faction: 'vondo', accent: '#e11d48' },
  { id: 'mistri', label: 'মিস্ত্রি বাবু', bangla: 'পাড়াবাসী দল', faction: 'parabasi', accent: '#fbbf24' },
  { id: 'daktar', label: 'পাড়া ডাক্তার', bangla: 'পাড়াবাসী দল', faction: 'parabasi', accent: '#2dd4bf' },
  { id: 'neta', label: 'মহল্লা নেতা', bangla: 'পাড়াবাসী দল', faction: 'parabasi', accent: '#facc15' },
  { id: 'ghotok_khala', label: 'ঘটক খালা', bangla: 'পাড়াবাসী দল', faction: 'parabasi', accent: '#f472b6' },
  { id: 'master_moshai', label: 'মাস্টার মশাই', bangla: 'পাড়াবাসী দল', faction: 'parabasi', accent: '#60a5fa' },
  { id: 'cctv_kaku', label: 'সিসিটিভি কাকু', bangla: 'পাড়াবাসী দল', faction: 'parabasi', accent: '#fb923c' },
  { id: 'hatur_daktar', label: 'হাতুড়ে ডাক্তার', bangla: 'পাড়াবাসী দল', faction: 'parabasi', accent: '#a3e635' },
  { id: 'supari_killer', label: 'সুপারি কিলার', bangla: 'বাটপার গ্যাং', faction: 'vondo', accent: '#ef4444' },
  { id: 'dalal', label: 'দালাল বাটপার', bangla: 'বাটপার গ্যাং', faction: 'vondo', accent: '#dc2626' },
  { id: 'pagol', label: 'পাগলা বাবা', bangla: 'নিরপেক্ষ চরিত্র', faction: 'neutral', accent: '#c084fc' },
  { id: 'chamcha', label: 'চামচা', bangla: 'নিরপেক্ষ চরিত্র', faction: 'neutral', accent: '#a855f7' },
  { id: 'chandabaz', label: 'চাঁদাবাজ', bangla: 'নিরপেক্ষ চরিত্র', faction: 'neutral', accent: '#eab308' },
  { id: 'tiktok_star', label: 'টিকটক স্টার', bangla: 'নিরপেক্ষ চরিত্র', faction: 'neutral', accent: '#ec4899' },
];

const LOADING_MOHOLLA_TIPS = [
  'চায়ের দোকানে দুধ-চায়ের পানি গরম হচ্ছে...',
  'চুবানির জন্য পুকুরের পানি পরিষ্কার করা হচ্ছে...',
  'ডেসকো-র ফিউজ বক্স যাচাই করা হচ্ছে...',
  'কে আসল বাটপার সেটা গোধূলি বেলাতেই ধরা পড়বে!',
];

export function MatchLoadingOverlay({ subtitle }: { subtitle?: string }) {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTipIndex((i) => (i + 1) % LOADING_MOHOLLA_TIPS.length);
    }, 1100);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="মহল্লার ম্যাচ লোড হচ্ছে"
      className="fixed inset-0 z-40 flex flex-col items-center justify-center p-6 text-center overflow-hidden"
      style={{
        background: 'radial-gradient(circle at 50% 42%, rgba(15, 34, 66, 0.98) 0%, rgba(5, 8, 16, 1) 75%)',
      }}
    >
      {/* Subtle Starfield Dots */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-35 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(2px 2px at 18% 22%, #fff 50%, transparent 100%), radial-gradient(2px 2px at 78% 16%, #fde68a 50%, transparent 100%), radial-gradient(1.5px 1.5px at 34% 72%, #bae6fd 50%, transparent 100%), radial-gradient(2px 2px at 84% 68%, #fff 50%, transparent 100%), radial-gradient(1.5px 1.5px at 56% 30%, #fff 50%, transparent 100%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-4 max-w-md w-full animate-fade-in">
        {/* Among Us Style Floating Runner */}
        <div className="animate-amg-runner">
          <svg viewBox="0 0 96 96" className="w-24 h-24 drop-shadow-[0_12px_28px_rgba(56,189,248,0.35)]" aria-hidden="true">
            <rect x="18" y="36" width="13" height="32" rx="5" fill="#94a3b8" stroke="#0f172a" strokeWidth="3" />
            <rect x="28" y="20" width="44" height="54" rx="21" fill="#e11d48" stroke="#0f172a" strokeWidth="3.2" />
            <rect x="33" y="68" width="12" height="15" rx="5" fill="#e11d48" stroke="#0f172a" strokeWidth="2.8" />
            <rect x="53" y="68" width="12" height="15" rx="5" fill="#e11d48" stroke="#0f172a" strokeWidth="2.8" />
            <rect x="44" y="31" width="27" height="16" rx="8" fill="#7dd3fc" stroke="#0f172a" strokeWidth="2.8" />
            <ellipse cx="62" cy="36" rx="5" ry="2.3" fill="#ffffff" opacity="0.88" />
          </svg>
        </div>

        <div className="space-y-1">
          <p className="font-mono-tabular text-[11px] uppercase tracking-[0.28em] text-amber-300 font-bold">
            কে বাটপার? · মহল্লা লোডিং
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-black text-white">
            {subtitle ?? 'মহল্লায় প্রবেশ হচ্ছে...'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">{LOADING_MOHOLLA_TIPS[tipIndex]}</p>
        </div>

        {/* Shimmering Progress Bar */}
        <div className="w-64 h-2 rounded-full bg-slate-800/90 border border-white/10 overflow-hidden relative">
          <div className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-gradient-to-r from-amber-400 via-sky-300 to-emerald-400 animate-amg-loading-bar" />
        </div>
      </div>
    </div>
  );
}

function ChibiRolePortrait({
  colorHex,
  visorTint,
  isVondo,
  isPagol,
  specialRole,
}: {
  colorHex: string;
  visorTint: string;
  isVondo: boolean;
  isPagol: boolean;
  specialRole: SpecialRole;
}) {
  return (
    <svg viewBox="0 0 96 96" className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 drop-shadow-lg" aria-hidden="true">
      {/* Glow ring */}
      <circle
        cx="48"
        cy="48"
        r="44"
        fill={isPagol ? '#3b0764' : isVondo ? '#450a0a' : '#082f49'}
        stroke={isPagol ? '#c084fc' : isVondo ? '#fb7185' : '#38bdf8'}
        strokeWidth="3"
      />
      {/* Backpack */}
      <rect x="20" y="38" width="12" height="30" rx="5" fill="#94a3b8" stroke="#0f172a" strokeWidth="2.5" />
      {/* Body */}
      <rect x="28" y="24" width="42" height="52" rx="20" fill={colorHex} stroke="#0f172a" strokeWidth="3" />
      {/* Legs */}
      <rect x="33" y="68" width="12" height="14" rx="5" fill={colorHex} stroke="#0f172a" strokeWidth="2.5" />
      <rect x="52" y="68" width="12" height="14" rx="5" fill={colorHex} stroke="#0f172a" strokeWidth="2.5" />
      {/* Visor */}
      <rect
        x="42"
        y="34"
        width="26"
        height="15"
        rx="7.5"
        fill={isVondo ? '#fecdd3' : visorTint}
        stroke="#0f172a"
        strokeWidth="2.5"
      />
      <ellipse cx="59" cy="39" rx="5" ry="2.2" fill="#ffffff" opacity="0.8" />
      {/* Role Prop Accent */}
      {isVondo && (
        <g transform="translate(65 44) rotate(-25)">
          <rect x="0" y="10" width="5" height="9" rx="2" fill="#78350f" stroke="#0f172a" strokeWidth="1.5" />
          <polygon points="0,10 5,10 2.5,-4" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
        </g>
      )}
      {isPagol && (
        <text x="48" y="20" textAnchor="middle" fontSize="14" fontWeight="900" fill="#e9d5ff">
          @.@
        </text>
      )}
      {!isVondo && !isPagol && specialRole !== 'none' && (
        <circle cx="71" cy="24" r="9" fill="#fbbf24" stroke="#0f172a" strokeWidth="2" />
      )}
    </svg>
  );
}

function getRoleHowToPlay(isVondo: boolean, specialRole: SpecialRole): string[] {
  if (isVondo) {
    const lines = [
      'একা থাকা পাড়াবাসীকে [Q / গ্যাপে নাও] দিয়ে আঘাত করো আর [V] চেপে ড্রেন দিয়ে পালিয়ে যাও!',
      '[Tab / ম্যাপ] থেকে ডেসকো বিদ্যুৎ, ওয়াইফাই বা গ্যাস লিক নাশকতা দাও যাতে সবাই দৌড়াদৌড়ি করে।',
    ];
    if (specialRole === 'bohurupi') {
      lines.push('বহুরূপী ক্ষমতা [G]: অন্য খেলোয়াড়ের ছদ্মবেশ ধরে সিসিটিভি ক্যামেরায় তাকে ফাঁসিয়ে দাও!');
    } else if (specialRole === 'jharudar') {
      lines.push('সাফাই বাটপার [G]: শিকার করার পর পড়ে থাকা লাশ গায়েব করে দাও যাতে কেউ রিপোর্ট করতে না পারে!');
    } else if (specialRole === 'supari_killer') {
      lines.push('সুপারি কিলার [G]: চিহ্নিত সুপারি টার্গেটকে মারলে পরের কিল বিরতি অর্ধেক (৫০%) কমে যাবে!');
    } else if (specialRole === 'dalal') {
      lines.push('দালাল ক্ষমতা [G]: শাটার বন্ধের সময় +৮ সেকেন্ড বাড়ায় ও ১০ সেকেন্ডের জন্য অ্যাডমিন রাডার ও ভাইটালস অচল করে!');
    } else {
      lines.push('সালিশে দারুণ অভিনয় করো — নিজের দিকে সন্দেহ এলে অন্য কারো ওপর দোষ চাপিয়ে বেঁচে যাও!');
    }
    return lines;
  }
  if (specialRole === 'pagol') {
    return [
      'তুমি কোনো দলেই নেই! তোমার লক্ষ্য: সালিশে সবাই যেন তোমাকেই পুকুরে ফেলে দেয়!',
      'কাজ না করে একটু সন্দেহজনকভাবে ঘোরাফেরা করো আর চ্যাটে উল্টাপাল্টা কথা বলো!',
    ];
  }
  if (specialRole === 'chamcha') {
    return [
      'ম্যাচের মধ্যে [G] চেপে একজন বস বেছে নাও — বসের দল জিতলে তুমিও সহ-বিজয়ী হবে!',
      'যদি তোমার বস বাটপার হয় তবে বাটপারদের সাথেই জিতবে; তবে শেষ পর্যন্ত জীবিত থাকতে হবে!',
    ];
  }
  if (specialRole === 'chandabaz') {
    return [
      'ম্যাচে যতজন জীবিত প্রতিবেশী আছে সবার কাছে গিয়ে [G] চেপে চাঁদা আদায় করো — সবাই জীবিত থাকা অবস্থায় পূর্ণ হলে জয়!',
      'প্রতিবার ৩০ সেকেন্ড কুলডাউন থাকে; শিকার ও আশপাশের মানুষ সাথে সাথে জেনে যায়, আর কেউ মারা গেলে হিসাব বদলায় — খুব সাবধান!',
    ];
  }
  if (specialRole === 'tiktok_star') {
    return [
      '৩টি আলাদা মহল্লা এলাকায় গিয়ে [G] চেপে ভাইরাল রিল শুট করো!',
      '৩টি রিল শেষ করে ম্যাচের শেষ ৪ জনে টিকে থাকতে পারলেই ভাইরাল একক জয়!',
    ];
  }
  const lines = [
    'হলুদ চিহ্নে গিয়ে [E / কাজ] দিয়ে পাড়ার কাজ শেষ করো — ১০০% হলেই পাড়াবাসীর জয়!',
    'লাশ দেখলে [R / রিপোর্ট] দাও বা আড্ডা ঘণ্টা বাজিয়ে সালিশে বাটপারকে পুকুরে ফেলো!',
  ];
  if (specialRole === 'goyenda') {
    lines.push('গোয়েন্দা ক্ষমতা [G]: পায়ের ছাপ দেখো আর লাশ স্ক্যান করে খুনির রঙের সূত্র বের করো!');
  } else if (specialRole === 'kobiraj') {
    lines.push('তাবিজ বাবা [G]: কাছের প্রতিবেশীকে তাবিজ ঢাল পরাও — একবার বাটপারের হামলা থেকে বাঁচাবে!');
  } else if (specialRole === 'mistri') {
    lines.push('মিস্ত্রি ক্ষমতা [V]: ড্রেন দিয়ে দ্রুত যাতায়াত করো আর দূর থেকেই ডেসকো ও ওয়াইফাই ঠিক করো!');
  } else if (specialRole === 'daroga') {
    lines.push('দারোগা ক্ষমতা [G]: আসল বাটপারকে ১ গুলিতেই খতম করো! (ভুল করে পাড়াবাসী মারলে নিজেই বাদ!)');
  } else if (specialRole === 'neta') {
    lines.push('নেতা ক্ষমতা: সালিশে তোমার ভোট ২টি হিসেবে গণনা হবে আর বাড়তি ১টি আড্ডা ঘণ্টা পাবে!');
  } else if (specialRole === 'daktar') {
    lines.push('ডাক্তার ক্ষমতা [G]: ম্যাচে ১ বার রিপোর্ট না হওয়া পড়া প্রতিবেশীকে স্যালাইন দিয়ে বাঁচিয়ে তোলো!');
  } else if (specialRole === 'ghotok_khala') {
    lines.push('ঘটক খালা [G]: ২ জনকে মহল্লা বন্ধনে জুড়ে দাও — একজন মরলেই অন্যজন সতর্কবার্তা পাবে!');
  } else if (specialRole === 'master_moshai') {
    lines.push('মাস্টার মশাই [G]: কাছের খেলোয়াড়ের খাতা পরীক্ষা করে দেখো সে ভুয়া নাটক করছে কিনা!');
  } else if (specialRole === 'cctv_kaku') {
    lines.push('সিসিটিভি কাকু [G]: মহল্লার যেকোনো জায়গা থেকেই পকেট ফোনে লাইভ সিসিটিভি ক্যামেরা দেখো!');
  } else if (specialRole === 'hatur_daktar') {
    lines.push('হাতুড়ে ডাক্তার [G]: প্রতিবেশীকে ১২ সেকেন্ডের ঝাঁঝালো ইনজেকশন দাও — বাটপার মারলেও বেঁচে যাবে!');
  }
  return lines;
}

export function RoleRevealModal({
  snapshot,
  localPlayerId,
  onContinue,
}: {
  snapshot: RoomSnapshot;
  localPlayerId: string;
  onContinue?: () => void;
}) {
  const localPlayer = snapshot.players.find((p) => p.id === localPlayerId);
  const [elapsedMs, setElapsedMs] = useState(0);
  const shhhhPlayedRef = useRef(false);
  const lastTickStepRef = useRef(-1);

  const ROULETTE_END_MS = 1800;
  const TOTAL_DISPLAY_MS = onContinue ? 15000 : 8000;

  useEffect(() => {
    shhhhPlayedRef.current = false;
    lastTickStepRef.current = -1;
    setElapsedMs(0);
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      setElapsedMs(performance.now() - startedAt);
    }, 50);
    return () => window.clearInterval(timer);
  }, [localPlayerId, snapshot.roomCode]);

  const isVondo = localPlayer?.role === 'vondo';
  const isNeutral = Boolean(localPlayer && isNeutralRole(localPlayer.specialRole));
  const flipped = elapsedMs >= ROULETTE_END_MS;

  // Step-slowing Super Sus deck roulette index
  const rouletteIndex = useMemo(() => {
    if (elapsedMs >= ROULETTE_END_MS) return 0;
    const progress = elapsedMs / ROULETTE_END_MS;
    const step = Math.floor(Math.pow(progress, 0.78) * 18);
    return step;
  }, [elapsedMs]);

  useEffect(() => {
    if (!localPlayer) return;
    if (!flipped) {
      if (rouletteIndex !== lastTickStepRef.current) {
        lastTickStepRef.current = rouletteIndex;
        soundEngine.playCardTick();
      }
      return;
    }
    if (!shhhhPlayedRef.current) {
      shhhhPlayedRef.current = true;
      soundEngine.playShhhhSound(Boolean(isVondo), Boolean(isNeutral));
    }
  }, [flipped, rouletteIndex, isVondo, isNeutral, localPlayer]);

  if (!localPlayer) return null;

  const specialMeta = SPECIAL_ROLES[localPlayer.specialRole];
  const colorSpec = PLAYER_COLORS.find((col) => col.id === localPlayer.color) ?? PLAYER_COLORS[0];
  const fellowVondos = snapshot.players.filter((p) => p.role === 'vondo');
  const parabasiCount = snapshot.players.filter(
    (p) => p.role === 'parabasi' && !isNeutralRole(p.specialRole),
  ).length;
  const neutralCount = snapshot.players.filter((p) => isNeutralRole(p.specialRole)).length;
  const progressPct = Math.min(100, (elapsedMs / TOTAL_DISPLAY_MS) * 100);
  const roleSteps = getRoleHowToPlay(isVondo, localPlayer.specialRole);

  const factionBg = !flipped
    ? 'radial-gradient(circle at center, rgba(30, 41, 59, 0.96) 0%, rgba(7, 10, 18, 0.99) 75%)'
    : isNeutral
      ? 'radial-gradient(circle at center, rgba(88, 28, 135, 0.95) 0%, rgba(7, 10, 18, 0.99) 74%)'
      : isVondo
        ? 'radial-gradient(circle at center, rgba(127, 29, 29, 0.95) 0%, rgba(7, 10, 18, 0.99) 74%)'
        : 'radial-gradient(circle at center, rgba(12, 74, 110, 0.95) 0%, rgba(7, 10, 18, 0.99) 74%)';

  const revealHeadline =
    localPlayer.specialRole === 'pagol'
      ? 'তুমি পাগলা বাবা!'
      : localPlayer.specialRole === 'chamcha'
        ? 'তুমি মহল্লা চামচা!'
        : localPlayer.specialRole === 'chandabaz'
          ? 'তুমি চাঁদাবাজ!'
          : localPlayer.specialRole === 'tiktok_star'
            ? 'তুমি টিকটক স্টার!'
            : isVondo
              ? 'তুমিই বাটপার!'
              : 'তুমি পাড়াবাসী!';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="পরিচয় প্রকাশ"
      className="fixed inset-0 z-30 flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto overflow-x-hidden"
      style={{ background: factionBg }}
    >
      {/* Among Us Style Angled Spotlight Beams */}
      {flipped && (
        <div aria-hidden="true" className="fixed inset-0 pointer-events-none overflow-hidden">
          <div
            className="animate-amg-spotlight absolute -top-24 left-1/4 w-72 h-[140%] blur-2xl opacity-65"
            style={{
              background: isNeutral
                ? 'linear-gradient(180deg, rgba(192,132,252,0.35), transparent 75%)'
                : isVondo
                  ? 'linear-gradient(180deg, rgba(244,63,94,0.35), transparent 75%)'
                  : 'linear-gradient(180deg, rgba(56,189,248,0.32), transparent 75%)',
            }}
          />
          <div
            className="animate-amg-spotlight absolute -top-24 right-1/4 w-56 h-[135%] blur-2xl opacity-50"
            style={{
              background: 'linear-gradient(180deg, rgba(251,191,36,0.22), transparent 75%)',
            }}
          />
        </div>
      )}

      <div className="relative z-10 max-w-2xl w-full max-h-[95dvh] overflow-y-auto rounded-2xl border border-white/15 bg-slate-950/80 shadow-2xl p-3.5 sm:p-6 space-y-3.5 sm:space-y-4">
        {!flipped ? (
          /* STAGE 1: Among Us SHHHHH! + Super Sus Role Card Shuffle Roulette */
          <div className="py-4 sm:py-8 text-center space-y-4">
            <div className="animate-amg-shh font-display text-3xl sm:text-5xl font-black text-amber-300 drop-shadow-[0_4px_20px_rgba(251,191,36,0.4)]">
              চুপ!!
            </div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-400/15 border border-amber-400/40 text-[11px] font-mono-tabular tracking-[0.14em] text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              মহল্লার গোপন ফাইল বণ্টন হচ্ছে...
            </span>

            {/* Fanned Shuffle Cards Row */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 pt-1">
              {[-2, -1, 0, 1, 2].map((offset) => {
                const idx =
                  (rouletteIndex + offset + ROLE_ROULETTE_DECK.length * 4) %
                  ROLE_ROULETTE_DECK.length;
                const card = ROLE_ROULETTE_DECK[idx];
                const isCenter = offset === 0;
                return (
                  <div
                    key={`${offset}-${card.id}`}
                    className={`rounded-2xl border transition-all duration-75 flex flex-col items-center justify-center px-2.5 py-3 sm:px-4 sm:py-5 ${
                      isCenter
                        ? 'w-32 sm:w-44 h-40 sm:h-52 scale-105 bg-slate-900 shadow-2xl'
                        : Math.abs(offset) === 1
                          ? 'w-20 sm:w-28 h-28 sm:h-36 opacity-60 bg-slate-900/75 hidden xs:flex sm:flex'
                          : 'w-16 sm:w-22 h-24 sm:h-32 opacity-30 bg-slate-900/50 hidden sm:flex'
                    }`}
                    style={{
                      borderColor: isCenter ? card.accent : 'rgba(255,255,255,0.12)',
                      boxShadow: isCenter ? `0 0 28px ${card.accent}44` : undefined,
                    }}
                  >
                    <span className="text-2xl sm:text-3xl font-display font-black text-white/25 mb-1">
                      ?
                    </span>
                    <span
                      className="font-display font-extrabold text-xs sm:text-base tracking-wide text-center leading-tight"
                      style={{ color: card.accent }}
                    >
                      {card.label}
                    </span>
                    <span className="text-[10px] sm:text-xs text-slate-300 mt-0.5">{card.bangla}</span>
                  </div>
                );
              })}
            </div>

            <p className="text-xs sm:text-sm text-slate-300 font-semibold">
              <span className="text-amber-300 font-bold">{localPlayer.name}</span>-এর গোপন চরিত্র লক করা হচ্ছে...
            </p>
          </div>
        ) : (
          /* STAGE 2: Among Us Spotlight Reveal + Faction Banner + Imposter Gang + Role & Rules Briefing */
          <>
            <div className="animate-amg-slam text-center space-y-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-400/15 border border-amber-400/40 text-xs font-mono-tabular tracking-[0.16em] text-amber-300">
                <Volume2 className="w-3.5 h-3.5" />
                নিশ্চুপ! · গোপন পরিচয়
              </div>

              {/* Wide Among Us Style Horizontal Faction Banner */}
              <div
                className={`rounded-2xl border px-4 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 shadow-xl ${
                  isNeutral
                    ? 'bg-gradient-to-r from-purple-950/90 via-slate-900/90 to-amber-950/75 border-purple-400/45'
                    : isVondo
                      ? 'bg-gradient-to-r from-rose-950/90 via-slate-900/90 to-red-950/85 border-rose-500/45'
                      : 'bg-gradient-to-r from-sky-950/90 via-slate-900/90 to-cyan-950/85 border-sky-400/45'
                }`}
              >
                <ChibiRolePortrait
                  colorHex={colorSpec.hex}
                  visorTint={colorSpec.visorTint}
                  isVondo={isVondo}
                  isPagol={isNeutral}
                  specialRole={localPlayer.specialRole}
                />

                <div className="text-center sm:text-left space-y-1">
                  <p className="text-[11px] font-bold tracking-wider text-slate-300">
                    {isNeutral
                      ? 'নিরপেক্ষ বিশৃঙ্খল চরিত্র'
                      : isVondo
                        ? 'গোপন বাটপার চক্র'
                        : 'মহল্লার পাড়াবাসী দল'}
                  </p>
                  <h2
                    className={`font-display text-3xl sm:text-4xl font-black leading-none tracking-tight ${
                      isNeutral ? 'text-purple-300' : isVondo ? 'text-rose-400' : 'text-sky-300'
                    }`}
                  >
                    {revealHeadline}
                  </h2>

                  {localPlayer.specialRole !== 'none' ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950/80 border border-white/15 mt-1">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: specialMeta.accentHex }} />
                      <span className="text-xs sm:text-sm font-bold" style={{ color: specialMeta.accentHex }}>
                        {specialMeta.banglaTitle}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm font-semibold text-amber-300/95">
                      {isVondo
                        ? 'আজকে কাকে ফাঁদে ফেলবি রে বাটপার?! সাবধান, পুকুর কিন্তু প্রস্তুত!'
                        : ROLE_COMEDY_TAGLINES[localPlayer.specialRole]}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Imposter Gang Reveal (ALL Batpars see all fellow Batpar teammates!) */}
            {isVondo && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/35 px-3 py-2.5 text-center space-y-2">
                <div className="text-[11px] font-bold tracking-wider text-rose-200 flex items-center justify-center gap-1.5">
                  <Skull className="w-3.5 h-3.5 text-rose-400" />
                  {fellowVondos.length > 1
                    ? `তোমার বাটপার গ্যাং (${fellowVondos.length} জন বাটপার — একসাথে কাজ করো!)`
                    : 'তুমি একাই আজ মহল্লার আসল বাটপার!'}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {fellowVondos.map((p) => {
                    const c = PLAYER_COLORS.find((col) => col.id === p.color) ?? PLAYER_COLORS[0];
                    const pSpecial = SPECIAL_ROLES[p.specialRole];
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
                          p.id === localPlayer.id
                            ? 'bg-rose-900/60 border-rose-300/60'
                            : 'bg-slate-900/90 border-white/15'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/30"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span className="text-xs font-bold text-white">
                          {p.name}
                          {p.id === localPlayer.id ? ' (তুমি)' : ''}
                        </span>
                        {p.specialRole !== 'none' && (
                          <span className="text-[10px] font-bold text-rose-200">
                            · {pSpecial.banglaTitle}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Two-Column Briefing: Role er Kaj + Match er Niom (Rules) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-left">
              {/* Role How-To-Play Card */}
              <div className="rounded-xl border border-white/12 bg-slate-900/85 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-display font-bold text-amber-300">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>তোমার চরিত্রের কাজ ও নিয়ন্ত্রণ</span>
                </div>
                <ul className="space-y-1 text-[11px] sm:text-xs text-slate-200 leading-snug">
                  {roleSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-300 font-bold shrink-0">•</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Game Rules Briefing Card */}
              <div className="rounded-xl border border-white/12 bg-slate-900/85 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-display font-bold text-sky-300">
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>ম্যাচের নিয়মকানুন</span>
                </div>
                <ul className="space-y-1 text-[11px] sm:text-xs text-slate-200 leading-snug">
                  <li className="flex items-start gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-rose-300">{fellowVondos.length} বাটপার</strong> বনাম{' '}
                      <strong className="text-sky-300">{parabasiCount} পাড়াবাসী</strong>
                      {neutralCount > 0 ? ` + ${neutralCount} নিরপেক্ষ` : ''}।
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold shrink-0">✓</span>
                    <span>
                      <strong>পাড়াবাসীর জয়:</strong> সব কাজ ({snapshot.settings.tasksPerPlayer}/জন) শেষ অথবা সব বাটপারকে পুকুরে ফেলো!
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <EyeOff className="w-3.5 h-3.5 text-sky-300 shrink-0 mt-0.5" />
                    <span>
                      <strong>ভূত নিয়ম:</strong> মারা গেলে অদৃশ্য ভূত হবে — জীবিত কেউ দেখবে না, ভূত হয়েও কাজ শেষ করা যাবে!
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5 font-mono-tabular text-[10px] sm:text-[11px] text-amber-200/90 pt-0.5">
                    <span>
                      কিল বিরতি: {snapshot.settings.killCooldownSec}সে. · সালিশ: {snapshot.settings.meetingTimeSec}সে. · পরিচয় প্রকাশ: {snapshot.settings.confirmEjects ? 'চালু' : 'বন্ধ'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </>
        )}

        {/* Bottom Countdown Bar + Enter Moholla Action */}
        <div className="space-y-2 pt-1">
          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-100"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400">
            <span>
              {!flipped
                ? 'মহল্লার চরিত্রগুলো মেলানো হচ্ছে...'
                : onContinue
                  ? 'চরিত্র কার্ড ও নিয়ম প্রস্তুত!'
                  : `ম্যাচ শুরু হচ্ছে ${Math.max(1, Math.ceil((TOTAL_DISPLAY_MS - elapsedMs) / 1000))} সেকেন্ডে...`}
            </span>
            {onContinue && flipped && (
              <button
                type="button"
                onClick={onContinue}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-xs sm:text-sm shadow-lg"
              >
                মহল্লায় ঢোকো
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const EJECT_LAST_WORDS_INNOCENT = [
  '"ভাই আমি তো শুধু চা আর সিঙাড়া খাইতেসিলাম রে!!"',
  '"আমার ১টা কাজ বাকি ছিল মাগো!"',
  '"সাঁতার জানি না ভাই, টিউব দাও কেউ!!"',
];

const EJECT_LAST_WORDS_BATPAR = [
  '"ধরে ফেলেছ ভাই... কিন্তু ডেসকো ফিউজ বক্সে পানি আমিই দিয়েছিলাম হিহি!"',
  '"ওদের বইলো না আমি ড্রেন দিয়ে পালাইতাম!!"',
  '"পুকুরের মাছও আমার বন্ধু রে!"',
];

const EJECT_LAST_WORDS_PAGOL = [
  '"হাহাহাহাহা! সবাই ফাঁদে পা দিছে!! আমিই পাগলা বাবা!!"',
  '"তোমাদের সালিশকে বোকা বানায় গেলাম রে!!"',
];

export function EjectionModal({
  ejection,
  onContinue,
}: {
  ejection: EjectionInfo;
  onContinue?: () => void;
}) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const splashPlayedRef = useRef(false);

  const TOTAL_MS = ejection.reason === 'voted' ? 7500 : 5000;

  useEffect(() => {
    splashPlayedRef.current = false;
    setElapsedMs(0);
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      setElapsedMs(performance.now() - startedAt);
    }, 50);
    return () => window.clearInterval(timer);
  }, [ejection.ejectedId, ejection.reason]);

  useEffect(() => {
    if (ejection.reason === 'voted' && ejection.ejectedName && elapsedMs >= 2250 && !splashPlayedRef.current) {
      splashPlayedRef.current = true;
      soundEngine.playEject(Boolean(ejection.confirmEjects && ejection.wasVondo));
    }
  }, [ejection.reason, ejection.ejectedName, ejection.confirmEjects, ejection.wasVondo, elapsedMs]);

  const c = ejection.ejectedColor
    ? PLAYER_COLORS.find((col) => col.id === ejection.ejectedColor) ?? PLAYER_COLORS[0]
    : null;

  if (ejection.reason === 'voted' && ejection.ejectedName) {
    const taunts = getChubaniTaunts(
      ejection.ejectedName,
      ejection.wasVondo,
      ejection.wasSpecialRole === 'pagol',
    );
    const nameSeed = ejection.ejectedName.length;
    const lastWords =
      ejection.wasSpecialRole === 'pagol'
        ? EJECT_LAST_WORDS_PAGOL[nameSeed % EJECT_LAST_WORDS_PAGOL.length]
        : ejection.wasVondo
          ? EJECT_LAST_WORDS_BATPAR[nameSeed % EJECT_LAST_WORDS_BATPAR.length]
          : EJECT_LAST_WORDS_INNOCENT[nameSeed % EJECT_LAST_WORDS_INNOCENT.length];

    const isAct1Windup = elapsedMs < 1400;
    const isAct2FlightAndSplash = elapsedMs >= 1400 && elapsedMs < 2900;
    const isBubbling = elapsedMs >= 2900 && elapsedMs < 3800;
    const showVerdict = elapsedMs >= 3800;
    const progressPct = Math.min(100, (elapsedMs / TOTAL_MS) * 100);

    const countdownLabel =
      elapsedMs < 460
        ? '১... ধরো!'
        : elapsedMs < 920
          ? '২... তোলো ওরে!'
          : elapsedMs < 1400
            ? '৩... চুবানির সময়!!'
            : elapsedMs < 2250
              ? 'উড়ে যা পুকুরে!!'
              : 'ঝপাং!! পুকুরে চুবানি!';

    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-3 sm:p-6"
      >
        {/* Top Live Crowd Comedy Banner (center stays completely open for live 3D Pukur throw + pond splash!) */}
        <div className="max-w-2xl w-full mx-auto text-center space-y-2 pt-1 sm:pt-2">
          <div className="inline-flex flex-wrap items-center justify-center gap-2">
            <span
              className={`px-3.5 py-1.5 rounded-xl font-display font-extrabold text-xs sm:text-base shadow-xl ${
                elapsedMs >= 2250
                  ? 'bg-sky-400 text-slate-950 scale-105'
                  : 'bg-amber-400 text-slate-950'
              } transition-transform`}
            >
              {countdownLabel}
            </span>
            {!isAct1Windup && (
              <span className="px-2.5 py-1 rounded-xl bg-slate-900/92 border border-sky-400/50 text-sky-200 font-bold text-xs shadow-lg">
                {taunts[0]}
              </span>
            )}
            {showVerdict && (
              <span className="px-2.5 py-1 rounded-xl bg-slate-900/92 border border-rose-400/50 text-rose-200 font-bold text-xs shadow-lg">
                {taunts[2]}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Progressive Pukur Verdict & Post-Splash Reveal Card */}
        <div
          className="max-w-xl w-full mx-auto rounded-2xl px-4 py-3.5 sm:px-6 sm:py-4 border border-sky-400/45 shadow-2xl text-center space-y-2 pointer-events-auto"
          style={{ backgroundColor: 'rgba(9, 15, 28, 0.92)' }}
        >
          <div className="flex items-center justify-center gap-2.5">
            <span
              className="w-4 h-4 rounded-full border-2 border-amber-300 shrink-0"
              style={{ backgroundColor: c?.hex ?? '#e11d48' }}
            />
            <h2 className="font-display text-lg sm:text-2xl font-extrabold text-white">
              {isAct1Windup
                ? `${ejection.ejectedName}-কে পুকুর ঘাটে নিয়ে গেছে মহল্লাবাসী!`
                : `${ejection.ejectedName}-কে পুকুরে চুবানি দেওয়া হলো!`}
            </h2>
          </div>

          {(isAct1Windup || isAct2FlightAndSplash) && (
            <p className="text-xs sm:text-sm italic font-semibold text-amber-200 bg-slate-900/90 border border-amber-400/30 rounded-xl px-3 py-1.5">
              {ejection.ejectedName}: {lastWords}
            </p>
          )}

          {isBubbling && (
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-sky-300 animate-pulse py-1">
              <Waves className="w-4 h-4" />
              <span>পুকুরের পানি থেকে কী খবর উঠল...?</span>
            </div>
          )}

          {showVerdict && (
            <div className="space-y-1.5 pt-0.5">
              {ejection.confirmEjects ? (
                <>
                  <div
                    className={`inline-block px-3.5 py-1 rounded-xl border font-display font-extrabold text-xs sm:text-sm tracking-wide ${
                      ejection.wasSpecialRole === 'pagol'
                        ? 'bg-purple-500/20 border-purple-400 text-purple-200'
                        : ejection.wasVondo
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                          : 'bg-rose-500/20 border-rose-400 text-rose-200'
                    }`}
                  >
                    {ejection.wasSpecialRole === 'pagol'
                      ? 'পাগলা বাবা ফাঁদ পেতে জিতেছে!'
                      : ejection.wasVondo
                        ? 'আসল বাটপার ধরে ফেলেছি!'
                        : 'হায় রে! নির্দোষ পাড়াবাসী ছিল!'}
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-200">
                    {ejection.wasSpecialRole === 'pagol'
                      ? `${ejection.ejectedName} ছিল পাগলা বাবা — সবাই বোকা হয়ে গেছে!`
                      : ejection.wasVondo
                        ? `${ejection.ejectedName} আসলেই বাটপার${
                            ejection.wasSpecialRole !== 'none'
                              ? ` (${SPECIAL_ROLES[ejection.wasSpecialRole].banglaTitle})`
                              : ''
                          } ছিল! ${taunts[1]}`
                        : `${ejection.ejectedName} নির্দোষ পাড়াবাসী ছিল (${
                            ejection.wasSpecialRole !== 'none'
                              ? SPECIAL_ROLES[ejection.wasSpecialRole].banglaTitle
                              : 'প্রতিবেশী'
                          })... মহল্লা বড় ভুল করল!`}
                  </p>
                  <p className="text-xs font-mono-tabular text-amber-300 font-bold">
                    মহল্লায় বাটপার বাকি আছে: {ejection.remainingVondos} জন
                  </p>
                </>
              ) : (
                <p className="text-xs sm:text-sm font-semibold text-slate-300">
                  পরিচয় প্রকাশ বন্ধ আছে — {ejection.ejectedName} বাটপার ছিল কিনা তা গোপন থাকল!
                </p>
              )}
            </div>
          )}

          {/* Round transition progress bar + Solo Skip */}
          <div className="pt-1 space-y-1.5">
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-sky-400 transition-all duration-100"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400">
              <span>
                {showVerdict ? 'পরের রাউন্ড শুরু হচ্ছে...' : 'পুকুর চুবানি চলছে...'}
              </span>
              {onContinue && showVerdict && (
                <button
                  type="button"
                  onClick={onContinue}
                  className="px-3.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-xs"
                >
                  চালিয়ে যাও
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progressPct = Math.min(100, (elapsedMs / TOTAL_MS) * 100);
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-30 flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(6, 10, 18, 0.92)' }}
    >
      <div className="max-w-lg w-full rounded-2xl border border-white/15 bg-slate-950/90 p-5 sm:p-7 text-center space-y-4 shadow-2xl">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-400/40 flex items-center justify-center animate-bounce">
          <Waves className="w-7 h-7 text-sky-300" />
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
          {ejection.reason === 'tie'
            ? 'ভোট সমান! পুকুরের মাছ আজ উপোস থাকল!'
            : 'সবাই স্কিপ মারল — বাটপার চা খাচ্ছে!'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-300">
          {ejection.reason === 'tie'
            ? 'দুইজনের ভোট সমান! সালিশে ঝগড়া করেই সময় শেষ, কেউ পুকুরে গেল না!'
            : 'কেউ কাউকে পুকুরে ফেলল না — আসল বাটপার কাপে চা আর সিঙাড়া নিয়ে হাসছে!'}
        </p>
        {ejection.confirmEjects && (
          <p className="text-xs font-mono-tabular text-amber-300 font-bold">
            মহল্লায় বাটপার বাকি আছে: {ejection.remainingVondos} জন
          </p>
        )}
        <div className="space-y-2 pt-1">
          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-100"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {onContinue && elapsedMs >= 1600 && (
            <button
              type="button"
              onClick={onContinue}
              className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-xs"
            >
              চালিয়ে যাও
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PauseModal({
  onResume,
  onRestart,
  onTitle,
  onOpenMemePack,
}: {
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
  onOpenMemePack?: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="খেলা বিরতি"
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(6, 10, 18, 0.8)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 border border-white/15 shadow-2xl space-y-4 text-center"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.98)' }}
      >
        <h2 className="font-display text-2xl font-bold text-white">গেম পজ</h2>
        <p className="text-xs text-slate-400">মহল্লায় ফেরার আগে একটু চা খেয়ে নাও।</p>
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-sm flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            খেলা চালিয়ে যাও
          </button>
          {onOpenMemePack && (
            <button
              type="button"
              onClick={onOpenMemePack}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-400/35 text-amber-200 font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Music2 className="w-4 h-4 text-amber-300" />
              মিম সাউন্ড প্যাক
            </button>
          )}
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            নতুন করে ম্যাচ শুরু করো
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            মূল পর্দায় ফেরো
          </button>
        </div>
      </div>
    </div>
  );
}

export function OutcomeModal({
  snapshot,
  localPlayerId,
  outcome,
  isMultiplayer,
  onPlayAgain,
  onTitle,
}: {
  snapshot: RoomSnapshot;
  localPlayerId: string;
  outcome: MatchOutcome;
  isMultiplayer: boolean;
  onPlayAgain: () => void;
  onTitle: () => void;
}) {
  const localPlayer = snapshot.players.find((p) => p.id === localPlayerId);
  const isNeutralWin =
    outcome.winner === 'pagol' || outcome.winner === 'chandabaz' || outcome.winner === 'tiktok_star';
  const won =
    isNeutralWin
      ? localPlayer?.specialRole === outcome.winner
      : Boolean(
          (localPlayer?.role === outcome.winner && !isNeutralRole(localPlayer.specialRole)) ||
            outcome.coWinnerIds?.includes(localPlayerId),
        );
  const vondos = snapshot.players.filter((p) => p.role === 'vondo');

  const career = loadCareerStats();

  const reasonText: Record<MatchOutcome['reason'], string> = {
    tasks_completed: 'মহল্লার সব কাজ শেষ — আজ সবার জন্য বিরিয়ানি পার্টি!',
    batpars_out: 'সব বাটপার ধরা খেয়ে পুকুরে চুবানি খেয়েছে! বাটপারি খতম!',
    batpars_outnumber: 'বাটপাররা পুরো মহল্লা দখল করে নিয়েছে — চায়ের দোকানও বন্ধ!',
    critical_sabotage_timeout: 'গ্যাস ফেটে পুরো পাড়া উড়ে গেছে! চুলা আর ট্যাংকি দুই-ই শেষ!',
    pagol_ejected: `${outcome.winnerPlayerName ?? 'পাগলা বাবা'} সবাইকে বোকা বানিয়ে কাপ নিয়ে গেল!`,
    chandabaz_extorted: `${outcome.winnerPlayerName ?? 'চাঁদাবাজ'} জীবিত সব প্রতিবেশীর কাছ থেকে চাঁদা তুলে কাপ নিয়ে গেল!`,
    tiktok_viral: `${outcome.winnerPlayerName ?? 'টিকটক স্টার'} ৩টি ভাইরাল রিল ছেড়ে কাপ জিতে নিল!`,
  };

  const winnerBannerLabel =
    outcome.winner === 'pagol'
      ? 'পাগলা বাবার চালবাজি জয়'
      : outcome.winner === 'chandabaz'
        ? 'চাঁদাবাজের জয়'
        : outcome.winner === 'tiktok_star'
          ? 'টিকটক স্টারের ভাইরাল বিজয়'
          : outcome.winner === 'parabasi'
            ? 'পাড়াবাসীর বিজয়'
            : 'বাটপারদের বিজয়';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ম্যাচের ফলাফল"
      className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: 'rgba(6, 10, 18, 0.88)' }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl p-5 sm:p-7 border border-amber-400/30 shadow-2xl text-center space-y-4 max-h-[92vh] overflow-y-auto"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.98)' }}
      >
        <div
          className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
            won ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
          }`}
        >
          {won ? <Trophy className="w-8 h-8" /> : <Skull className="w-8 h-8" />}
        </div>

        <div>
          <span className="text-xs font-semibold tracking-wider text-amber-300">
            {winnerBannerLabel}
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white mt-1">
            {won ? 'দারুণ জিতেছ! খেলা জমে ক্ষীর!' : 'ধরা খেয়েছ! খেলা শেষ!'}
          </h2>
          <p className="text-sm text-slate-300 mt-1">{reasonText[outcome.reason]}</p>
          {outcome.coWinnerNames && outcome.coWinnerNames.length > 0 && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-950/60 border border-purple-400/40 text-xs font-bold text-purple-200">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              চামচা সহ-বিজয়: {outcome.coWinnerNames.join(', ')}
            </p>
          )}
        </div>

        {/* 3 Tabular Match Stats */}
        <div className="grid grid-cols-3 gap-2.5 text-left">
          <div className="rounded-xl p-3 bg-slate-900 border border-slate-800">
            <span className="block text-[11px] text-slate-400">পাড়ার কাজ</span>
            <span className="font-mono-tabular text-lg font-bold text-emerald-400">
              {snapshot.completedTasks}/{snapshot.totalTasks}
            </span>
          </div>
          <div className="rounded-xl p-3 bg-slate-900 border border-slate-800">
            <span className="block text-[11px] text-slate-400">জীবিত</span>
            <span className="font-mono-tabular text-lg font-bold text-white">
              {snapshot.players.filter((p) => p.alive).length}/{snapshot.players.length}
            </span>
          </div>
          <div className="rounded-xl p-3 bg-slate-900 border border-slate-800">
            <span className="block text-[11px] text-slate-400">আসল বাটপার</span>
            <span className="text-sm font-bold text-rose-400 truncate block">
              {vondos.map((v) => v.name).join(', ')}
            </span>
          </div>
        </div>

        {/* Full Post-Match Player Role Reveal Roster */}
        <div className="rounded-xl p-3 bg-slate-900/90 border border-slate-800 text-left">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-2">
            <span>সব খেলোয়াড়ের পরিচয় ({snapshot.players.length} জন)</span>
            <span className="font-mono-tabular text-amber-300">
              ক্যারিয়ার: {career.wins} জয় / {career.matchesPlayed} ম্যাচ · {career.tasksCompleted} কাজ
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
            {snapshot.players.map((p) => {
              const col = PLAYER_COLORS.find((c) => c.id === p.color) ?? PLAYER_COLORS[0];
              const meta = SPECIAL_ROLES[p.specialRole];
              const roleLabel =
                p.specialRole !== 'none'
                  ? meta.banglaTitle
                  : p.role === 'vondo'
                    ? 'বাটপার'
                    : 'পাড়াবাসী';
              const roleColor =
                p.role === 'vondo'
                  ? '#fb7185'
                  : p.specialRole === 'pagol'
                    ? '#c084fc'
                    : p.specialRole !== 'none'
                      ? meta.accentHex
                      : '#7dd3fc';
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border border-white/25"
                      style={{ backgroundColor: col.hex }}
                    />
                    <span className="font-semibold text-white truncate">
                      {p.name}
                      {p.id === localPlayerId ? ' (তুমি)' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold" style={{ color: roleColor }}>
                      {roleLabel}
                    </span>
                    <span className={`text-[10px] ${p.alive ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {p.alive ? 'জীবিত' : 'বাদ'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="flex-1 py-3.5 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-sm flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            {isMultiplayer ? 'লবিতে ফিরে যাও' : 'আবার খেলো'}
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            মূল পর্দা
          </button>
        </div>
      </div>
    </div>
  );
}
