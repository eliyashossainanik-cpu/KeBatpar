import { useEffect, useState } from 'react';
import {
  PLAYER_COLORS,
  SPECIAL_ROLES,
  type PlayerColorId,
  type PublicRoomSummary,
  type RoomSettings,
  type SpecialRole,
} from '../shared/types';
import { getLoadedCustomCount, subscribeMemePack } from '../audio/memePackStore';
import { soundEngine } from '../audio/soundEngine';
import { loadCareerStats } from '../game/statsStore';
import { BATPAR_SPECIAL_ROLES, isNeutralRole } from '../shared/gameRules';
import {
  Users,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Music2,
  SlidersHorizontal,
  BookOpen,
  Trophy,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Shuffle,
  Pencil,
  ChevronDown,
  Shield,
  Skull,
} from 'lucide-react';
import { pickAutoMultiplayerIdentity } from '../shared/banglaComedy';
import {
  isFullscreenActive,
  subscribeFullscreenChange,
  toggleFullscreenMode,
} from '../utils/mobileFullscreen';

export interface TitleOverlayProps {
  playerName: string;
  playerColor: PlayerColorId;
  publicRooms: PublicRoomSummary[];
  errorMsg: string | null;
  connecting?: boolean;
  soloPlayerCount: number;
  soloSettings: RoomSettings;
  onChangeName: (name: string) => void;
  onChangeColor: (color: PlayerColorId) => void;
  onChangeSoloPlayerCount: (count: number) => void;
  onUpdateSoloSettings: (settings: Partial<RoomSettings>) => void;
  onStartSolo: (forceRole?: 'parabasi' | 'vondo', forceSpecialRole?: SpecialRole) => void;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onRefreshRooms: () => void;
  onOpenMemePack?: () => void;
  onOpenGuide: () => void;
  initialJoinCode?: string | null;
}

const SOLO_SPECIAL_OPTIONS: Array<{ value: SpecialRole | 'random'; label: string }> = [
  { value: 'random', label: 'র‍্যান্ডম স্পেশাল রোল' },
  { value: 'goyenda', label: 'সিআইডি মফিজ (গোয়েন্দা)' },
  { value: 'kobiraj', label: 'তাবিজ বাবা (কবিরাজ)' },
  { value: 'mistri', label: 'কারেন্ট বাবু (মিস্ত্রি)' },
  { value: 'daroga', label: 'পাড়া দারোগা (পুলিশ)' },
  { value: 'neta', label: 'মহল্লা নেতা (২ গুণ ভোট)' },
  { value: 'daktar', label: 'পাড়া ডাক্তার (চিকিৎসক)' },
  { value: 'ghotok_khala', label: 'ঘটক খালা (জুটি বাঁধে)' },
  { value: 'master_moshai', label: 'মাস্টার মশাই (শিক্ষক)' },
  { value: 'cctv_kaku', label: 'সিসিটিভি কাকু (রিমোট ক্যাম)' },
  { value: 'hatur_daktar', label: 'হাতুড়ে ডাক্তার (ঢাল)' },
  { value: 'bohurupi', label: 'বহুরূপী বাটপার (ছদ্মবেশী)' },
  { value: 'jharudar', label: 'সাফাই বাটপার (লাশ গায়েব)' },
  { value: 'supari_killer', label: 'সুপারি কিলার (খুনি)' },
  { value: 'dalal', label: 'দালাল বাটপার (জ্যামার)' },
  { value: 'pagol', label: 'পাগলা বাবা (উল্টা জয়)' },
  { value: 'chamcha', label: 'চামচা (সহ-বিজয়ী)' },
  { value: 'chandabaz', label: 'চাঁদাবাজ (চাঁদাবাজি)' },
  { value: 'tiktok_star', label: 'টিকটক স্টার (ভাইরাল রিল)' },
];

const AMBIENT_EMBERS = [
  { left: '9%', bottom: '18%', size: 6, color: '#fbbf24', dur: '7.4s', delay: '0s' },
  { left: '22%', bottom: '28%', size: 4, color: '#fde68a', dur: '6.2s', delay: '1.6s' },
  { left: '34%', bottom: '14%', size: 5, color: '#38bdf8', dur: '8.1s', delay: '0.8s' },
  { left: '47%', bottom: '22%', size: 4, color: '#fb923c', dur: '6.9s', delay: '2.7s' },
  { left: '16%', bottom: '52%', size: 5, color: '#fbbf24', dur: '7.8s', delay: '3.4s' },
  { left: '41%', bottom: '62%', size: 4, color: '#7dd3fc', dur: '8.6s', delay: '1.1s' },
];

export function TitleOverlay({
  playerName,
  playerColor,
  publicRooms,
  errorMsg,
  connecting = false,
  soloPlayerCount,
  soloSettings,
  onChangeName,
  onChangeColor,
  onChangeSoloPlayerCount,
  onUpdateSoloSettings,
  onStartSolo,
  onCreateRoom,
  onJoinRoom,
  onRefreshRooms,
  onOpenMemePack,
  onOpenGuide,
  initialJoinCode,
}: TitleOverlayProps) {
  const [joinCode, setJoinCode] = useState(() => (initialJoinCode ? initialJoinCode.toUpperCase() : ''));
  const [modeTab, setModeTab] = useState<'solo' | 'multi'>(() => (initialJoinCode ? 'multi' : 'solo'));
  const [soloSpecial, setSoloSpecial] = useState<SpecialRole | 'random'>('random');
  const [showSoloSettings, setShowSoloSettings] = useState(false);
  const [editingMultiIdentity, setEditingMultiIdentity] = useState(false);
  const [multiAutoApplied, setMultiAutoApplied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(() => isFullscreenActive());
  const [bgmEnabled, setBgmEnabled] = useState(() => soundEngine.isBgmEnabled());
  const [, setPackVer] = useState(0);

  const applyAutoIdentity = () => {
    const auto = pickAutoMultiplayerIdentity([playerName], [playerColor]);
    onChangeName(auto.name);
    onChangeColor(auto.color);
    setMultiAutoApplied(true);
  };

  useEffect(() => {
    if (initialJoinCode) {
      setJoinCode(initialJoinCode.toUpperCase());
      setModeTab('multi');
      if (!multiAutoApplied && playerName.trim() === 'Lal Mia') {
        const auto = pickAutoMultiplayerIdentity([playerName], [playerColor]);
        onChangeName(auto.name);
        onChangeColor(auto.color);
        setMultiAutoApplied(true);
      }
      onRefreshRooms();
    }
  }, [initialJoinCode, multiAutoApplied, onChangeColor, onChangeName, onRefreshRooms, playerColor, playerName]);

  useEffect(() => subscribeMemePack(() => setPackVer((v) => v + 1)), []);
  useEffect(() => subscribeFullscreenChange(setIsFullscreen), []);
  useEffect(
    () => soundEngine.subscribeBgmState(() => setBgmEnabled(soundEngine.isBgmEnabled())),
    [],
  );

  const customMemeCount = getLoadedCustomCount();
  const career = loadCareerStats();
  const selectedSpec = PLAYER_COLORS.find((c) => c.id === playerColor) ?? PLAYER_COLORS[0];

  const factionLabel =
    soloSpecial === 'random'
      ? null
      : BATPAR_SPECIAL_ROLES.includes(soloSpecial)
        ? 'বাটপার দল ·'
        : isNeutralRole(soloSpecial)
          ? 'নিরপেক্ষ ·'
          : 'পাড়াবাসী ·';

  const factionTextColor =
    soloSpecial !== 'random' && BATPAR_SPECIAL_ROLES.includes(soloSpecial)
      ? 'text-rose-300'
      : soloSpecial !== 'random' && isNeutralRole(soloSpecial)
        ? 'text-amber-300'
        : 'text-emerald-300';

  return (
    <div
      className="fixed inset-0 z-20 flex flex-col justify-between pointer-events-none overflow-y-auto overflow-x-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {/* Animated Twilight Atmospheric Backdrop (Left Launch Stage + Open Right 3D Flyover) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 w-full max-w-4xl"
          style={{
            background:
              'linear-gradient(95deg, rgba(5,9,18,0.95) 0%, rgba(7,12,24,0.84) 44%, rgba(8,14,28,0.34) 76%, rgba(8,14,28,0) 100%)',
          }}
        />

        {/* Diagonal Dusk Spotlight Sweep (GPU transform/opacity only) */}
        <div
          className="kb-beam-sweep absolute -top-28 -left-24 w-[420px] sm:w-[540px] h-[140%] pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 32% 28%, rgba(251,191,36,0.16) 0%, rgba(56,189,248,0.08) 42%, rgba(0,0,0,0) 74%)',
          }}
        />

        {/* Subtle Top & Bottom Horizon Vignettes */}
        <div
          className="absolute inset-x-0 top-0 h-28"
          style={{
            background: 'linear-gradient(180deg, rgba(4,7,15,0.68) 0%, rgba(4,7,15,0) 100%)',
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-24"
          style={{
            background: 'linear-gradient(0deg, rgba(4,7,15,0.72) 0%, rgba(4,7,15,0) 100%)',
          }}
        />

        {/* Ambient Floating Dusk Embers */}
        {AMBIENT_EMBERS.map((ember, idx) => (
          <span
            key={idx}
            aria-hidden="true"
            className="kb-ember-drift hidden sm:block absolute rounded-full pointer-events-none"
            style={{
              left: ember.left,
              bottom: ember.bottom,
              width: `${ember.size}px`,
              height: `${ember.size}px`,
              background: `radial-gradient(circle, ${ember.color} 0%, rgba(251,191,36,0) 72%)`,
              ['--ember-dur' as string]: ember.dur,
              ['--ember-delay' as string]: ember.delay,
            }}
          />
        ))}

        {/* Tactical Camera Viewfinder Corner Brackets on Desktop Showcase */}
        <div className="hidden lg:block absolute top-20 right-8 w-8 h-8 border-t border-r border-amber-300/20" />
        <div className="hidden lg:block absolute bottom-10 right-8 w-8 h-8 border-b border-r border-sky-300/20" />
      </div>

      {/* Responsive Top Tactical Utility Rail (flow header on mobile, fixed top-right on desktop) */}
      <div className="relative md:fixed md:top-5 md:right-6 z-30 pointer-events-auto flex items-center justify-between md:justify-end gap-2 px-3.5 pt-2.5 pb-1 md:p-0 shrink-0">
        <div className="md:hidden text-[11px] font-bold tracking-wide text-amber-300 font-mono-tabular truncate">
          KE BATPAR 2.0 · v2.0
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
          <button
            type="button"
            onClick={() => {
              soundEngine.toggleBgm();
            }}
            aria-label={bgmEnabled ? 'মিউজিক বন্ধ করো' : 'মিউজিক চালু করো'}
            title="ব্যাকগ্রাউন্ড মিউজিক"
            className={`min-h-[40px] sm:min-h-[42px] px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
              bgmEnabled
                ? 'border-emerald-400/40 bg-[#09111d]/90 hover:bg-[#0d1828] text-emerald-200'
                : 'border-white/15 bg-[#090e1b]/90 hover:bg-[#11192c] text-slate-300'
            }`}
          >
            {bgmEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-300 shrink-0" />
            ) : (
              <VolumeX className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="hidden xs:inline sm:inline">{bgmEnabled ? 'মিউজিক চালু' : 'মিউজিক বন্ধ'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              void toggleFullscreenMode(true);
            }}
            aria-label={isFullscreen ? 'ফুলস্ক্রিন বন্ধ করো' : 'ফুলস্ক্রিন চালু করো'}
            className="min-h-[40px] sm:min-h-[42px] px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-amber-400/35 bg-[#090e1b]/90 hover:bg-[#121b30] text-amber-200 text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 shrink-0" /> : <Maximize2 className="w-4 h-4 shrink-0" />}
            <span>{isFullscreen ? 'ছোট স্ক্রিন' : 'ফুলস্ক্রিন'}</span>
          </button>
        </div>
      </div>

      {/* Main Left Launch Stage */}
      <main className="relative z-10 flex flex-col justify-start sm:justify-center [@media(max-height:540px)]:justify-start flex-1 w-full px-3.5 pt-2 pb-5 sm:py-6 [@media(max-height:540px)]:pt-1 [@media(max-height:540px)]:pb-3 sm:px-10 lg:px-14 [@media(max-height:540px)]:px-4 max-w-[560px] [@media(max-height:540px)]:max-w-xl pointer-events-auto">
        {/* Hero Brand Lockup with Dynamic Color-Reactive Character Pedestal */}
        <header className="mb-3 sm:mb-5 [@media(max-height:540px)]:mb-2 flex items-center gap-3 sm:gap-5">
          <div className="relative shrink-0 w-13 h-15 sm:w-[78px] sm:h-[90px] [@media(max-height:540px)]:w-11 [@media(max-height:540px)]:h-13 flex items-center justify-center">
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full opacity-55 transition-colors duration-300"
              style={{
                background: `radial-gradient(circle, ${selectedSpec.hex}55 0%, rgba(251,191,36,0.16) 45%, rgba(0,0,0,0) 74%)`,
              }}
            />
            <div
              aria-hidden="true"
              className="absolute bottom-0.5 inset-x-2 h-2.5 rounded-full bg-black/65"
            />
            <svg
              viewBox="0 0 72 96"
              className="kb-emblem-hover relative w-full h-full drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)]"
              role="img"
              aria-label="KE BATPAR 2.0 চরিত্র"
            >
              <path
                d="M36 15 L36 5 M36 8 Q25 2 23 9 Q29 12 36 8 M36 8 Q47 2 49 9 Q43 12 36 8"
                fill="#4ade80"
                stroke="#15803d"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <rect
                x="9"
                y="15"
                width="54"
                height="68"
                rx="26"
                fill={selectedSpec.hex}
                stroke="#fbbf24"
                strokeWidth="3.5"
              />
              <rect
                x="29"
                y="28"
                width="31"
                height="18"
                rx="9"
                fill="#bae6fd"
                stroke="#0f172a"
                strokeWidth="2.8"
              />
              <ellipse cx="50" cy="34" rx="4.2" ry="2" fill="#ffffff" />
              <ellipse cx="26" cy="52" rx="4.2" ry="2.4" fill="#fb7185" opacity="0.82" />
              <ellipse cx="54" cy="52" rx="4.2" ry="2.4" fill="#fb7185" opacity="0.82" />
              <rect
                x="3"
                y="34"
                width="11"
                height="31"
                rx="5"
                fill="#cbd5e1"
                stroke="#0f172a"
                strokeWidth="2.4"
              />
              <path
                d="M60 46 L69 46 L67 57 L62 57 Z"
                fill="#b45309"
                stroke="#fbbf24"
                strokeWidth="1.6"
              />
              <path
                d="M20 82 L20 92 M49 82 L49 92"
                stroke="#fbbf24"
                strokeWidth="7.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <h1
              className="text-[1.85rem] sm:text-[2.85rem] [@media(max-height:540px)]:text-2xl font-black tracking-tight leading-[0.98] text-slate-50 drop-shadow-[0_6px_18px_rgba(0,0,0,0.8)]"
              style={{ fontFamily: "'Bricolage Grotesque', 'Plus Jakarta Sans', sans-serif", textWrap: 'balance' }}
            >
              KE{' '}
              <span className="bg-gradient-to-b from-amber-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
                BATPAR 2.0
              </span>
            </h1>

            <div className="mt-1 sm:mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm font-bold text-amber-300">
              <span>কে বাটপার ২.০</span>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span className="text-slate-200 font-medium">৩ডি মহল্লা রহস্য ও কমেডি</span>
              {career.matchesPlayed > 0 && (
                <>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="inline-flex items-center gap-1 font-mono-tabular text-xs font-semibold text-emerald-300">
                    <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    {career.wins} জয় · {career.matchesPlayed} ম্যাচ
                  </span>
                </>
              )}
            </div>

            <p className="hidden sm:block [@media(max-height:540px)]:hidden mt-1.5 text-[13px] text-slate-300/90 leading-snug max-w-md">
              দুধ-চা খাও, লোডশেডিং সামলাও, আর পাড়া থেকে আসল বাটপারকে ধরে পুকুরে চুবানি দাও।
            </p>
          </div>
        </header>

        {/* Tactical Game-Lobby Launch Console (Left Side Panel) */}
        <section
          aria-label="খেলোয়াড়ের পরিচয় ও ম্যাচ শুরু"
          className="relative overflow-hidden rounded-2xl p-3.5 sm:p-5 [@media(max-height:540px)]:p-3 bg-[#090e1b]/92 border border-white/15 shadow-[0_28px_72px_-16px_rgba(0,0,0,0.92)]"
        >
          {/* Specular Top Hairline Highlight */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent"
          />

          {/* Side-Panel Version Readout */}
          <div className="flex items-center justify-between gap-2 pb-2 mb-3 [@media(max-height:540px)]:mb-2 border-b border-white/10 text-[11px]">
            <span className="font-display font-extrabold tracking-wide text-slate-200">
              মহল্লা কন্ট্রোল প্যানেল
            </span>
            <span className="font-mono-tabular font-bold text-amber-300">
              v2.0 · স্মুথ মোবাইল এডিশন
            </span>
          </div>

          {/* Tactical Mode Segmented Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-white/10 mb-3.5 [@media(max-height:540px)]:mb-2">
            <button
              type="button"
              onClick={() => {
                setModeTab('solo');
                setEditingMultiIdentity(false);
              }}
              className={`min-h-[40px] py-2 px-3 rounded-lg text-xs font-bold tracking-wide transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                modeTab === 'solo'
                  ? 'bg-gradient-to-b from-amber-300 to-amber-400 text-slate-950 shadow-[0_6px_16px_-4px_rgba(251,191,36,0.5)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              সলো ম্যাচ (বট)
            </button>
            <button
              type="button"
              onClick={() => {
                setModeTab('multi');
                if (!multiAutoApplied || playerName.trim() === 'Lal Mia') {
                  applyAutoIdentity();
                }
                onRefreshRooms();
              }}
              className={`min-h-[40px] py-2 px-3 rounded-lg text-xs font-bold tracking-wide transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                modeTab === 'multi'
                  ? 'bg-gradient-to-b from-amber-300 to-amber-400 text-slate-950 shadow-[0_6px_16px_-4px_rgba(251,191,36,0.5)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              অনলাইন রুম
            </button>
          </div>

          {/* Player Identity Block */}
          {modeTab === 'solo' || editingMultiIdentity ? (
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3.5 sm:gap-5 [@media(max-height:540px)]:gap-2.5 mb-4 [@media(max-height:540px)]:mb-2.5 pb-4 [@media(max-height:540px)]:pb-2.5 border-b border-white/10">
              <div>
                <div className="flex items-center justify-between mb-1.5 [@media(max-height:540px)]:mb-1">
                  <label htmlFor="player-name-input" className="block text-xs font-semibold text-slate-300">
                    পাড়ার ডাকনাম
                  </label>
                  {modeTab === 'multi' && (
                    <button
                      type="button"
                      onClick={() => setEditingMultiIdentity(false)}
                      className="text-xs font-bold text-amber-300 hover:text-amber-200 cursor-pointer"
                    >
                      সম্পন্ন
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="w-9 h-9 rounded-xl ring-2 ring-amber-300/65 shrink-0 shadow-inner transition-colors"
                    style={{ backgroundColor: selectedSpec.hex }}
                  />
                  <input
                    id="player-name-input"
                    type="text"
                    maxLength={16}
                    value={playerName}
                    onChange={(e) => onChangeName(e.target.value)}
                    placeholder="যেমন: Lal Mia"
                    className="w-full min-h-[42px] px-3.5 py-2 [@media(max-height:540px)]:min-h-[36px] [@media(max-height:540px)]:py-1.5 rounded-xl bg-slate-900/95 border border-white/15 text-white text-sm font-semibold focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/25 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5 [@media(max-height:540px)]:mb-1">
                  <span>রঙ</span>
                  <span aria-hidden="true" className="text-slate-500">·</span>
                  <span className="text-amber-200 font-semibold">{selectedSpec.label}</span>
                </div>
                <div
                  className="grid grid-cols-5 gap-1.5 sm:gap-2 [@media(max-height:540px)]:gap-1 w-full sm:w-fit"
                  role="radiogroup"
                  aria-label="চরিত্রের রঙ বেছে নাও"
                >
                  {PLAYER_COLORS.map((c) => {
                    const active = c.id === playerColor;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => onChangeColor(c.id)}
                        aria-label={`রঙ ${c.label}`}
                        aria-checked={active}
                        role="radio"
                        className="w-10 h-10 sm:w-7 sm:h-7 [@media(max-height:540px)]:w-8 [@media(max-height:540px)]:h-8 flex items-center justify-center rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                      >
                        <span
                          className={`block w-7 h-7 sm:w-6 sm:h-6 [@media(max-height:540px)]:w-5 [@media(max-height:540px)]:h-5 rounded-full transition-transform ${
                            active
                              ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-[#090e1b] scale-110'
                              : 'ring-1 ring-white/25 hover:scale-105'
                          }`}
                          style={{ backgroundColor: c.hex }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-3.5 pb-3.5 border-b border-white/10 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-10 h-10 rounded-xl ring-2 ring-amber-300/80 ring-offset-2 ring-offset-[#090e1b] shrink-0"
                  style={{ backgroundColor: selectedSpec.hex }}
                />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">
                    {playerName.trim() || 'Para Hero'}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {selectedSpec.label} · অটো নাম
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={applyAutoIdentity}
                  aria-label="অটো নাম ও রঙ বদলাও"
                  title="মজার আরেকটি নাম ও রঙ নাও"
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  <Shuffle className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">অটো</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingMultiIdentity(true)}
                  aria-label="নাম বা রঙ পরিবর্তন করো"
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  <Pencil className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">বদলাও</span>
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div role="alert" className="mb-3 px-3.5 py-2.5 rounded-xl bg-rose-950/90 border border-rose-500/45 text-xs font-medium text-rose-200">
              {errorMsg}
            </div>
          )}

          {modeTab === 'solo' ? (
            <div className="space-y-3 [@media(max-height:540px)]:space-y-2">
              {/* Special Role Selector */}
              <div className="rounded-xl bg-slate-900/75 border border-white/10 p-2.5 sm:px-3 sm:py-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label
                    htmlFor="solo-role-select"
                    className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    স্পেশাল রোল
                  </label>
                  <select
                    id="solo-role-select"
                    value={soloSpecial}
                    onChange={(e) => setSoloSpecial(e.target.value as SpecialRole | 'random')}
                    className="w-full sm:flex-1 sm:min-w-0 sm:max-w-[260px] min-h-[42px] sm:min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-950/95 border border-white/15 text-xs font-semibold text-amber-200 focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    {SOLO_SPECIAL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                {soloSpecial !== 'random' && (
                  <p className="mt-2 pt-2 border-t border-white/8 text-xs text-slate-300 leading-snug">
                    <span className={`font-bold mr-1.5 ${factionTextColor}`}>{factionLabel}</span>
                    {SPECIAL_ROLES[soloSpecial].shortDesc}
                  </p>
                )}
              </div>

              {/* Match Summary & Collapsible Rules Trigger */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowSoloSettings((v) => !v)}
                  aria-expanded={showSoloSettings}
                  className="w-full sm:w-auto min-h-[42px] sm:min-h-[40px] px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/12 font-semibold text-slate-200 flex items-center justify-between sm:justify-start gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>নিয়ম বদলাও</span>
                    <span aria-hidden="true" className="text-slate-500">·</span>
                    <span className="font-mono-tabular text-amber-200/95 truncate">
                      {soloPlayerCount} জন / {soloSettings.vondoCount} বাটপার / {soloSettings.tasksPerPlayer} কাজ
                    </span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${showSoloSettings ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>

              {showSoloSettings && (
                <div className="p-3 rounded-xl bg-slate-900/75 border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs text-slate-200">
                  <label className="flex items-center justify-between gap-2 min-h-[38px]">
                    <span className="text-slate-400">খেলোয়াড়</span>
                    <select
                      value={soloPlayerCount}
                      onChange={(e) => onChangeSoloPlayerCount(Number(e.target.value))}
                      className="min-h-[38px] px-2.5 py-1 rounded-lg bg-slate-950 border border-white/15 text-white font-mono-tabular"
                    >
                      {[5, 6, 7, 8, 9, 10, 12, 15, 18, 20].map((cnt) => (
                        <option key={cnt} value={cnt}>
                          {cnt} জন
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-2 min-h-[38px]">
                    <span className="text-slate-400">বাটপার</span>
                    <select
                      value={soloSettings.vondoCount}
                      onChange={(e) => onUpdateSoloSettings({ vondoCount: Number(e.target.value) })}
                      className="min-h-[38px] px-2.5 py-1 rounded-lg bg-slate-950 border border-white/15 text-white"
                    >
                      <option value={1}>১ জন বাটপার</option>
                      <option value={2} disabled={soloPlayerCount < 6}>
                        ২ জন বাটপার {soloPlayerCount < 6 ? '(৬+ জন)' : ''}
                      </option>
                      <option value={3} disabled={soloPlayerCount < 10}>
                        ৩ জন বাটপার {soloPlayerCount < 10 ? '(১০+ জন)' : ''}
                      </option>
                      <option value={4} disabled={soloPlayerCount < 14}>
                        ৪ জন বাটপার {soloPlayerCount < 14 ? '(১৪+ জন)' : ''}
                      </option>
                      <option value={5} disabled={soloPlayerCount < 17}>
                        ৫ জন বাটপার {soloPlayerCount < 17 ? '(১৭+ জন)' : ''}
                      </option>
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-2 min-h-[38px]">
                    <span className="text-slate-400">কিল বিরতি</span>
                    <select
                      value={soloSettings.killCooldownSec}
                      onChange={(e) => onUpdateSoloSettings({ killCooldownSec: Number(e.target.value) })}
                      className="min-h-[38px] px-2.5 py-1 rounded-lg bg-slate-950 border border-white/15 text-white font-mono-tabular"
                    >
                      <option value={12}>১২ সে.</option>
                      <option value={18}>১৮ সে.</option>
                      <option value={25}>২৫ সে.</option>
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-2 min-h-[38px]">
                    <span className="text-slate-400">কাজ</span>
                    <select
                      value={soloSettings.tasksPerPlayer}
                      onChange={(e) => onUpdateSoloSettings({ tasksPerPlayer: Number(e.target.value) })}
                      className="min-h-[38px] px-2.5 py-1 rounded-lg bg-slate-950 border border-white/15 text-white font-mono-tabular"
                    >
                      {[4, 5, 6, 8, 10, 12, 15].map((cnt) => (
                        <option key={cnt} value={cnt}>
                          {cnt}টি কাজ
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="sm:col-span-2 flex items-center justify-between gap-2 min-h-[38px]">
                    <span className="text-slate-400">দৌড়ের গতি</span>
                    <select
                      value={soloSettings.moveSpeed}
                      onChange={(e) => onUpdateSoloSettings({ moveSpeed: Number(e.target.value) })}
                      className="min-h-[38px] px-2.5 py-1 rounded-lg bg-slate-950 border border-white/15 text-white font-mono-tabular"
                    >
                      <option value={7.65}>০.৮৫x (ধীরে)</option>
                      <option value={9}>১.০x (স্বাভাবিক)</option>
                      <option value={11.25}>১.২৫x (দ্রুত)</option>
                      <option value={13.5}>১.৫x (সুপার)</option>
                      <option value={15.75}>১.৭৫x (টার্বো)</option>
                      <option value={18}>২.০x (ম্যাক্স)</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2.5 min-h-[36px] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={soloSettings.confirmEjects}
                      onChange={(e) => onUpdateSoloSettings({ confirmEjects: e.target.checked })}
                      className="accent-amber-400 w-4 h-4"
                    />
                    <span>আসল পরিচয় দেখাও</span>
                  </label>
                  <label className="flex items-center gap-2.5 min-h-[36px] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={soloSettings.anonymousVotes}
                      onChange={(e) => onUpdateSoloSettings({ anonymousVotes: e.target.checked })}
                      className="accent-amber-400 w-4 h-4"
                    />
                    <span>গোপন ভোট</span>
                  </label>
                  <label className="flex items-center gap-2.5 min-h-[36px] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={soloSettings.visualTasks}
                      onChange={(e) => onUpdateSoloSettings({ visualTasks: e.target.checked })}
                      className="accent-amber-400 w-4 h-4"
                    />
                    <span>লাইভ কাজের দৃশ্য</span>
                  </label>
                  <label className="flex items-center gap-2.5 min-h-[36px] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={soloSettings.enableSpecialRoles}
                      onChange={(e) => onUpdateSoloSettings({ enableSpecialRoles: e.target.checked })}
                      className="accent-amber-400 w-4 h-4"
                    />
                    <span>স্পেশাল রোল</span>
                  </label>
                </div>
              )}

              {/* Primary 3D-Beveled Launch CTA with Specular Sheen */}
              <button
                type="button"
                data-start="true"
                onClick={() =>
                  onStartSolo(undefined, soloSpecial === 'random' ? undefined : soloSpecial)
                }
                className="relative overflow-hidden w-full min-h-[50px] py-3.5 [@media(max-height:540px)]:min-h-[42px] [@media(max-height:540px)]:py-2.5 px-6 rounded-xl bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:via-amber-300 hover:to-amber-400 active:translate-y-[1px] border-b-[3px] border-amber-700/90 text-slate-950 font-display font-extrabold text-base [@media(max-height:540px)]:text-sm flex items-center justify-center gap-2 shadow-[0_14px_34px_-8px_rgba(251,191,36,0.58)] transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
              >
                <span
                  aria-hidden="true"
                  className="kb-cta-sheen pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-transparent via-white/55 to-transparent"
                />
                <Play className="w-5 h-5 fill-current shrink-0 relative z-10" />
                <span className="relative z-10">সলো ম্যাচ শুরু করো</span>
              </button>

              {/* Practice Mode Quick Row */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onStartSolo(
                      'parabasi',
                      soloSpecial !== 'random' &&
                        !BATPAR_SPECIAL_ROLES.includes(soloSpecial) &&
                        !isNeutralRole(soloSpecial)
                        ? soloSpecial
                        : undefined,
                    )
                  }
                  className="min-h-[42px] py-2 px-3 rounded-xl bg-emerald-950/55 hover:bg-emerald-900/75 border border-emerald-400/25 text-emerald-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                >
                  <Shield className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span>পাড়াবাসী প্র্যাকটিস</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onStartSolo(
                      'vondo',
                      soloSpecial !== 'random' && BATPAR_SPECIAL_ROLES.includes(soloSpecial)
                        ? soloSpecial
                        : undefined,
                    )
                  }
                  className="min-h-[42px] py-2 px-3 rounded-xl bg-rose-950/65 hover:bg-rose-900/85 border border-rose-500/35 text-rose-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                >
                  <Skull className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                  <span>বাটপার প্র্যাকটিস</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {initialJoinCode && (
                <div className="px-3 py-2 rounded-xl bg-emerald-950/85 border border-emerald-400/40 text-xs text-emerald-200 font-semibold">
                  আমন্ত্রণ লিংক প্রস্তুত — রুম <span className="font-mono-tabular text-amber-300">{initialJoinCode.toUpperCase()}</span> বসানো আছে! নাম লিখে যোগ দাও।
                </div>
              )}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  disabled={connecting}
                  onClick={onCreateRoom}
                  className="min-h-[46px] py-3 px-4 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 border-b-[3px] border-emerald-700 disabled:opacity-50 text-slate-950 font-display font-extrabold text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  {connecting ? 'কানেক্ট হচ্ছে...' : 'রুম বানাও'}
                </button>
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="text"
                    maxLength={6}
                    aria-label="রুম কোড"
                    placeholder="রুম কোড"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && joinCode.trim().length >= 3 && !connecting) {
                        onJoinRoom(joinCode.trim());
                      }
                    }}
                    className="flex-1 min-w-0 min-h-[46px] px-3 py-2.5 rounded-xl bg-slate-900/95 border border-white/15 text-white text-sm font-mono-tabular uppercase tracking-widest focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    aria-label="রুম কোড দিয়ে জয়েন করো"
                    disabled={connecting || joinCode.trim().length < 3}
                    onClick={() => onJoinRoom(joinCode.trim())}
                    className="min-h-[46px] px-4 py-2.5 rounded-xl bg-gradient-to-b from-amber-300 to-amber-400 border-b-[3px] border-amber-700 disabled:opacity-40 hover:from-amber-200 hover:to-amber-300 text-slate-950 font-extrabold text-sm transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
                  >
                    জয়েন করো
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-snug">
                <strong className="text-slate-200">রুম বানাও</strong> দিয়ে বন্ধুদের কোড দাও, অথবা বন্ধুর <strong className="text-amber-300">রুম কোড</strong> লিখে যোগ দাও।
              </p>

              <div className="pt-3 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300">সচল পাবলিক রুম</span>
                  <button
                    type="button"
                    onClick={onRefreshRooms}
                    aria-label="পাবলিক রুম রিফ্রেশ করো"
                    className="min-h-[36px] px-2 text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    রিফ্রেশ
                  </button>
                </div>
                {publicRooms.length === 0 ? (
                  <p className="text-xs text-slate-400 py-1">নতুন রুম খুলে বন্ধুদের রুম কোড শেয়ার করো।</p>
                ) : (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {publicRooms.map((r) => (
                      <div
                        key={r.roomCode}
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10"
                      >
                        <div className="flex items-center gap-2 text-xs min-w-0">
                          <span className="font-mono-tabular font-bold text-amber-300">{r.roomCode}</span>
                          <span className="text-slate-500">·</span>
                          <span className="text-slate-200 truncate">{r.hostName}</span>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-xs font-mono-tabular text-slate-400 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {r.playerCount}/{r.maxPlayers}
                          </span>
                          <button
                            type="button"
                            onClick={() => onJoinRoom(r.roomCode)}
                            className="min-h-[34px] px-3 py-1 rounded-lg bg-amber-400 text-slate-950 text-xs font-bold hover:bg-amber-300 whitespace-nowrap cursor-pointer"
                          >
                            যোগ দাও
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Meme Sound Pack & Rules Guide Footer */}
          <div className="mt-4 [@media(max-height:540px)]:mt-2.5 pt-3 [@media(max-height:540px)]:pt-2 border-t border-white/10 flex items-center gap-2">
            {onOpenMemePack && (
              <button
                type="button"
                onClick={onOpenMemePack}
                className="flex-1 min-h-[42px] py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-amber-400/25 text-amber-200 text-xs font-semibold flex items-center justify-between gap-2 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <span className="flex items-center gap-2 truncate">
                  <Music2 className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="truncate">মিম ও ভয়েস প্যাক</span>
                </span>
                <span className="text-amber-300 font-mono-tabular text-xs shrink-0">
                  {customMemeCount > 0 ? `${customMemeCount} ক্লিপ` : 'কাস্টমাইজ'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={onOpenGuide}
              className={`${onOpenMemePack ? '' : 'flex-1 justify-center '}min-h-[42px] py-2 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-sky-400/25 text-sky-200 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300`}
            >
              <BookOpen className="w-4 h-4 text-sky-300 shrink-0" />
              নিয়ম ও চরিত্র
            </button>
          </div>
        </section>
      </main>

      {/* Clean Single-Line Bottom Control Hint (desktop/tablet) */}
      <footer className="hidden md:block relative z-10 px-6 sm:px-10 lg:px-14 pb-5 [@media(max-height:540px)]:hidden">
        <p className="inline-block px-4 py-1.5 rounded-xl bg-[#090e1b]/75 border border-white/10 text-xs text-slate-300 font-medium tracking-wide shadow-lg">
          WASD হাঁটা · Space লাফ · Shift দৌড় · ড্র্যাগ ৩৬০° · ১–০ ভয়েস ও মিম · E কাজ · R রিপোর্ট · F সালিশ
        </p>
      </footer>
    </div>
  );
}
