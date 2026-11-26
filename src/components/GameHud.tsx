import { memo, useEffect, useRef, useState } from 'react';
import {
  PLAYER_COLORS,
  SPECIAL_ROLES,
  type DoorZoneId,
  type RoomSnapshot,
  type SabotageType,
  type VehicleState,
} from '../shared/types';
import {
  ADMIN_TABLE_POS,
  DOORS,
  EMERGENCY_BELL_POS,
  GAS_LEAK_VALVES,
  MAP_HALF_SIZE,
  RAILWAY_TRACK_Z,
  ROOFTOPS,
  SECURITY_CAMS_POS,
  STAIR_RAMPS,
  TASK_STATIONS,
  VEHICLE_SPECS,
  VENTS,
  VITALS_POS,
  WALLS,
  ZONES,
  distance2D,
  getBanglaZoneNameAt,
  getZoneIdAt,
} from '../shared/mapData';
import {
  CHANDABAZ_COOLDOWN_SEC,
  MISTRI_FIX_RANGE,
  SABOTAGE_FIX_RANGE,
  VENT_RANGE,
  canCompleteTasks,
  canUseVent,
  countAliveChandabazTargets,
  findGhotokPairCandidates,
  findNearestChamchaPatron,
  findNearestChandabazTarget,
  findNearestCleanableBody,
  findNearestDarogaTarget,
  findNearestGasValve,
  findNearestHaturTarget,
  findNearestInspectableBody,
  findNearestKillTarget,
  findNearestMasterTarget,
  findNearestReportableBody,
  findNearestRevivableBody,
  findNearestShieldTarget,
  getChandabazGoal,
  getConnectedVents,
  getDirectionCompass,
  isCriticalSabotage,
  isNeutralRole,
  isTaskLockedBySabotage,
} from '../shared/gameRules';
import type { StationModalKind } from './StationModals';
import { getQuickMemeList, soundEngine, type MemeSoundId } from '../audio/soundEngine';
import { subscribeMemePack } from '../audio/memePackStore';
import {
  Volume2,
  VolumeX,
  Pause,
  Map as MapIcon,
  Zap,
  Skull,
  Bell,
  Wrench,
  DoorOpen,
  Video,
  Radar,
  Activity,
  Lock,
  Gamepad2,
  Crosshair,
  RotateCcw,
  Sparkles,
  Shield,
  Search,
  Smile,
  Music,
  Music2,
  HelpCircle,
  Navigation,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Settings,
  X,
  Gavel,
  HeartPulse,
  Sparkle,
  Heart,
  BookOpen,
  Radio,
  UserCheck,
  DollarSign,
  Camera,
  Car,
  Gauge,
} from 'lucide-react';
import {
  enterMobileFullscreenAndLandscape,
  isFullscreenActive,
  subscribeFullscreenChange,
  toggleFullscreenMode,
} from '../utils/mobileFullscreen';

export interface GameHudProps {
  snapshot: RoomSnapshot;
  localPlayerId: string;
  muted: boolean;
  touchControlsEnabled: boolean;
  pointerLookEnabled: boolean;
  clueNotice: { title: string; detail: string } | null;
  killFlash?: boolean;
  compassYaw?: number;
  subscribeCompassYaw?: (cb: (yaw: number) => void) => () => void;
  onToggleTouchControls: () => void;
  onTogglePointerLook: () => void;
  onResetCamera: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onOpenTacticalMap: () => void;
  onOpenGuide: () => void;
  onOpenTask: (taskId: string) => void;
  onOpenStation: (station: StationModalKind) => void;
  onReportBody: (bodyId: string) => void;
  onEmergencyMeeting: () => void;
  onKill: (targetId: string) => void;
  onSabotage: (type: SabotageType) => void;
  onLockDoors: (zoneId: DoorZoneId) => void;
  onFixSabotageHold: (holding: boolean, valveId?: 'valve_cha' | 'valve_rickshaw') => void;
  onVentToggle: (destVentId?: string) => void;
  onUseAbility: (targetId?: string) => void;
  onPlayMeme: (memeId: MemeSoundId) => void;
  onOpenMemePack?: () => void;
  drivingVehicle?: VehicleState | null;
  nearbyVehicle?: VehicleState | null;
  driveSpeedMs?: number;
  onToggleVehicle?: (vehicleId?: string) => void;
  onVehicleHorn?: () => void;
}

const DOOR_OPTIONS: Array<{ zoneId: DoorZoneId; label: string }> = [
  { zoneId: 'cha_dokan', label: 'চায়ের দোকান' },
  { zoneId: 'rickshaw_garage', label: 'রিকশা গ্যারেজ' },
  { zoneId: 'desco_power', label: 'ডেসকো' },
  { zoneId: 'dish_roof', label: 'ডিশ হাব' },
];

const SHORT_ZONE_LABELS: Record<string, string> = {
  adda_chowk: 'আড্ডা',
  cha_dokan: 'চা',
  rickshaw_garage: 'গ্যারেজ',
  desco_power: 'ডেসকো',
  dish_roof: 'ডিশ',
  pukur_ghat: 'পুকুর',
  bazar_stall: 'বাজার',
  eidgah_north: 'ঈদগাহ',
  south_tank: 'ওয়াসা',
  fuchka_corner: 'ফুচকা',
  saloon_goli: 'সেলুন',
  cricket_math: 'মাঠ',
  pharmacy_mor: 'ফার্মেসি',
  biyer_pandal: 'প্যান্ডেল',
  kakar_bari: 'কাকা',
  master_bari: 'মাস্টার',
  chacha_bari: 'চাচা',
  khalar_bari: 'খালা',
  rail_station: 'স্টেশন',
  nanar_bari: 'নানা',
  cinema_hall: 'সিনেমা',
  bhai_duplex: 'ডুপ্লেক্স',
  coaching_center: 'কোচিং',
  khalur_bari: 'খালু',
  jheel_par: 'ঝিল',
  shishu_park: 'পার্ক',
  kacchi_house: 'কাচ্চি',
  cyber_cafe: 'সাইবার',
  dorji_bari: 'দর্জি',
  tiger_gym: 'জিম',
  mach_bazar: 'মাছ',
  rail_colony: 'কলোনি',
  signal_yard: 'সিগন্যাল',
  fufu_bari: 'ফুফু',
};

const COMPASS_LABELS: Record<number, string> = {
  0: 'উ',
  45: 'উ-পূ',
  90: 'পূ',
  135: 'দ-পূ',
  180: 'দ',
  225: 'দ-প',
  270: 'প',
  315: 'উ-প',
};

function PubgCompassStrip({
  bearingDeg,
  compact,
}: {
  bearingDeg: number;
  compact: boolean;
}) {
  const pxPerDeg = compact ? 1.35 : 1.7;
  const centerDeg = ((bearingDeg % 360) + 360) % 360;
  const ticks: Array<{ key: string; offsetPx: number; major: boolean; label?: string }> = [];

  for (let d = -90; d <= 450; d += 15) {
    const diff = d - centerDeg;
    if (Math.abs(diff) > 78) continue;
    const norm = ((d % 360) + 360) % 360;
    const label = COMPASS_LABELS[norm] ?? (norm % 30 === 0 ? String(norm) : undefined);
    ticks.push({
      key: `${d}`,
      offsetPx: diff * pxPerDeg,
      major: Boolean(COMPASS_LABELS[norm]) || norm % 30 === 0,
      label,
    });
  }

  return (
    <div
      aria-label={`কম্পাস দিক ${Math.round(centerDeg)} ডিগ্রি`}
      className={`pointer-events-none flex flex-col items-center select-none ${
        compact ? 'w-[172px]' : 'w-[228px] sm:w-[276px]'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="px-2 py-[1px] rounded-full bg-slate-950/92 border border-amber-400/40 font-mono-tabular text-[10px] font-black text-amber-300 tracking-wider shadow">
          {String(Math.round(centerDeg)).padStart(3, '0')}°
        </span>
      </div>
      <div
        className="relative w-full h-5 rounded-full border border-white/10 overflow-hidden shadow-md"
        style={{
          background:
            'linear-gradient(90deg, rgba(10,16,28,0.28) 0%, rgba(10,16,28,0.9) 18%, rgba(10,16,28,0.9) 82%, rgba(10,16,28,0.28) 100%)',
        }}
      >
        <div
          aria-hidden="true"
          className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-amber-400 z-10"
        />
        {ticks.map((tk) => (
          <div
            key={tk.key}
            className="absolute top-0 flex flex-col items-center -translate-x-1/2"
            style={{ left: `calc(50% + ${tk.offsetPx.toFixed(1)}px)` }}
          >
            <div className={tk.major ? 'w-[1.5px] h-1.5 bg-amber-300/80' : 'w-[1px] h-1 bg-slate-400/55'} />
            {tk.label && (
              <span
                className={`text-[9px] font-display leading-none mt-[1px] ${
                  COMPASS_LABELS[((Math.round(Number(tk.key)) % 360) + 360) % 360]
                    ? 'font-black text-amber-200'
                    : 'font-semibold text-slate-300/85'
                }`}
              >
                {tk.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const PubgCompassStripLive = memo(function PubgCompassStripLive({
  initialYaw = 0,
  subscribeCompassYaw,
  compact,
}: {
  initialYaw?: number;
  subscribeCompassYaw?: (cb: (yaw: number) => void) => () => void;
  compact: boolean;
}) {
  const [yaw, setYaw] = useState(initialYaw);
  useEffect(() => {
    if (!subscribeCompassYaw) return;
    return subscribeCompassYaw((nextYaw) => setYaw(nextYaw));
  }, [subscribeCompassYaw]);
  const effectiveYaw = subscribeCompassYaw ? yaw : initialYaw;
  const deg = (((-effectiveYaw * 180) / Math.PI) % 360 + 360) % 360;
  return <PubgCompassStrip bearingDeg={deg} compact={compact} />;
});

interface TacticalActionSlot {
  id: string;
  label: string;
  subLabel?: string;
  hotkey?: string;
  icon: React.ReactNode;
  accentHex: string;
  bgClass: string;
  disabled?: boolean;
  progress01?: number;
  pulse?: boolean;
  onClick?: () => void;
  onHold?: (holding: boolean) => void;
}

function TacticalCircleButton({
  slot,
  hero = false,
  compact = false,
  showHotkey = false,
}: {
  slot: TacticalActionSlot;
  hero?: boolean;
  compact?: boolean;
  showHotkey?: boolean;
}) {
  const sizePx = hero ? (compact ? 64 : 76) : compact ? 50 : 58;
  const r = sizePx / 2 - 3.5;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, slot.progress01 ?? 0));
  const dashOffset = circumference * (1 - pct);

  return (
    <button
      type="button"
      tabIndex={-1}
      disabled={slot.disabled}
      onClick={(e) => {
        if (slot.onHold) return;
        e.currentTarget.blur();
        slot.onClick?.();
      }}
      onPointerDown={(e) => {
        if (!slot.onHold) return;
        e.preventDefault();
        e.stopPropagation();
        slot.onHold(true);
      }}
      onPointerUp={(e) => {
        if (!slot.onHold) return;
        e.preventDefault();
        slot.onHold(false);
      }}
      onPointerLeave={() => {
        slot.onHold?.(false);
      }}
      onPointerCancel={() => {
        slot.onHold?.(false);
      }}
      aria-label={
        slot.subLabel
          ? `${slot.label} ${slot.subLabel}${slot.hotkey ? ` [${slot.hotkey}]` : ''}`
          : `${slot.label}${slot.hotkey ? ` [${slot.hotkey}]` : ''}`
      }
      title={slot.subLabel ? `${slot.label} (${slot.subLabel})` : slot.label}
      className={`group relative rounded-full flex flex-col items-center justify-center select-none active:scale-90 hover:scale-[1.04] transition-all duration-150 shadow-[0_8px_24px_rgba(0,0,0,0.65)] disabled:opacity-40 disabled:hover:scale-100 ${slot.bgClass} ${
        slot.pulse ? 'ring-2 ring-white/40' : ''
      }`}
      style={{
        width: `${sizePx}px`,
        height: `${sizePx}px`,
        touchAction: 'none',
      }}
    >
      {/* Inner tactical ring bevel */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[5px] rounded-full border border-white/10"
      />
      <svg
        width={sizePx}
        height={sizePx}
        viewBox={`0 0 ${sizePx} ${sizePx}`}
        className="absolute inset-0 -rotate-90 pointer-events-none"
        aria-hidden="true"
      >
        <circle
          cx={sizePx / 2}
          cy={sizePx / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth={hero ? 3 : 2.25}
        />
        {pct > 0 && (
          <circle
            cx={sizePx / 2}
            cy={sizePx / 2}
            r={r}
            fill="none"
            stroke={slot.accentHex}
            strokeWidth={hero ? 3.25 : 2.5}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        )}
      </svg>

      {showHotkey && slot.hotkey && (
        <kbd className="pointer-events-none absolute -top-1 -right-1 z-20 min-w-[19px] h-[19px] px-1 rounded-full bg-slate-950/95 border border-white/25 text-amber-300 font-mono-tabular text-[10px] font-black flex items-center justify-center shadow">
          {slot.hotkey}
        </kbd>
      )}

      <span className="relative z-10 flex flex-col items-center justify-center leading-none px-1">
        {slot.icon}
        <span
          className={`font-display font-black tracking-wide mt-0.5 truncate max-w-[92%] ${
            hero ? (compact ? 'text-[9.5px]' : 'text-[10.5px]') : compact ? 'text-[8px]' : 'text-[9px]'
          }`}
        >
          {slot.label}
        </span>
        {slot.subLabel && (
          <span
            className={`font-mono-tabular font-bold opacity-95 mt-[1px] truncate ${
              hero ? 'text-[9px] max-w-[56px]' : 'text-[8px] max-w-[44px]'
            }`}
          >
            {slot.subLabel}
          </span>
        )}
      </span>
    </button>
  );
}

const MINIMAP_WORLD_HALF = MAP_HALF_SIZE + 10;
const MINIMAP_WORLD_SPAN = MINIMAP_WORLD_HALF * 2;
let cachedMinimapDataUrl: string | null = null;

function getMinimapStaticDataUrl(): string {
  if (cachedMinimapDataUrl) return cachedMinimapDataUrl;
  if (typeof document === 'undefined') return '';
  const size = 768;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const s = size / MINIMAP_WORLD_SPAN;
  const wx = (x: number) => (x + MINIMAP_WORLD_HALF) * s;
  const wz = (z: number) => (z + MINIMAP_WORLD_HALF) * s;

  ctx.fillStyle = '#060b14';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#0b1322';
  ctx.fillRect(wx(-MAP_HALF_SIZE), wz(-MAP_HALF_SIZE), MAP_HALF_SIZE * 2 * s, MAP_HALF_SIZE * 2 * s);

  ctx.fillStyle = 'rgba(30, 41, 59, 0.68)';
  ctx.fillRect(wx(-9), wz(-MAP_HALF_SIZE), 18 * s, MAP_HALF_SIZE * 2 * s);
  ctx.fillRect(wx(-MAP_HALF_SIZE), wz(-9), MAP_HALF_SIZE * 2 * s, 18 * s);

  ctx.save();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3.6 * s;
  ctx.setLineDash([3 * s, 2 * s]);
  ctx.strokeRect(wx(-54), wz(-54), 108 * s, 108 * s);
  ctx.restore();

  const drawRoadLine = (x1: number, y1: number, x2: number, y2: number, lw: number) => {
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = lw * s;
    ctx.beginPath();
    ctx.moveTo(wx(x1), wz(y1));
    ctx.lineTo(wx(x2), wz(y2));
    ctx.stroke();
  };
  drawRoadLine(-154, -114, 154, -114, 3.4);
  drawRoadLine(-154, -72, 154, -72, 3.2);
  drawRoadLine(-154, -52, 154, -52, 3.2);
  drawRoadLine(-154, 52, 154, 52, 3.2);
  drawRoadLine(-154, 72, 154, 72, 3.2);
  drawRoadLine(-154, 96, 154, 96, 2.8);
  drawRoadLine(-154, 112, 154, 112, 3.4);
  drawRoadLine(-154, 144, 154, 144, 3.4);
  drawRoadLine(-118, -154, -118, 154, 3.4);
  drawRoadLine(-86, -154, -86, 154, 3.0);
  drawRoadLine(-52, -154, -52, 154, 3.2);
  drawRoadLine(52, -154, 52, 154, 3.2);
  drawRoadLine(86, -154, 86, 154, 3.0);
  drawRoadLine(118, -154, 118, 154, 3.4);

  ctx.save();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2.6 * s;
  ctx.setLineDash([1.4 * s, 1.6 * s]);
  ctx.beginPath();
  ctx.moveTo(wx(-MAP_HALF_SIZE + 2), wz(RAILWAY_TRACK_Z));
  ctx.lineTo(wx(MAP_HALF_SIZE - 2), wz(RAILWAY_TRACK_Z));
  ctx.stroke();
  ctx.restore();

  for (const z of ZONES) {
    ctx.save();
    ctx.globalAlpha = 0.52;
    ctx.fillStyle = z.color;
    ctx.fillRect(wx(z.x - z.width / 2), wz(z.z - z.depth / 2), z.width * s, z.depth * s);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = Math.max(0.8, 0.55 * s);
    ctx.strokeRect(wx(z.x - z.width / 2), wz(z.z - z.depth / 2), z.width * s, z.depth * s);
    ctx.restore();
  }

  for (const w of WALLS) {
    if (w.id === 'pukur_water' || w.id === 'jheel_water') {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(wx(w.minX), wz(w.minZ), (w.maxX - w.minX) * s, (w.maxZ - w.minZ) * s);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = Math.max(0.8, 0.6 * s);
      ctx.strokeRect(wx(w.minX), wz(w.minZ), (w.maxX - w.minX) * s, (w.maxZ - w.minZ) * s);
      ctx.restore();
    } else {
      ctx.fillStyle = w.id.startsWith('outer_')
        ? 'rgba(71, 85, 105, 0.9)'
        : w.height <= 1.9
          ? 'rgba(120, 53, 15, 0.9)'
          : 'rgba(148, 163, 184, 0.9)';
      ctx.fillRect(
        wx(w.minX),
        wz(w.minZ),
        Math.max(1.0, w.maxX - w.minX) * s,
        Math.max(1.0, w.maxZ - w.minZ) * s,
      );
    }
  }

  ctx.save();
  ctx.setLineDash([1.8 * s, 1.2 * s]);
  for (const r of ROOFTOPS) {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.fillRect(wx(r.minX), wz(r.minZ), (r.maxX - r.minX) * s, (r.maxZ - r.minZ) * s);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = Math.max(0.7, 0.5 * s);
    ctx.strokeRect(wx(r.minX), wz(r.minZ), (r.maxX - r.minX) * s, (r.maxZ - r.minZ) * s);
  }
  ctx.restore();

  for (const st of STAIR_RAMPS) {
    ctx.fillStyle = 'rgba(245, 158, 11, 0.48)';
    ctx.fillRect(wx(st.minX), wz(st.minZ), (st.maxX - st.minX) * s, (st.maxZ - st.minZ) * s);
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = Math.max(0.7, 0.5 * s);
    ctx.strokeRect(wx(st.minX), wz(st.minZ), (st.maxX - st.minX) * s, (st.maxZ - st.minZ) * s);
  }

  const drawDot = (x: number, z: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(wx(x), wz(z), 1.6 * s, 0, Math.PI * 2);
    ctx.fill();
  };
  drawDot(SECURITY_CAMS_POS.x, SECURITY_CAMS_POS.z, '#fb7185');
  drawDot(ADMIN_TABLE_POS.x, ADMIN_TABLE_POS.z, '#38bdf8');
  drawDot(VITALS_POS.x, VITALS_POS.z, '#34d399');

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.max(8, 4.1 * s)}px system-ui, -apple-system, sans-serif`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, 1.5 * s);
  ctx.strokeStyle = '#090f1d';
  ctx.fillStyle = '#f8fafc';
  for (const z of ZONES) {
    const label = SHORT_ZONE_LABELS[z.id] ?? z.banglaName;
    const lx = wx(z.x);
    const lz = wz(z.z - z.depth / 2 + 3.4);
    ctx.strokeText(label, lx, lz);
    ctx.fillText(label, lx, lz);
  }

  cachedMinimapDataUrl = canvas.toDataURL('image/png');
  return cachedMinimapDataUrl;
}

const RadarFovCone = memo(function RadarFovCone({
  px,
  pz,
  compassYaw,
  subscribeCompassYaw,
}: {
  px: number;
  pz: number;
  compassYaw: number;
  subscribeCompassYaw?: (cb: (yaw: number) => void) => () => void;
}) {
  const gRef = useRef<SVGGElement | null>(null);
  const yawRef = useRef(compassYaw);
  const posRef = useRef({ px, pz });
  posRef.current = { px, pz };

  useEffect(() => {
    if (!subscribeCompassYaw) {
      yawRef.current = compassYaw;
      const deg = (((-compassYaw * 180) / Math.PI) % 360 + 360) % 360;
      gRef.current?.setAttribute('transform', `translate(${px}, ${pz}) rotate(${deg})`);
      return;
    }
    return subscribeCompassYaw((nextYaw) => {
      yawRef.current = nextYaw;
      const deg = (((-nextYaw * 180) / Math.PI) % 360 + 360) % 360;
      const p = posRef.current;
      gRef.current?.setAttribute('transform', `translate(${p.px}, ${p.pz}) rotate(${deg})`);
    });
  }, [subscribeCompassYaw, compassYaw, px, pz]);

  const initialDeg = (((-yawRef.current * 180) / Math.PI) % 360 + 360) % 360;
  return (
    <g ref={gRef} transform={`translate(${px}, ${pz}) rotate(${initialDeg})`}>
      <path d="M 0 0 L -14 -28 A 31 31 0 0 1 14 -28 Z" fill="#38bdf8" fillOpacity={0.28} />
    </g>
  );
});

const FF_RADAR_RADIUS = 54;
const FF_RIM_RADIUS = 49.5;
const MINIMAP_IMG_SCALE_PCT = (MINIMAP_WORLD_SPAN / (FF_RADAR_RADIUS * 2)) * 100;

const FreeFireMinimap = memo(function FreeFireMinimap({
  px,
  pz,
  playerYaw,
  compassYaw,
  subscribeCompassYaw,
  zoneLabel,
  showTasks,
  tasks,
  sabotage,
  doorLocks,
  vehicles,
  sizeClass,
  compact,
  onOpenTacticalMap,
}: {
  px: number;
  pz: number;
  playerYaw: number;
  compassYaw: number;
  subscribeCompassYaw?: (cb: (yaw: number) => void) => () => void;
  zoneLabel: string;
  showTasks: boolean;
  tasks: Array<{ taskId: string; completed: boolean }>;
  sabotage: RoomSnapshot['sabotage'];
  doorLocks: Record<DoorZoneId, number>;
  vehicles?: VehicleState[];
  sizeClass: string;
  compact: boolean;
  onOpenTacticalMap: () => void;
}) {
  const minimapImgUrl = getMinimapStaticDataUrl();
  const sabTargets: Array<{ id: string; x: number; z: number; held: boolean }> =
    sabotage.active === 'gas_leak'
      ? sabotage.valves.map((v) => ({ id: v.id, x: v.x, z: v.z, held: Boolean(v.holderId) }))
      : sabotage.active
        ? [
            {
              id: 'sab-fix',
              x: sabotage.fixStationX,
              z: sabotage.fixStationZ,
              held: false,
            },
          ]
        : [];

  return (
    <div className="pointer-events-auto flex flex-col items-center shrink-0">
      <button
        type="button"
        tabIndex={-1}
        onClick={(e) => {
          e.currentTarget.blur();
          onOpenTacticalMap();
        }}
        aria-label="ট্যাকটিক্যাল মিনিম্যাপ খোলো [Tab]"
        title="সম্পূর্ণ মহল্লার ম্যাপ দেখো [Tab]"
        className={`group relative rounded-full border-2 shadow-2xl transition-colors ${
          sabotage.active
            ? 'border-rose-400/90 hover:border-rose-300'
            : 'border-amber-400/65 hover:border-amber-300'
        } ${sizeClass}`}
        style={{ backgroundColor: '#070d18' }}
      >
        {/* Cardinal উ / পূ / দ / প Bezel Markers */}
        <span className="pointer-events-none absolute -top-1.5 left-1/2 -translate-x-1/2 px-1 rounded bg-slate-950 text-[8px] font-black text-amber-300 leading-tight border border-amber-400/40 z-20">
          উ
        </span>
        <span className="pointer-events-none absolute top-1/2 -right-1.5 -translate-y-1/2 px-0.5 rounded bg-slate-950 text-[7px] font-bold text-slate-300 leading-tight z-20">
          পূ
        </span>
        <span className="pointer-events-none absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-0.5 rounded bg-slate-950 text-[7px] font-bold text-slate-300 leading-tight z-20">
          দ
        </span>
        <span className="pointer-events-none absolute top-1/2 -left-1.5 -translate-y-1/2 px-0.5 rounded bg-slate-950 text-[7px] font-bold text-slate-300 leading-tight z-20">
          প
        </span>

        {/* Inner Clipped Circular Radar Viewport (GPU-blitted cached bitmap + ultra-lightweight dynamic markers) */}
        <div className="w-full h-full rounded-full overflow-hidden relative bg-[#060b14]">
          {minimapImgUrl && (
            <img
              src={minimapImgUrl}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="pointer-events-none select-none absolute left-1/2 top-1/2"
              style={{
                width: `${MINIMAP_IMG_SCALE_PCT}%`,
                height: `${MINIMAP_IMG_SCALE_PCT}%`,
                maxWidth: 'none',
                transform: `translate3d(calc(-50% - ${(px / MINIMAP_WORLD_SPAN) * 100}%), calc(-50% - ${(pz / MINIMAP_WORLD_SPAN) * 100}%), 0)`,
                willChange: 'transform',
              }}
            />
          )}
          <svg
            viewBox={`${px - FF_RADAR_RADIUS} ${pz - FF_RADAR_RADIUS} ${FF_RADAR_RADIUS * 2} ${FF_RADAR_RADIUS * 2}`}
            className="w-full h-full block relative z-10"
            aria-hidden="true"
          >
            {/* Live Door Shutter States */}
            {DOORS.map((d) => {
              const locked = doorLocks[d.zoneId] > 0;
              return (
                <rect
                  key={d.id}
                  x={d.minX}
                  y={d.minZ}
                  width={Math.max(1.4, d.maxX - d.minX)}
                  height={Math.max(1.4, d.maxZ - d.minZ)}
                  fill={locked ? '#f59e0b' : '#334155'}
                  fillOpacity={locked ? 0.95 : 0.45}
                />
              );
            })}

            {/* Vehicle Pips on Minimap Radar */}
            {vehicles?.map((v) => {
              if (Math.hypot(v.x - px, v.z - pz) > FF_RADAR_RADIUS + 4) return null;
              return (
                <rect
                  key={v.id}
                  x={v.x - 1.2}
                  y={v.z - 1.8}
                  width={2.4}
                  height={3.6}
                  rx={0.6}
                  fill={v.driverId ? '#38bdf8' : '#cbd5e1'}
                  fillOpacity={v.driverId ? 0.95 : 0.65}
                  stroke="#090f1d"
                  strokeWidth="0.45"
                  transform={`rotate(${-(v.yaw * 180) / Math.PI} ${v.x} ${v.z})`}
                />
              );
            })}

            {/* Subtle Radar Concentric Range Ring & Crosshair Centered on Player */}
            <circle
              cx={px}
              cy={pz}
              r={27}
              fill="none"
              stroke="#38bdf8"
              strokeOpacity={0.22}
              strokeWidth="0.65"
              strokeDasharray="2 2"
            />
            <line
              x1={px - FF_RADAR_RADIUS}
              y1={pz}
              x2={px + FF_RADAR_RADIUS}
              y2={pz}
              stroke="#94a3b8"
              strokeOpacity={0.14}
              strokeWidth="0.5"
            />
            <line
              x1={px}
              y1={pz - FF_RADAR_RADIUS}
              x2={px}
              y2={pz + FF_RADAR_RADIUS}
              stroke="#94a3b8"
              strokeOpacity={0.14}
              strokeWidth="0.5"
            />

            {/* Incomplete Task Markers (directly on map if close, or rim-clamped arrow if distant) */}
            {showTasks &&
              tasks
                .filter((t) => !t.completed)
                .map((t) => {
                  const st = TASK_STATIONS.find((s) => s.id === t.taskId);
                  if (!st) return null;
                  const dx = st.x - px;
                  const dz = st.z - pz;
                  const dist = Math.hypot(dx, dz);
                  if (dist <= FF_RIM_RADIUS - 2) {
                    return (
                      <circle
                        key={st.id}
                        cx={st.x}
                        cy={st.z}
                        r={2.1}
                        fill="#fbbf24"
                        stroke="#090f1d"
                        strokeWidth="0.75"
                      />
                    );
                  }
                  const angle = Math.atan2(dz, dx);
                  const rx = px + Math.cos(angle) * FF_RIM_RADIUS;
                  const rz = pz + Math.sin(angle) * FF_RIM_RADIUS;
                  const deg = (angle * 180) / Math.PI + 90;
                  return (
                    <g key={`${st.id}-rim`} transform={`translate(${rx}, ${rz}) rotate(${deg})`}>
                      <polygon
                        points="0,-2.8 2.2,2.1 -2.2,2.1"
                        fill="#fbbf24"
                        stroke="#090f1d"
                        strokeWidth="0.65"
                      />
                    </g>
                  );
                })}

            {/* Sabotage Alert Markers (directly on map or clamped on radar rim) */}
            {sabTargets.map((st) => {
              const dx = st.x - px;
              const dz = st.z - pz;
              const dist = Math.hypot(dx, dz);
              const fillHex = st.held ? '#10b981' : '#ef4444';
              if (dist <= FF_RIM_RADIUS - 2) {
                return (
                  <g key={st.id}>
                    <circle
                      cx={st.x}
                      cy={st.z}
                      r={4.2}
                      fill={fillHex}
                      fillOpacity={0.28}
                    />
                    <circle
                      cx={st.x}
                      cy={st.z}
                      r={2.5}
                      fill={fillHex}
                      stroke="#ffffff"
                      strokeWidth="0.85"
                    />
                  </g>
                );
              }
              const angle = Math.atan2(dz, dx);
              const rx = px + Math.cos(angle) * FF_RIM_RADIUS;
              const rz = pz + Math.sin(angle) * FF_RIM_RADIUS;
              const deg = (angle * 180) / Math.PI + 90;
              return (
                <g key={`${st.id}-rim`} transform={`translate(${rx}, ${rz}) rotate(${deg})`}>
                  <polygon
                    points="0,-3.4 2.7,2.4 -2.7,2.4"
                    fill={fillHex}
                    stroke="#ffffff"
                    strokeWidth="0.75"
                  />
                </g>
              );
            })}

            {/* Camera FOV Cone + Local Player Arrow */}
            <RadarFovCone
              px={px}
              pz={pz}
              compassYaw={compassYaw}
              subscribeCompassYaw={subscribeCompassYaw}
            />
            <g transform={`translate(${px}, ${pz}) rotate(${180 - (playerYaw * 180) / Math.PI})`}>
              <polygon
                points="0,-4.4 3.4,3.1 0,1.4 -3.4,3.1"
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth="0.95"
                strokeLinejoin="round"
              />
            </g>
          </svg>
        </div>
      </button>

      {/* Zone Pill Docked Under Radar */}
      <button
        type="button"
        tabIndex={-1}
        onClick={(e) => {
          e.currentTarget.blur();
          onOpenTacticalMap();
        }}
        className={`mt-1.5 rounded-lg border border-amber-400/35 bg-slate-950/90 text-slate-100 font-bold tracking-wide shadow flex items-center gap-1 ${
          compact ? 'px-2 py-0.5 text-[9px] max-w-[98px]' : 'px-2.5 py-0.5 text-[10px] max-w-[144px]'
        }`}
        title={zoneLabel}
      >
        <span className="truncate">{zoneLabel}</span>
        {!compact && <span className="text-amber-300 font-mono-tabular shrink-0">[Tab]</span>}
      </button>
    </div>
  );
});

export const GameHud = memo(function GameHud({
  snapshot,
  localPlayerId,
  muted,
  touchControlsEnabled,
  pointerLookEnabled,
  clueNotice,
  killFlash = false,
  compassYaw = 0,
  subscribeCompassYaw,
  onToggleTouchControls,
  onTogglePointerLook,
  onResetCamera,
  onToggleMute,
  onPause,
  onOpenTacticalMap,
  onOpenGuide,
  onOpenTask,
  onOpenStation,
  onReportBody,
  onEmergencyMeeting,
  onKill,
  onSabotage,
  onLockDoors,
  onFixSabotageHold,
  onVentToggle,
  onUseAbility,
  onPlayMeme,
  onOpenMemePack,
  drivingVehicle = null,
  nearbyVehicle = null,
  driveSpeedMs = 0,
  onToggleVehicle,
  onVehicleHorn,
}: GameHudProps) {
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 720,
  }));
  const [isFullscreen, setIsFullscreen] = useState(() => isFullscreenActive());
  const [mobileTasksExpanded, setMobileTasksExpanded] = useState(false);
  const [dismissRotatePrompt, setDismissRotatePrompt] = useState(false);
  const [showSabotageMenu, setShowSabotageMenu] = useState(false);
  const [showDisguiseMenu, setShowDisguiseMenu] = useState(false);
  const [showMemeDrawer, setShowMemeDrawer] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [bgmEnabled, setBgmEnabled] = useState(() => soundEngine.isBgmEnabled());
  const [, setPackVer] = useState(0);

  useEffect(() => subscribeMemePack(() => setPackVer((v) => v + 1)), []);
  useEffect(() => subscribeFullscreenChange(setIsFullscreen), []);
  useEffect(
    () => soundEngine.subscribeBgmState(() => setBgmEnabled(soundEngine.isBgmEnabled())),
    [],
  );
  useEffect(() => {
    const updateVp = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', updateVp);
    window.visualViewport?.addEventListener('resize', updateVp);
    return () => {
      window.removeEventListener('resize', updateVp);
      window.visualViewport?.removeEventListener('resize', updateVp);
    };
  }, []);

  const isLandscapeCompact = viewport.h <= 540;
  const isNarrowMobile = viewport.w < 640;
  const isMobileHud = isLandscapeCompact || isNarrowMobile || touchControlsEnabled;
  const showMinimap = true;
  const quickMemes = getQuickMemeList();

  const localPlayer = snapshot.players.find((p) => p.id === localPlayerId);
  if (!localPlayer) return null;

  const isVondo = localPlayer.role === 'vondo';
  const isNeutral = isNeutralRole(localPlayer.specialRole);
  const taskEligible = canCompleteTasks(localPlayer);
  const wifiHidden = snapshot.sabotage.active === 'wifi_down' && !isVondo;
  const specialMeta = SPECIAL_ROLES[localPlayer.specialRole];
  const currentZone = getBanglaZoneNameAt(localPlayer.x, localPlayer.z);
  const currentZoneId = getZoneIdAt(localPlayer.x, localPlayer.z);
  const currentZoneDef = ZONES.find((z) => z.id === currentZoneId);

  // Alive OR ghost Para-basi (non-Pagol) complete real tasks; Batpar can open fake tasks for cover
  const nearbyTask =
    taskEligible || isVondo
      ? TASK_STATIONS.find((st) => {
          const hasUndone = localPlayer.tasks.some((t) => t.taskId === st.id && !t.completed);
          return hasUndone && distance2D(localPlayer.x, localPlayer.z, st.x, st.z) <= st.radius;
        }) ?? null
      : null;
  const nearbyTaskLocked = nearbyTask ? isTaskLockedBySabotage(nearbyTask.id, snapshot.sabotage) : false;

  const nearCams =
    localPlayer.alive &&
    distance2D(localPlayer.x, localPlayer.z, SECURITY_CAMS_POS.x, SECURITY_CAMS_POS.z) <=
      SECURITY_CAMS_POS.radius;
  const nearAdmin =
    localPlayer.alive &&
    distance2D(localPlayer.x, localPlayer.z, ADMIN_TABLE_POS.x, ADMIN_TABLE_POS.z) <=
      ADMIN_TABLE_POS.radius;
  const nearVitals =
    localPlayer.alive &&
    distance2D(localPlayer.x, localPlayer.z, VITALS_POS.x, VITALS_POS.z) <= VITALS_POS.radius;

  const fixRange = localPlayer.specialRole === 'mistri' ? MISTRI_FIX_RANGE : SABOTAGE_FIX_RANGE;
  const nearGasValve =
    snapshot.sabotage.active === 'gas_leak' && localPlayer.alive
      ? findNearestGasValve(localPlayer.x, localPlayer.z, snapshot.sabotage, fixRange)
      : null;
  const nearSabotageFix = Boolean(
    snapshot.sabotage.active &&
      localPlayer.alive &&
      (snapshot.sabotage.active === 'gas_leak'
        ? nearGasValve
        : distance2D(
            localPlayer.x,
            localPlayer.z,
            snapshot.sabotage.fixStationX,
            snapshot.sabotage.fixStationZ,
          ) <= fixRange),
  );

  const nearbyBody = findNearestReportableBody(localPlayer, snapshot.bodies, snapshot.doorLocks);
  const inspectableBody = findNearestInspectableBody(localPlayer, snapshot.bodies);
  const shieldTarget = findNearestShieldTarget(localPlayer, snapshot.players);
  const darogaTarget = findNearestDarogaTarget(localPlayer, snapshot.players);
  const cleanableBody = findNearestCleanableBody(localPlayer, snapshot.bodies);
  const revivableBody = findNearestRevivableBody(localPlayer, snapshot.bodies);
  const ghotokPair = findGhotokPairCandidates(localPlayer, snapshot.players);
  const masterTarget = findNearestMasterTarget(localPlayer, snapshot.players);
  const haturTarget = findNearestHaturTarget(localPlayer, snapshot.players);
  const chamchaTarget = findNearestChamchaPatron(localPlayer, snapshot.players);
  const chandabazTarget = findNearestChandabazTarget(localPlayer, snapshot.players);
  const chandabazAliveCount =
    localPlayer.specialRole === 'chandabaz'
      ? countAliveChandabazTargets(localPlayer, snapshot.players)
      : 0;
  const chandabazGoal =
    localPlayer.specialRole === 'chandabaz'
      ? getChandabazGoal(localPlayer, snapshot.players)
      : 0;
  const supariTarget = localPlayer.supariTargetId
    ? snapshot.players.find((p) => p.id === localPlayer.supariTargetId && p.alive) ?? null
    : null;
  const chamchaPatron = localPlayer.chamchaPatronId
    ? snapshot.players.find((p) => p.id === localPlayer.chamchaPatronId) ?? null
    : null;
  const ghotokPartner = localPlayer.ghotokPartnerId
    ? snapshot.players.find((p) => p.id === localPlayer.ghotokPartnerId) ?? null
    : null;
  const commsJammed = (snapshot.commsJammedUntil ?? 0) > Date.now();
  const haturProtected = (localPlayer.haturProtectedUntil ?? 0) > Date.now();

  const nearBell =
    localPlayer.alive &&
    !isCriticalSabotage(snapshot.sabotage.active) &&
    distance2D(localPlayer.x, localPlayer.z, EMERGENCY_BELL_POS.x, EMERGENCY_BELL_POS.z) <=
      EMERGENCY_BELL_POS.interactRadius;

  const killTarget = isVondo ? findNearestKillTarget(localPlayer, snapshot.players) : null;
  const playerCanVent = canUseVent(localPlayer);
  const nearVent =
    (isVondo || localPlayer.specialRole === 'mistri') && localPlayer.alive
      ? VENTS.find((v) => distance2D(localPlayer.x, localPlayer.z, v.x, v.z) <= VENT_RANGE)
      : null;

  const disguiseTargets =
    localPlayer.specialRole === 'bohurupi'
      ? snapshot.players.filter((p) => p.alive && p.id !== localPlayer.id && p.role !== 'vondo')
      : [];

  const taskPct = Math.round(snapshot.taskProgress * 100);
  const emergencyCd = Math.ceil(snapshot.emergencyCooldownRemaining);
  const canCallEmergency =
    nearBell && emergencyCd <= 0 && localPlayer.emergencyMeetingsLeft > 0;
  const anyDoorLocked =
    snapshot.doorLocks.cha_dokan > 0 ||
    snapshot.doorLocks.rickshaw_garage > 0 ||
    snapshot.doorLocks.desco_power > 0 ||
    snapshot.doorLocks.dish_roof > 0;

  const ventGraph = localPlayer.inVent
    ? getConnectedVents(localPlayer.x, localPlayer.z)
    : { currentVent: null, targets: [] };

  // Compute nearest incomplete task or active sabotage compass bearing
  const nextTaskStation =
    (taskEligible || isVondo) && !wifiHidden
      ? localPlayer.tasks
          .filter((t) => !t.completed)
          .map((t) => TASK_STATIONS.find((s) => s.id === t.taskId))
          .filter((s): s is NonNullable<typeof s> => Boolean(s))
          .sort(
            (a, b) =>
              distance2D(localPlayer.x, localPlayer.z, a.x, a.z) -
              distance2D(localPlayer.x, localPlayer.z, b.x, b.z),
          )[0] ?? null
      : null;

  const nearestTargetValve =
    snapshot.sabotage.active === 'gas_leak'
      ? [...snapshot.sabotage.valves].sort((a, b) => {
          const aScore = (a.holderId ? 100 : 0) + distance2D(localPlayer.x, localPlayer.z, a.x, a.z);
          const bScore = (b.holderId ? 100 : 0) + distance2D(localPlayer.x, localPlayer.z, b.x, b.z);
          return aScore - bScore;
        })[0] ?? GAS_LEAK_VALVES[0]
      : null;

  const activeCompass = snapshot.sabotage.active
    ? snapshot.sabotage.active === 'gas_leak' && nearestTargetValve
      ? {
          urgent: true,
          label: nearestTargetValve.label,
          ...getDirectionCompass(
            localPlayer.x,
            localPlayer.z,
            nearestTargetValve.x,
            nearestTargetValve.z,
          ),
        }
      : {
          urgent: true,
          label: snapshot.sabotage.active === 'loadshedding' ? 'ডেসকো ব্রেকার' : 'ডিশ হাব',
          ...getDirectionCompass(
            localPlayer.x,
            localPlayer.z,
            snapshot.sabotage.fixStationX,
            snapshot.sabotage.fixStationZ,
          ),
        }
    : nextTaskStation
      ? {
          urgent: false,
          label: nextTaskStation.title,
          ...getDirectionCompass(
            localPlayer.x,
            localPlayer.z,
            nextTaskStation.x,
            nextTaskStation.z,
          ),
        }
      : null;

  return (
    <div
      className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-2.5 sm:p-5"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.65rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.65rem, env(safe-area-inset-right))',
      }}
    >
      {/* Subtle Crimson Vignette Flash on Kill / Size Event */}
      {killFlash && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-20 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 110px rgba(225, 29, 72, 0.72)',
            backgroundColor: 'rgba(159, 18, 57, 0.16)',
          }}
        />
      )}

      {/* Loadshedding Dark HUD Overlay for Non-Batpar */}
      {snapshot.sabotage.active === 'loadshedding' && !isVondo && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(2, 6, 23, 0.08) 28%, rgba(2, 6, 23, 0.72) 85%)',
          }}
        />
      )}

      {/* Top Container: Portrait Fullscreen Banner (when in portrait) + Left/Center/Right HUD Clusters */}
      <div className="flex flex-col gap-1.5">
        {/* Non-blocking Portrait Mobile Fullscreen Landscape Quick Chip */}
        {touchControlsEnabled &&
          !isFullscreen &&
          viewport.w < viewport.h &&
          !dismissRotatePrompt &&
          !clueNotice && (
            <div className="self-center pointer-events-auto flex items-center gap-1.5 rounded-xl px-2.5 py-1 border border-amber-400/45 shadow-lg bg-slate-950/92 text-[11px] font-bold text-amber-200 whitespace-nowrap shrink-0">
              <button
                type="button"
                onClick={() => {
                  void enterMobileFullscreenAndLandscape();
                }}
                className="flex items-center gap-1.5 text-amber-200 hover:text-white"
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-300" />
                <span>ফুলস্ক্রিন (আড়াআড়ি)</span>
                <Maximize2 className="w-3 h-3 text-amber-300" />
              </button>
              <button
                type="button"
                onClick={() => setDismissRotatePrompt(true)}
                aria-label="ফুলস্ক্রিন পরামর্শ বন্ধ করো"
                className="p-0.5 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

        {/* Ghost Mode Status Banner when dead */}
        {!localPlayer.alive && (
          <div
            role="status"
            aria-label="ভূত মোড চালু"
            className="self-center pointer-events-none flex items-center gap-2 rounded-xl px-3 py-1 border border-sky-400/50 shadow-lg bg-slate-950/90 text-[11px] sm:text-xs font-bold text-sky-200 max-w-[95vw] text-center"
          >
            <span className="text-sky-300 font-display tracking-wide">ভূত মোড</span>
            <span className="text-slate-300 font-semibold truncate">
              {taskEligible
                ? 'তুমি এখন ভূত! জীবিত কেউ দেখবে না — দেয়াল ভেদ করে কাজ সেরে ফেলো!'
                : 'তুমি এখন ভূত! জীবিত কেউ দেখবে না — ঘুরে ঘুরে খেলা দেখো!'}
            </span>
          </div>
        )}

        {/* Top Row: Left Free Fire Radar + Task/Role Cluster · Center PUBG Compass · Right Utility Cluster */}
        <div className="flex items-start justify-between gap-2 sm:gap-3">
        {/* Top-Left Cluster: Free Fire Circular Radar + Tasks & Role Status */}
        <div className="flex flex-col sm:flex-row items-start gap-1.5 sm:gap-2.5 shrink-0">
          {showMinimap && (
            <FreeFireMinimap
              px={localPlayer.x}
              pz={localPlayer.z}
              playerYaw={localPlayer.yaw}
              compassYaw={compassYaw}
              subscribeCompassYaw={subscribeCompassYaw}
              zoneLabel={currentZoneDef ? currentZoneDef.banglaName : currentZone}
              showTasks={!isVondo && !isNeutral && !wifiHidden}
              tasks={localPlayer.tasks}
              sabotage={snapshot.sabotage}
              doorLocks={snapshot.doorLocks}
              vehicles={snapshot.vehicles}
              sizeClass={
                isLandscapeCompact
                  ? 'w-[84px] h-[84px]'
                  : isNarrowMobile
                    ? 'w-[92px] h-[92px]'
                    : 'w-[138px] h-[138px]'
              }
              compact={isLandscapeCompact || isNarrowMobile}
              onOpenTacticalMap={onOpenTacticalMap}
            />
          )}

        <div
          className={`flex flex-col gap-1.5 shrink-0 w-full ${
            isLandscapeCompact ? 'max-w-[178px]' : isNarrowMobile ? 'max-w-[186px]' : 'max-w-[228px] lg:max-w-[244px]'
          }`}
        >
          <div
            className={`pointer-events-auto rounded-xl border border-white/10 shadow-lg bg-slate-950/88 ${
              isLandscapeCompact ? 'px-2.5 py-1.5' : 'px-3 py-2'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold mb-1.5">
              <span className="text-slate-300">পাড়ার কাজ</span>
              <span className="font-mono-tabular text-amber-300">
                {wifiHidden
                  ? 'ওয়াই-ফাই নেই!'
                  : `${snapshot.completedTasks}/${snapshot.totalTasks} · ${taskPct}%`}
              </span>
            </div>
            <div className="w-full h-1.5 sm:h-2 rounded-full bg-slate-800/90 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  wifiHidden ? 'bg-indigo-500/80' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.45)]'
                }`}
                style={{ width: wifiHidden ? '100%' : `${taskPct}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] sm:text-xs gap-2">
              <span
                className="font-display font-bold truncate"
                style={{
                  color:
                    localPlayer.specialRole !== 'none'
                      ? specialMeta.accentHex
                      : isVondo
                        ? '#fb7185'
                        : '#7dd3fc',
                }}
              >
                {localPlayer.specialRole !== 'none'
                  ? specialMeta.banglaTitle
                  : isVondo
                    ? 'বাটপার'
                    : 'পাড়াবাসী'}
                {localPlayer.specialRole === 'neta' && localPlayer.alive ? ' · ২ গুণ ভোট' : ''}
                {!localPlayer.alive ? ' · ভূত' : ''}
              </span>
              <span className="text-slate-200 font-semibold truncate max-w-[130px] sm:max-w-[155px]" title={currentZone}>
                {currentZoneDef ? currentZoneDef.banglaName : currentZone}
              </span>
            </div>

            {activeCompass && (
              <div
                className={`mt-1.5 pt-1.5 border-t border-slate-800/90 flex items-center justify-between gap-2 text-[11px] font-semibold ${
                  activeCompass.urgent ? 'text-rose-300' : 'text-amber-200'
                }`}
              >
                <span className="flex items-center gap-1 truncate">
                  <Navigation className="w-3 h-3 shrink-0" />
                  <span className="truncate">{activeCompass.label}</span>
                </span>
                <span className="font-mono-tabular shrink-0 px-1.5 py-0.5 rounded bg-slate-800/90 text-white">
                  {activeCompass.arrow} {activeCompass.distance}মি
                </span>
              </div>
            )}

            {!localPlayer.alive && taskEligible && (
              <div className="mt-1 text-[10px] font-semibold text-sky-300">
                ভূত মোড: দেয়াল ভেদ করে কাজ শেষ করো!
              </div>
            )}

            {(localPlayer.shielded ||
              haturProtected ||
              localPlayer.disguiseName ||
              ghotokPartner ||
              supariTarget ||
              chamchaPatron ||
              localPlayer.specialRole === 'chandabaz' ||
              localPlayer.specialRole === 'tiktok_star') && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-800 text-[11px] font-semibold flex flex-wrap items-center gap-2">
                {localPlayer.shielded && (
                  <span className="text-amber-300 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    তাবিজ সুরক্ষিত
                  </span>
                )}
                {haturProtected && (
                  <span className="text-lime-300 flex items-center gap-1">
                    <HeartPulse className="w-3 h-3" />
                    ঝাঁঝালো সুরক্ষা
                  </span>
                )}
                {localPlayer.disguiseName && (
                  <span className="text-rose-300 font-mono-tabular">
                    ছদ্মবেশ: {localPlayer.disguiseName} ({Math.ceil(localPlayer.disguiseTimer)}সে.)
                  </span>
                )}
                {ghotokPartner && (
                  <span className="text-pink-300 flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    বন্ধন: {ghotokPartner.name}
                  </span>
                )}
                {supariTarget && (
                  <span className="text-rose-300 flex items-center gap-1">
                    <Crosshair className="w-3 h-3" />
                    সুপারি: {supariTarget.name}
                  </span>
                )}
                {chamchaPatron && (
                  <span className="text-purple-300 flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    বস: {chamchaPatron.name}
                  </span>
                )}
                {localPlayer.specialRole === 'chandabaz' && (
                  <span className="text-amber-300 font-mono-tabular">
                    চাঁদা (জীবিত): {chandabazAliveCount}/{chandabazGoal}
                  </span>
                )}
                {localPlayer.specialRole === 'tiktok_star' && (
                  <span className="text-pink-300 font-mono-tabular">
                    রিল: {localPlayer.tiktokZones?.length ?? 0}/৩
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Assigned Task List (hidden during wifi_down for crew; Batpar sees Fake Task Cover) */}
          {isNeutral ? (
            !isLandscapeCompact && (
              <div
                className="hidden sm:block rounded-xl px-3.5 py-2.5 border border-purple-500/40 shadow-lg text-xs text-purple-200"
                style={{ backgroundColor: 'rgba(28, 14, 44, 0.9)' }}
              >
                <span className="font-display font-bold text-purple-300 block mb-0.5">
                  {specialMeta.banglaTitle}
                </span>
                {specialMeta.shortDesc}
              </div>
            )
          ) : wifiHidden ? (
            <div
              className="rounded-xl px-3 py-2 border border-indigo-400/50 shadow-lg text-[11px] font-semibold text-indigo-200"
              style={{ backgroundColor: 'rgba(30, 27, 75, 0.92)' }}
            >
              ওয়াই-ফাই নেই! কাজের তালিকা উধাও — ডিশ হাবে গিয়ে ঠিক করো!
            </div>
          ) : isLandscapeCompact || isNarrowMobile ? (
            <div className="pointer-events-auto">
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setMobileTasksExpanded((v) => !v);
                }}
                className="px-2.5 py-1 rounded-lg border border-white/12 text-[11px] font-semibold text-slate-200 flex items-center gap-1.5 shadow"
                style={{ backgroundColor: 'rgba(10, 15, 28, 0.84)' }}
              >
                <span>
                  {isVondo ? 'ভুয়া কাজ' : 'কাজসমূহ'} (
                  {localPlayer.tasks.filter((t) => t.completed).length}/{localPlayer.tasks.length})
                </span>
                {mobileTasksExpanded ? (
                  <ChevronUp className="w-3 h-3 text-amber-300" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-amber-300" />
                )}
              </button>
              {mobileTasksExpanded && (
                <div
                  className="mt-1 rounded-xl px-2.5 py-2 border border-white/15 shadow-lg text-[11px] space-y-1 max-h-[120px] overflow-y-auto"
                  style={{ backgroundColor: 'rgba(10, 15, 28, 0.94)' }}
                >
                  {isVondo && (
                    <div className="text-[10px] font-bold text-rose-300 pb-0.5 border-b border-slate-800">
                      ভুয়া কাজের তালিকা (দলের অগ্রগতি ০%)
                    </div>
                  )}
                  {localPlayer.tasks.map((t) => {
                    const st = TASK_STATIONS.find((s) => s.id === t.taskId);
                    if (!st) return null;
                    return (
                      <div
                        key={t.taskId}
                        className={`flex items-center justify-between gap-2 ${
                          t.completed
                            ? 'text-emerald-400 line-through opacity-75'
                            : 'text-slate-100 font-medium'
                        }`}
                      >
                        <span className="truncate">{st.title}</span>
                        <span className="text-[10px] text-slate-300 shrink-0">{st.zoneName}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl px-3 py-2 border border-white/10 bg-slate-950/88 shadow-lg text-[11px] space-y-1">
              {isVondo && (
                <div className="text-[10.5px] font-bold text-rose-300 pb-1 border-b border-white/10">
                  ভুয়া কাজের তালিকা (দলের অগ্রগতি ০%)
                </div>
              )}
              {localPlayer.tasks.map((t) => {
                const st = TASK_STATIONS.find((s) => s.id === t.taskId);
                if (!st) return null;
                return (
                  <div
                    key={t.taskId}
                    className={`flex items-center justify-between gap-2 ${
                      t.completed ? 'text-emerald-400 line-through opacity-65' : 'text-slate-100 font-medium'
                    }`}
                  >
                    <span className="truncate">{st.title}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">{st.zoneName}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Active Sabotage Alert */}
          {snapshot.sabotage.active && (
            <div
              role="alert"
              className={`rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 border text-[11px] sm:text-xs font-bold flex flex-col gap-1 ${
                isCriticalSabotage(snapshot.sabotage.active)
                  ? 'border-rose-400 text-rose-100 animate-pulse'
                  : snapshot.sabotage.active === 'loadshedding'
                    ? 'border-amber-400/60 text-amber-100'
                    : 'border-indigo-400/60 text-indigo-100'
              }`}
              style={{
                backgroundColor: isCriticalSabotage(snapshot.sabotage.active)
                  ? 'rgba(153, 27, 27, 0.94)'
                  : 'rgba(30, 41, 59, 0.92)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 truncate">
                  <Zap className="w-4 h-4 text-amber-300 shrink-0" />
                  {snapshot.sabotage.active === 'gas_leak' ? (
                    <span>জরুরি: গ্যাস লিক! ২টি ভালভ চেপে ধরো!</span>
                  ) : snapshot.sabotage.active === 'loadshedding' ? (
                    <span>লোডশেডিং! ডেসকোতে E ৩সে. চেপে ধরো (অটো {Math.ceil(snapshot.sabotage.timeRemaining)}সে.)</span>
                  ) : (
                    <span>ওয়াই-ফাই নেই! ডিশে E ৩সে. চেপে ধরো (অটো {Math.ceil(snapshot.sabotage.timeRemaining)}সে.)</span>
                  )}
                </span>
                {isCriticalSabotage(snapshot.sabotage.active) && (
                  <span className="font-mono-tabular text-amber-300 shrink-0 text-sm">
                    {Math.ceil(snapshot.sabotage.timeRemaining)}সে.
                  </span>
                )}
              </div>
              {snapshot.sabotage.active === 'gas_leak' && (
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono-tabular text-amber-200">
                  {snapshot.sabotage.valves.map((v) => (
                    <span
                      key={v.id}
                      className={`px-1.5 py-0.5 rounded ${
                        v.holderId ? 'bg-emerald-600/80 text-white' : 'bg-slate-900/70 text-rose-200'
                      }`}
                    >
                      {v.id === 'valve_cha' ? 'চায়ের দোকান' : 'গ্যারেজ'}: {v.holderId ? 'ধরা' : 'খোলা'}
                    </span>
                  ))}
                  {snapshot.sabotage.fixProgress > 0 && (
                    <span className="text-emerald-300">
                      {Math.round(snapshot.sabotage.fixProgress * 100)}%
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {anyDoorLocked && (
            <div
              className="rounded-xl px-3 py-1.5 border border-amber-400/50 text-[11px] font-bold text-amber-200 flex items-center gap-1.5"
              style={{ backgroundColor: 'rgba(120, 53, 15, 0.9)' }}
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              শাটার নামানো হয়েছে!
            </div>
          )}

          {commsJammed && (
            <div
              className="rounded-xl px-3 py-1.5 border border-rose-400/50 text-[11px] font-bold text-rose-200 flex items-center gap-1.5"
              style={{ backgroundColor: 'rgba(127, 29, 29, 0.88)' }}
            >
              <Radio className="w-3.5 h-3.5 shrink-0" />
              দালাল যোগাযোগ জ্যাম করেছে! (অ্যাডমিন/ভাইটালস বন্ধ)
            </div>
          )}
        </div>
        </div>

        {/* Top-Center PUBG Bearing Compass Strip (auto-sized flex center slot -> zero overlap) */}
        {!clueNotice && viewport.w >= 540 && (
          <div className="flex-1 min-w-0 flex justify-center pt-0.5 pointer-events-none">
            <PubgCompassStripLive
              initialYaw={compassYaw}
              subscribeCompassYaw={subscribeCompassYaw}
              compact={isLandscapeCompact || viewport.w < 960}
            />
          </div>
        )}

        {/* Top-Right Cluster: Compact Tactical Quick Bar + Settings Popover */}
        <div className="relative flex flex-col items-end gap-1.5 sm:gap-2 shrink-0">
          <div className="pointer-events-auto flex items-center justify-end gap-1.5 rounded-2xl p-1 bg-slate-950/88 border border-white/12 shadow-lg">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenTacticalMap();
              }}
              aria-label="সম্পূর্ণ ম্যাপ খোলো [Tab]"
              title="মহল্লার ম্যাপ [Tab]"
              className={`${
                isLandscapeCompact ? 'w-8 h-8' : 'w-9 h-9 sm:w-10 sm:h-10 xl:w-auto xl:px-2.5'
              } rounded-xl border border-white/10 bg-slate-900/75 hover:bg-slate-800 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-amber-300 transition-colors`}
            >
              <MapIcon className="w-4 h-4" />
              {!isLandscapeCompact && <span className="hidden xl:inline">ম্যাপ</span>}
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                setShowSettingsMenu(false);
                setShowMemeDrawer((v) => !v);
              }}
              aria-label="মিম ও ভয়েস প্যাক [1-9, 0, -]"
              aria-expanded={showMemeDrawer}
              title="বাংলা মিম ও ভয়েস প্যাক [1-9, 0, -]"
              className={`${
                isLandscapeCompact ? 'w-8 h-8' : 'w-9 h-9 sm:w-10 sm:h-10 xl:w-auto xl:px-2.5'
              } rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors ${
                showMemeDrawer
                  ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                  : 'bg-slate-900/75 border-white/10 text-amber-200 hover:bg-slate-800 hover:text-amber-100'
              }`}
            >
              <Smile className="w-4 h-4" />
              {!isLandscapeCompact && <span className="hidden xl:inline">ভয়েস</span>}
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              aria-label={muted ? 'সাউন্ড চালু করো [M]' : 'সাউন্ড মিউট করো [M]'}
              title="সব সাউন্ড মিউট [M]"
              className={`${
                isLandscapeCompact ? 'w-8 h-8' : 'w-9 h-9 sm:w-10 sm:h-10'
              } rounded-xl border border-white/10 bg-slate-900/75 hover:bg-slate-800 flex items-center justify-center text-slate-200 hover:text-white transition-colors`}
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                setShowMemeDrawer(false);
                setShowSettingsMenu((v) => !v);
              }}
              aria-label="কন্ট্রোল ও সেটিংস"
              aria-expanded={showSettingsMenu}
              title="কন্ট্রোল, ক্যামেরা ও গাইড"
              className={`${
                isLandscapeCompact ? 'w-8 h-8' : 'w-9 h-9 sm:w-10 sm:h-10'
              } rounded-xl border flex items-center justify-center transition-colors ${
                showSettingsMenu
                  ? 'bg-sky-400/20 border-sky-400 text-sky-300'
                  : 'bg-slate-900/75 border-white/10 text-slate-200 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              aria-label="গেম বিরতি [P]"
              title="বিরতি [P]"
              className={`${
                isLandscapeCompact ? 'w-8 h-8' : 'w-9 h-9 sm:w-10 sm:h-10'
              } rounded-xl border border-white/10 bg-slate-900/75 hover:bg-rose-500/25 hover:border-rose-400/50 flex items-center justify-center text-slate-200 hover:text-white transition-colors`}
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>

          {showSettingsMenu && (
            <div
              role="region"
              aria-label="সেটিংস ও দ্রুত নিয়ন্ত্রণ"
              className="pointer-events-auto rounded-xl p-2 border border-white/15 bg-slate-950/94 shadow-2xl w-[224px] space-y-1 text-xs"
            >
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  void toggleFullscreenMode(true);
                }}
                className="w-full px-2.5 py-2 rounded-lg hover:bg-slate-800/90 flex items-center justify-between text-slate-200 font-semibold"
              >
                <span className="flex items-center gap-2">
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-emerald-300" /> : <Maximize2 className="w-3.5 h-3.5 text-amber-300" />}
                  {isFullscreen ? 'ফুলস্ক্রিন বন্ধ' : 'ফুলস্ক্রিন মোড'}
                </span>
              </button>
              {!isMobileHud && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onTogglePointerLook();
                  }}
                  className="w-full px-2.5 py-2 rounded-lg hover:bg-slate-800/90 flex items-center justify-between text-slate-200 font-semibold"
                >
                  <span className="flex items-center gap-2">
                    <Crosshair className={`w-3.5 h-3.5 ${pointerLookEnabled ? 'text-amber-300' : 'text-slate-400'}`} />
                    মাউস লুক {pointerLookEnabled ? '(চালু)' : ''}
                  </span>
                  <kbd className="text-[10px] font-mono-tabular text-slate-400">[C]</kbd>
                </button>
              )}
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onResetCamera();
                  setShowSettingsMenu(false);
                }}
                className="w-full px-2.5 py-2 rounded-lg hover:bg-slate-800/90 flex items-center justify-between text-slate-200 font-semibold"
              >
                <span className="flex items-center gap-2">
                  <RotateCcw className="w-3.5 h-3.5 text-sky-300" />
                  ক্যামেরা রিসেট
                </span>
                <kbd className="text-[10px] font-mono-tabular text-slate-400">[Y]</kbd>
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleTouchControls();
                }}
                className="w-full px-2.5 py-2 rounded-lg hover:bg-slate-800/90 flex items-center justify-between text-slate-200 font-semibold"
              >
                <span className="flex items-center gap-2">
                  <Gamepad2 className={`w-3.5 h-3.5 ${touchControlsEnabled ? 'text-amber-300' : 'text-slate-400'}`} />
                  টাচ জয়স্টিক {touchControlsEnabled ? '(চালু)' : '(বন্ধ)'}
                </span>
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  soundEngine.toggleBgm();
                }}
                className="w-full px-2.5 py-2 rounded-lg hover:bg-slate-800/90 flex items-center justify-between text-slate-200 font-semibold"
              >
                <span className="flex items-center gap-2">
                  <Music className={`w-3.5 h-3.5 ${bgmEnabled ? 'text-emerald-300' : 'text-slate-500'}`} />
                  আবহ সংগীত {bgmEnabled ? '(চালু)' : '(বন্ধ)'}
                </span>
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setShowSettingsMenu(false);
                  onOpenGuide();
                }}
                className="w-full px-2.5 py-2 rounded-lg hover:bg-slate-800/90 flex items-center justify-between text-amber-200 font-semibold"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-300" />
                  নিয়ম ও চরিত্র গাইড
                </span>
                <kbd className="text-[10px] font-mono-tabular text-slate-400">[H]</kbd>
              </button>
            </div>
          )}

          {showMemeDrawer && (
            <div
              role="region"
              aria-label="বাংলা মিম ও ভয়েস প্যাক"
              className="pointer-events-auto rounded-xl p-2.5 border border-amber-400/40 shadow-2xl space-y-2 w-[235px] sm:w-[396px] max-h-[65vh] overflow-y-auto"
              style={{ backgroundColor: 'rgba(12, 18, 30, 0.96)' }}
            >
              <div>
                <div className="text-[10px] font-bold tracking-wider text-emerald-300 mb-1 px-0.5">
                  ভয়েস প্যাক (কুইক মেসেজ)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {quickMemes
                    .filter((m) => m.isVoicePack)
                    .map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.currentTarget.blur();
                          onPlayMeme(m.id);
                        }}
                        className="px-2.5 py-2 rounded-lg bg-emerald-950/75 hover:bg-emerald-400 hover:text-slate-950 border border-emerald-500/35 text-[11px] font-bold text-emerald-200 text-left flex items-center justify-between gap-2 transition-colors"
                      >
                        <span className="truncate">{m.label}</span>
                        <span className="font-mono-tabular text-[10px] opacity-75 shrink-0">[{m.shortKey}]</span>
                      </button>
                    ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-wider text-amber-300/90 mb-1 px-0.5">
                  সাউন্ড এফেক্ট
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {quickMemes
                    .filter((m) => !m.isVoicePack)
                    .map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.currentTarget.blur();
                          onPlayMeme(m.id);
                        }}
                        className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-[11px] font-bold text-amber-200 text-left flex items-center justify-between gap-2 transition-colors"
                      >
                        <span className="truncate">{m.label}</span>
                        <span className="font-mono-tabular text-[10px] opacity-75 shrink-0">[{m.shortKey}]</span>
                      </button>
                    ))}
                </div>
              </div>
              {onOpenMemePack && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setShowMemeDrawer(false);
                    onOpenMemePack();
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-amber-400/15 hover:bg-amber-400 hover:text-slate-950 border border-amber-400/40 text-[11px] font-bold text-amber-300 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Music2 className="w-3.5 h-3.5" />
                  নিজের মিম অডিও আপলোড ও সেট করো
                </button>
              )}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Top-Center Clue / Ability Toast */}
      {clueNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-30 max-w-md w-[90vw] rounded-xl px-4 py-2.5 border border-cyan-400/50 shadow-2xl text-center"
          style={{ backgroundColor: 'rgba(10, 18, 32, 0.94)' }}
        >
          <div className="text-xs font-display font-bold text-cyan-300">{clueNotice.title}</div>
          <div className="text-[11px] sm:text-xs text-slate-100 mt-0.5">{clueNotice.detail}</div>
        </div>
      )}

      {/* Bottom Row: Compact Hint Strip / Speedometer + PUBG/Free Fire Circular Tactical Controls */}
      <div className="flex items-end justify-between gap-2 sm:gap-4">
        {drivingVehicle ? (
          <div className="pointer-events-none flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border border-amber-400/50 bg-slate-950/92 shadow-2xl">
            <Gauge className="w-5 h-5 text-amber-300 shrink-0" />
            <div className="leading-none">
              <div className="font-mono-tabular text-lg sm:text-xl font-black text-white">
                {Math.round(driveSpeedMs * 3.6)} <span className="text-[11px] font-bold text-amber-300">km/h</span>
              </div>
              <div className="text-[10px] font-semibold text-slate-300 mt-0.5">
                {VEHICLE_SPECS[drivingVehicle.kind].banglaName}
                {!isMobileHud && ' · Shift গতি · Space ব্রেক · K হর্ন · F নামো'}
              </div>
            </div>
          </div>
        ) : !isMobileHud ? (
          <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-300/90 px-3 py-1.5 rounded-full border border-white/10 bg-slate-950/85 whitespace-nowrap shadow">
            <span>WASD হাঁটা</span>
            <span className="text-slate-500">·</span>
            <span>Space লাফ</span>
            <span className="text-slate-500">·</span>
            <span>Shift দৌড়</span>
            <span className="text-slate-500">·</span>
            <span>E কাজ</span>
            <span className="text-slate-500">·</span>
            <span>R রিপোর্ট</span>
            <span className="text-slate-500">·</span>
            <span>F {nearbyVehicle ? 'গাড়ি/' : ''}সালিশ</span>
          </div>
        ) : null}

        <div
          className={`flex flex-col items-end gap-2.5 ml-auto ${
            isMobileHud ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
        >
          {localPlayer.inVent && (
            <div
              className="pointer-events-auto rounded-xl p-2.5 border border-emerald-500/40 flex flex-wrap items-center justify-end gap-2"
              style={{ backgroundColor: 'rgba(12, 18, 30, 0.94)' }}
            >
              <span className="text-xs font-bold text-emerald-300 mr-1">
                {ventGraph.currentVent ? `${ventGraph.currentVent.label}-এর ভেতরে:` : 'গোপন ড্রেন:'}
              </span>
              {ventGraph.targets.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onVentToggle(v.id)}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-xs font-semibold text-white"
                >
                  → {v.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onVentToggle()}
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 text-xs font-bold"
              >
                বাইরে এসো! [V]
              </button>
            </div>
          )}

          {showSabotageMenu && isVondo && (
            <div
              className="pointer-events-auto rounded-xl p-3 border border-rose-500/40 flex flex-col gap-2 shadow-2xl"
              style={{ backgroundColor: 'rgba(12, 18, 30, 0.95)' }}
            >
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={Boolean(snapshot.sabotage.active) || snapshot.sabotage.cooldownRemaining > 0}
                  onClick={() => {
                    onSabotage('gas_leak');
                    setShowSabotageMenu(false);
                  }}
                  className="min-h-[40px] px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-xs font-bold text-white"
                >
                  গ্যাস লিক! (জরুরি ৪৫সে.)
                </button>
                <button
                  type="button"
                  disabled={Boolean(snapshot.sabotage.active) || snapshot.sabotage.cooldownRemaining > 0}
                  onClick={() => {
                    onSabotage('loadshedding');
                    setShowSabotageMenu(false);
                  }}
                  className="min-h-[40px] px-3 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-xs font-bold text-white"
                >
                  লোডশেডিং দাও! (৯০সে. অন্ধকার)
                </button>
                <button
                  type="button"
                  disabled={Boolean(snapshot.sabotage.active) || snapshot.sabotage.cooldownRemaining > 0}
                  onClick={() => {
                    onSabotage('wifi_down');
                    setShowSabotageMenu(false);
                  }}
                  className="min-h-[40px] px-3 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-xs font-bold text-white"
                >
                  ওয়াই-ফাই লাইন কাটো!
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-semibold text-amber-300 flex items-center gap-1 mr-1">
                  <Lock className="w-3 h-3" />
                  শাটার নামাও{snapshot.doorLocks.cooldownRemaining > 0 ? ` (${Math.ceil(snapshot.doorLocks.cooldownRemaining)}সে.)` : ':'}
                </span>
                {DOOR_OPTIONS.map((d) => (
                  <button
                    key={d.zoneId}
                    type="button"
                    disabled={snapshot.doorLocks.cooldownRemaining > 0}
                    onClick={() => {
                      onLockDoors(d.zoneId);
                      setShowSabotageMenu(false);
                    }}
                    className="min-h-[36px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-600 disabled:opacity-40 text-[11px] font-semibold text-white"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showDisguiseMenu && localPlayer.specialRole === 'bohurupi' && !localPlayer.disguiseColor && (
            <div
              className="pointer-events-auto rounded-xl p-2.5 border border-rose-500/40 flex flex-wrap items-center justify-end gap-1.5 max-w-md shadow-2xl"
              style={{ backgroundColor: 'rgba(12, 18, 30, 0.95)' }}
            >
              <span className="text-[11px] font-bold text-rose-300 mr-1">ছদ্মবেশ বাছো:</span>
              {disguiseTargets.map((target) => {
                const c = PLAYER_COLORS.find((col) => col.id === target.color) ?? PLAYER_COLORS[0];
                return (
                  <button
                    key={target.id}
                    type="button"
                    onClick={() => {
                      onUseAbility(target.id);
                      setShowDisguiseMenu(false);
                    }}
                    className="min-h-[36px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-700 text-xs font-semibold text-white flex items-center gap-1.5"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.hex }} />
                    {target.name}
                  </button>
                );
              })}
            </div>
          )}

          {(() => {
            const abilitySlot: TacticalActionSlot | null = (() => {
              if (!localPlayer.alive) {
                return {
                  id: 'prank',
                  label: 'মজা',
                  hotkey: 'G',
                  subLabel: `${localPlayer.pranksLeft ?? 0}বার`,
                  icon: <Sparkles className={isMobileHud ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />,
                  accentHex: '#38bdf8',
                  bgClass: 'bg-sky-500/85 border-2 border-sky-200/80 text-slate-950',
                  disabled: (localPlayer.pranksLeft ?? 0) <= 0,
                  onClick: () => onUseAbility(),
                };
              }
              switch (localPlayer.specialRole) {
                case 'goyenda':
                  return {
                    id: 'goyenda',
                    label: inspectableBody ? 'স্ক্যান' : 'সূত্র',
                    hotkey: 'G',
                    subLabel: `${localPlayer.scansLeft ?? 2}বার`,
                    icon: <Search className={isMobileHud ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />,
                    accentHex: '#22d3ee',
                    bgClass: 'bg-cyan-500/88 border-2 border-cyan-200/80 text-slate-950',
                    disabled: !inspectableBody || (localPlayer.scansLeft ?? 2) <= 0,
                    onClick: () => onUseAbility(),
                  };
                case 'kobiraj': {
                  const cd = localPlayer.abilityCooldown;
                  return {
                    id: 'kobiraj',
                    label: 'তাবিজ',
                    hotkey: 'G',
                    subLabel: cd > 0.05 ? `${Math.ceil(cd)}সে.` : shieldTarget ? shieldTarget.name : 'নিজে',
                    icon: <Shield className={isMobileHud ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />,
                    accentHex: '#34d399',
                    bgClass: 'bg-emerald-500/88 border-2 border-emerald-200/80 text-slate-950',
                    disabled: cd > 0.05,
                    progress01: cd > 0.05 ? Math.min(1, cd / 25) : 1,
                    onClick: () => onUseAbility(),
                  };
                }
                case 'daroga': {
                  const cd = localPlayer.abilityCooldown;
                  return {
                    id: 'daroga',
                    label: 'গ্রেপ্তার',
                    hotkey: 'G',
                    subLabel:
                      (localPlayer.shotsLeft ?? 1) <= 0
                        ? 'শেষ'
                        : cd > 0.05
                          ? `${Math.ceil(cd)}সে.`
                          : darogaTarget?.name ?? 'গুলি',
                    icon: <Gavel className={isMobileHud ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />,
                    accentHex: '#fb923c',
                    bgClass: 'bg-orange-500/88 border-2 border-orange-200/80 text-slate-950',
                    disabled: (localPlayer.shotsLeft ?? 1) <= 0 || !darogaTarget || cd > 0.05,
                    progress01: cd > 0.05 ? Math.min(1, cd / 20) : 1,
                    onClick: () => darogaTarget && onUseAbility(darogaTarget.id),
                  };
                }
                case 'daktar':
                  return {
                    id: 'daktar',
                    label: 'বাঁচাও',
                    hotkey: 'G',
                    subLabel:
                      (localPlayer.revivesLeft ?? 0) <= 0
                        ? 'শেষ'
                        : revivableBody?.victimName ?? `${localPlayer.revivesLeft ?? 0}বার`,
                    icon: <HeartPulse className={isMobileHud ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />,
                    accentHex: '#2dd4bf',
                    bgClass: 'bg-teal-400/90 border-2 border-teal-100/80 text-slate-950',
                    disabled: !revivableBody || (localPlayer.revivesLeft ?? 0) <= 0,
                    onClick: () => revivableBody && onUseAbility(revivableBody.id),
                  };
                case 'jharudar': {
                  const cd = localPlayer.abilityCooldown;
                  return {
                    id: 'jharudar',
                    label: 'সাফাই',
                    hotkey: 'G',
                    subLabel: localPlayer.jharuTargetBodyId
                      ? `${(localPlayer.jharuTimer ?? 0).toFixed(1)}সে.`
                      : cd > 0.05
                        ? `${Math.ceil(cd)}সে.`
                        : cleanableBody?.victimName ?? `${localPlayer.cleansLeft ?? 3}বার`,
                    icon: <Sparkle className={isMobileHud ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />,
                    accentHex: '#fb7185',
                    bgClass: 'bg-slate-950/88 border-2 border-rose-400/65 text-rose-200',
                    disabled:
                      Boolean(localPlayer.jharuTargetBodyId) ||
                      (localPlayer.cleansLeft ?? 3) <= 0 ||
                      !cleanableBody ||
                      cd > 0.05,
                    progress01: cd > 0.05 ? Math.min(1, cd / 18) : 1,
                    onClick: () => cleanableBody && onUseAbility(cleanableBody.id),
                  };
                }
                case 'bohurupi': {
                  const cd = localPlayer.abilityCooldown;
                  return {
                    id: 'bohurupi',
                    label: localPlayer.disguiseColor ? 'আসল' : 'ছদ্মবেশ',
                    hotkey: 'G',
                    subLabel: localPlayer.disguiseColor
                      ? `${Math.ceil(localPlayer.disguiseTimer)}সে.`
                      : cd > 0.05
                        ? `${Math.ceil(cd)}সে.`
                        : 'রূপ',
                    icon: <Sparkles className={isMobileHud ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />,
                    accentHex: '#e879f9',
                    bgClass: 'bg-fuchsia-900/88 border-2 border-fuchsia-300/70 text-fuchsia-100',
                    disabled: !localPlayer.disguiseColor && cd > 0.05,
                    progress01: cd > 0.05 ? Math.min(1, cd / 25) : 1,
                    onClick: () => {
                      if (localPlayer.disguiseColor) {
                        onUseAbility();
                        setShowDisguiseMenu(false);
                      } else {
                        setShowDisguiseMenu((s) => !s);
                      }
                    },
                  };
                }
                case 'ghotok_khala':
                  return {
                    id: 'ghotok',
                    label: 'বন্ধন',
                    hotkey: 'G',
                    subLabel: snapshot.ghotokLinkedIds ? 'সেট ✓' : ghotokPair?.[0].name,
                    icon: <Heart className={isMobileHud ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />,
                    accentHex: '#f472b6',
                    bgClass: 'bg-pink-500/88 border-2 border-pink-100/80 text-slate-950',
                    disabled: Boolean(snapshot.ghotokLinkedIds) || !ghotokPair,
                    onClick: () => onUseAbility(),
                  };
                case 'master_moshai': {
                  const cd = localPlayer.abilityCooldown;
                  return {
                    id: 'master',
                    label: 'খাতা',
                    hotkey: 'G',
                    subLabel: cd > 0.05 ? `${Math.ceil(cd)}সে.` : masterTarget?.name,
                    icon: <BookOpen className={isMobileHud ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />,
                    accentHex: '#60a5fa',
                    bgClass: 'bg-blue-500/88 border-2 border-blue-200/80 text-slate-950',
                    disabled: !masterTarget || cd > 0.05,
                    progress01: cd > 0.05 ? Math.min(1, cd / 24) : 1,
                    onClick: () => masterTarget && onUseAbility(masterTarget.id),
                  };
                }
                case 'cctv_kaku': {
                  const cd = localPlayer.abilityCooldown;
                  return {
                    id: 'cctv_kaku',
                    label: 'সিসিটিভি',
                    hotkey: 'G',
                    subLabel: cd > 0.05 ? `${Math.ceil(cd)}সে.` : 'ক্যামেরা',
                    icon: <Video className={isMobileHud ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />,
                    accentHex: '#fb923c',
                    bgClass: 'bg-orange-400/90 border-2 border-orange-100/80 text-slate-950',
                    disabled: cd > 0.05 || localPlayer.inVent,
                    progress01: cd > 0.05 ? Math.min(1, cd / 18) : 1,
                    onClick: () => {
                      onUseAbility();
                      onOpenStation('cams');
                    },
                  };
                }
                case 'hatur_daktar': {
                  const cd = localPlayer.abilityCooldown;
                  return {
                    id: 'hatur',
                    label: 'ইনজেকশন',
                    hotkey: 'G',
                    subLabel: cd > 0.05 ? `${Math.ceil(cd)}সে.` : haturTarget?.name ?? 'নিজে',
                    icon: <HeartPulse className={isMobileHud ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />,
                    accentHex: '#a3e635',
                    bgClass: 'bg-lime-400/90 border-2 border-lime-100/80 text-slate-950',
                    disabled: cd > 0.05,
                    progress01: cd > 0.05 ? Math.min(1, cd / 22) : 1,
                    onClick: () => onUseAbility(haturTarget?.id),
                  };
                }
                case 'supari_killer': {
                  const cd = localPlayer.abilityCooldown;
                  return {
                    id: 'supari',
                    label: 'সুপারি',
                    hotkey: 'G',
                    subLabel: cd > 0.05 ? `${Math.ceil(cd)}সে.` : supariTarget?.name ?? 'টার্গেট',
                    icon: <Crosshair className={isMobileHud ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />,
                    accentHex: '#f87171',
                    bgClass: 'bg-red-900/88 border-2 border-red-300/70 text-red-100',
                    disabled: cd > 0.05,
                    progress01: cd > 0.05 ? Math.min(1, cd / 20) : 1,
                    onClick: () => onUseAbility(),
                  };
                }
                case 'dalal': {
                  const cd = localPlayer.abilityCooldown;
                  return {
                    id: 'dalal',
                    label: 'জ্যাম',
                    hotkey: 'G',
                    subLabel: cd > 0.05 ? `${Math.ceil(cd)}সে.` : 'নেট',
                    icon: <Radio className={isMobileHud ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />,
                    accentHex: '#fb7185',
                    bgClass: 'bg-rose-900/88 border-2 border-rose-300/70 text-rose-100',
                    disabled: cd > 0.05,
                    progress01: cd > 0.05 ? Math.min(1, cd / 28) : 1,
                    onClick: () => onUseAbility(),
                  };
                }
                case 'chamcha': {
                  const cd = localPlayer.abilityCooldown;
                  return {
                    id: 'chamcha',
                    label: 'বস',
                    hotkey: 'G',
                    subLabel: cd > 0.05 ? `${Math.ceil(cd)}সে.` : chamchaTarget?.name,
                    icon: <UserCheck className={isMobileHud ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />,
                    accentHex: '#c084fc',
                    bgClass: 'bg-purple-600/88 border-2 border-purple-200/80 text-white',
                    disabled: !chamchaTarget || cd > 0.05,
                    progress01: cd > 0.05 ? Math.min(1, cd / 10) : 1,
                    onClick: () => chamchaTarget && onUseAbility(chamchaTarget.id),
                  };
                }
                case 'chandabaz': {
                  const cd = localPlayer.abilityCooldown;
                  return {
                    id: 'chandabaz',
                    label: 'চাঁদা',
                    hotkey: 'G',
                    subLabel:
                      cd > 0.05
                        ? `${Math.ceil(cd)}সে.`
                        : chandabazTarget?.name ?? `${chandabazAliveCount}/${chandabazGoal}`,
                    icon: <DollarSign className={isMobileHud ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />,
                    accentHex: '#fbbf24',
                    bgClass: 'bg-amber-400/92 border-2 border-amber-100/85 text-slate-950',
                    disabled: !chandabazTarget || cd > 0.05,
                    progress01: cd > 0.05 ? Math.min(1, cd / CHANDABAZ_COOLDOWN_SEC) : 1,
                    onClick: () => chandabazTarget && onUseAbility(chandabazTarget.id),
                  };
                }
                case 'tiktok_star': {
                  const cd = localPlayer.abilityCooldown;
                  const filmedHere = Boolean(currentZoneId && localPlayer.tiktokZones?.includes(currentZoneId));
                  return {
                    id: 'tiktok',
                    label: filmedHere ? 'শেষ' : 'রিল',
                    hotkey: 'G',
                    subLabel: cd > 0.05 ? `${Math.ceil(cd)}সে.` : `${localPlayer.tiktokZones?.length ?? 0}/৩`,
                    icon: <Camera className={isMobileHud ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />,
                    accentHex: '#f472b6',
                    bgClass: 'bg-pink-500/88 border-2 border-pink-100/80 text-white',
                    disabled: !currentZoneId || cd > 0.05 || filmedHere,
                    progress01: cd > 0.05 ? Math.min(1, cd / 16) : 1,
                    onClick: () => onUseAbility(),
                  };
                }
                default:
                  return null;
              }
            })();

            const interactSlot: TacticalActionSlot | null = nearSabotageFix
              ? {
                  id: 'fix',
                  label: nearGasValve ? 'ভালভ' : 'মেরামত',
                  hotkey: 'E',
                  subLabel: `${Math.round(snapshot.sabotage.fixProgress * 100)}%`,
                  icon: <Wrench className={isMobileHud ? 'w-5 h-5' : 'w-6 h-6'} />,
                  accentHex: '#fde047',
                  bgClass: 'bg-amber-400/95 border-2 border-amber-100 text-slate-950',
                  progress01: snapshot.sabotage.fixProgress,
                  pulse: true,
                  onHold: (holding) => onFixSabotageHold(holding, nearGasValve?.id),
                }
              : nearbyTask
                ? {
                    id: 'task',
                    label: nearbyTaskLocked ? 'নেট নেই' : isVondo ? 'ভুয়া' : 'কাজ',
                    hotkey: nearbyTaskLocked ? undefined : 'E',
                    subLabel: nearbyTask.zoneName,
                    icon: <Wrench className={isMobileHud ? 'w-5 h-5' : 'w-6 h-6'} />,
                    accentHex: '#fbbf24',
                    bgClass: nearbyTaskLocked
                      ? 'bg-indigo-950/90 border-2 border-indigo-400/50 text-indigo-200'
                      : 'bg-amber-400/95 border-2 border-amber-100 text-slate-950',
                    disabled: nearbyTaskLocked,
                    pulse: !nearbyTaskLocked,
                    onClick: () => !nearbyTaskLocked && onOpenTask(nearbyTask.id),
                  }
                : nearCams
                  ? {
                      id: 'cams',
                      label: 'সিসিটিভি',
                      hotkey: 'E',
                      icon: <Video className={isMobileHud ? 'w-5 h-5' : 'w-6 h-6'} />,
                      accentHex: '#fb7185',
                      bgClass: 'bg-rose-600/92 border-2 border-rose-200/80 text-white',
                      onClick: () => onOpenStation('cams'),
                    }
                  : nearAdmin
                    ? {
                        id: 'admin',
                        label: 'অ্যাডমিন',
                        hotkey: 'E',
                        icon: <Radar className={isMobileHud ? 'w-5 h-5' : 'w-6 h-6'} />,
                        accentHex: '#38bdf8',
                        bgClass: 'bg-sky-500/92 border-2 border-sky-200/80 text-slate-950',
                        onClick: () => onOpenStation('admin'),
                      }
                    : nearVitals
                      ? {
                          id: 'vitals',
                          label: 'ভাইটালস',
                          hotkey: 'E',
                          icon: <Activity className={isMobileHud ? 'w-5 h-5' : 'w-6 h-6'} />,
                          accentHex: '#34d399',
                          bgClass: 'bg-emerald-500/92 border-2 border-emerald-200/80 text-slate-950',
                          onClick: () => onOpenStation('vitals'),
                        }
                      : null;

            const heroSlot: TacticalActionSlot =
              isVondo && localPlayer.alive
                ? {
                    id: 'kill',
                    label: 'ঘায়েল',
                    hotkey: 'Q',
                    subLabel:
                      localPlayer.killCooldownRemaining > 0.05
                        ? `${Math.ceil(localPlayer.killCooldownRemaining)}সে.`
                        : killTarget?.name ?? 'কাছে যাও',
                    icon: <Skull className={isMobileHud ? 'w-5 h-5' : 'w-6 h-6'} />,
                    accentHex: '#fb7185',
                    bgClass:
                      killTarget && localPlayer.killCooldownRemaining <= 0.05
                        ? 'bg-rose-600/95 border-2 border-rose-200 text-white shadow-[0_0_24px_rgba(244,63,94,0.6)]'
                        : 'bg-slate-950/88 border-2 border-rose-500/50 text-rose-200',
                    disabled: !killTarget || localPlayer.killCooldownRemaining > 0.05,
                    progress01:
                      localPlayer.killCooldownRemaining > 0.05
                        ? Math.min(
                            1,
                            localPlayer.killCooldownRemaining / Math.max(10, snapshot.settings.killCooldownSec),
                          )
                        : 1,
                    pulse: Boolean(killTarget && localPlayer.killCooldownRemaining <= 0.05),
                    onClick: () => killTarget && onKill(killTarget.id),
                  }
                : interactSlot ?? {
                    id: 'use_idle',
                    label: 'ব্যবহার',
                    hotkey: 'E',
                    icon: <Wrench className={isMobileHud ? 'w-5 h-5' : 'w-6 h-6'} />,
                    accentHex: '#64748b',
                    bgClass: 'bg-slate-950/78 border-2 border-white/15 text-slate-400',
                    disabled: true,
                  };

            const arcQueue: TacticalActionSlot[] = [];
            if (isVondo && localPlayer.alive && interactSlot) {
              arcQueue.push(interactSlot);
            }
            if (nearbyBody) {
              arcQueue.push({
                id: 'report',
                label: 'রিপোর্ট',
                hotkey: 'R',
                subLabel: nearbyBody.victimName,
                icon: <Bell className={isMobileHud ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />,
                accentHex: '#fed7aa',
                bgClass: 'bg-orange-500/95 border-2 border-orange-100 text-slate-950',
                pulse: true,
                onClick: () => onReportBody(nearbyBody.id),
              });
            }
            if (abilitySlot) {
              arcQueue.push(abilitySlot);
            }
            if (drivingVehicle && onToggleVehicle) {
              arcQueue.push({
                id: 'vehicle_exit',
                label: 'নামো',
                hotkey: 'F',
                subLabel: VEHICLE_SPECS[drivingVehicle.kind].banglaName,
                icon: <Car className={isMobileHud ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />,
                accentHex: '#fbbf24',
                bgClass: 'bg-amber-400/95 border-2 border-amber-100 text-slate-950',
                onClick: () => onToggleVehicle(),
              });
              if (onVehicleHorn) {
                arcQueue.push({
                  id: 'vehicle_horn',
                  label: 'হর্ন',
                  hotkey: 'K',
                  icon: <Volume2 className={isMobileHud ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />,
                  accentHex: '#38bdf8',
                  bgClass: 'bg-sky-500/92 border-2 border-sky-100 text-slate-950',
                  onClick: onVehicleHorn,
                });
              }
            } else if (nearbyVehicle && onToggleVehicle) {
              arcQueue.push({
                id: 'vehicle_enter',
                label: 'গাড়ি',
                hotkey: 'F',
                subLabel: VEHICLE_SPECS[nearbyVehicle.kind].banglaName,
                icon: <Car className={isMobileHud ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />,
                accentHex: '#fbbf24',
                bgClass: 'bg-amber-400/95 border-2 border-amber-100 text-slate-950',
                pulse: true,
                onClick: () => onToggleVehicle(nearbyVehicle.id),
              });
            }
            if (nearBell) {
              arcQueue.push({
                id: 'bell',
                label: 'সালিশ',
                hotkey: 'F',
                subLabel:
                  localPlayer.emergencyMeetingsLeft <= 0
                    ? '০বার'
                    : emergencyCd > 0
                      ? `${emergencyCd}সে.`
                      : `${localPlayer.emergencyMeetingsLeft}বার`,
                icon: <Bell className={isMobileHud ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />,
                accentHex: '#7dd3fc',
                bgClass: 'bg-sky-500/92 border-2 border-sky-100 text-slate-950',
                disabled: !canCallEmergency,
                onClick: onEmergencyMeeting,
              });
            }
            if (localPlayer.alive && (isVondo || localPlayer.specialRole === 'mistri')) {
              arcQueue.push({
                id: 'vent',
                label: localPlayer.inVent ? 'বের হও' : 'ড্রেন',
                hotkey: 'V',
                subLabel:
                  localPlayer.specialRole === 'mistri' && !localPlayer.inVent && localPlayer.abilityCooldown > 0.05
                    ? `${Math.ceil(localPlayer.abilityCooldown)}সে.`
                    : undefined,
                icon: <DoorOpen className={isMobileHud ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />,
                accentHex: '#34d399',
                bgClass:
                  (nearVent || localPlayer.inVent) && playerCanVent
                    ? 'bg-emerald-600/92 border-2 border-emerald-200 text-white'
                    : 'bg-slate-950/85 border-2 border-emerald-500/45 text-emerald-200',
                disabled: (!nearVent && !localPlayer.inVent) || !playerCanVent,
                onClick: () => onVentToggle(),
              });
            }
            if (isVondo && localPlayer.alive) {
              arcQueue.push({
                id: 'sabo',
                label: 'নাশকতা',
                hotkey: 'X',
                subLabel:
                  snapshot.sabotage.cooldownRemaining > 0
                    ? `${Math.ceil(snapshot.sabotage.cooldownRemaining)}সে.`
                    : undefined,
                icon: <Zap className={isMobileHud ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />,
                accentHex: '#fbbf24',
                bgClass:
                  snapshot.sabotage.cooldownRemaining > 0
                    ? 'bg-slate-950/85 border-2 border-amber-500/45 text-amber-200'
                    : 'bg-amber-500/92 border-2 border-amber-100 text-slate-950',
                progress01:
                  snapshot.sabotage.cooldownRemaining > 0
                    ? Math.min(1, snapshot.sabotage.cooldownRemaining / 30)
                    : 1,
                onClick: () => setShowSabotageMenu((s) => !s),
              });
            }

            const arcPositions: Array<{ right: number; bottom: number }> = isMobileHud
              ? [
                  { right: 74, bottom: 2 },
                  { right: 64, bottom: 64 },
                  { right: 2, bottom: 74 },
                  { right: 132, bottom: 8 },
                  { right: 122, bottom: 70 },
                  { right: 186, bottom: 16 },
                ]
              : [
                  { right: 88, bottom: 4 },
                  { right: 74, bottom: 74 },
                  { right: 4, bottom: 88 },
                  { right: 154, bottom: 8 },
                  { right: 140, bottom: 76 },
                  { right: 68, bottom: 140 },
                ];
            const maxSlots = isMobileHud && viewport.w < 440 ? 4 : 6;
            const visibleArcSlots = arcQueue.slice(0, maxSlots);
            const clusterWidth = isMobileHud ? (viewport.w < 440 ? 196 : 246) : 228;
            const clusterHeight = isMobileHud ? 132 : visibleArcSlots.length >= 6 ? 204 : 154;

            return (
              <div
                className="relative pointer-events-none shrink-0"
                style={{ width: `${clusterWidth}px`, height: `${clusterHeight}px` }}
              >
                <div className="absolute right-0 bottom-0 pointer-events-auto">
                  <TacticalCircleButton
                    slot={heroSlot}
                    hero
                    compact={isMobileHud}
                    showHotkey={!isMobileHud}
                  />
                </div>
                {visibleArcSlots.map((slot, idx) => {
                  const pos = arcPositions[idx];
                  if (!pos) return null;
                  return (
                    <div
                      key={slot.id}
                      className="absolute pointer-events-auto"
                      style={{ right: `${pos.right}px`, bottom: `${pos.bottom}px` }}
                    >
                      <TacticalCircleButton
                        slot={slot}
                        compact={isMobileHud}
                        showHotkey={!isMobileHud}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
});
