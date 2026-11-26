import {
  PLAYER_COLORS,
  type DoorZoneId,
  type RoomSnapshot,
  type SabotageType,
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
  VENTS,
  VITALS_POS,
  WALLS,
  ZONES,
} from '../shared/mapData';
import { canCompleteTasks } from '../shared/gameRules';
import { Lock, MapPin, X, Zap } from 'lucide-react';

export interface TacticalMapModalProps {
  snapshot: RoomSnapshot;
  localPlayerId: string;
  onClose: () => void;
  onSabotage: (type: SabotageType) => void;
  onLockDoors: (zoneId: DoorZoneId) => void;
}

const DOOR_CARDS: Array<{ zoneId: DoorZoneId; label: string; x: number; z: number }> = [
  { zoneId: 'cha_dokan', label: 'চায়ের দোকান', x: -31, z: -31 },
  { zoneId: 'rickshaw_garage', label: 'রিকশা গ্যারেজ', x: 31, z: -31 },
  { zoneId: 'desco_power', label: 'ডেসকো কেন্দ্র', x: -31, z: 31 },
  { zoneId: 'dish_roof', label: 'ডিশ হাব', x: 31, z: 31 },
];

export function TacticalMapModal({
  snapshot,
  localPlayerId,
  onClose,
  onSabotage,
  onLockDoors,
}: TacticalMapModalProps) {
  const localPlayer = snapshot.players.find((p) => p.id === localPlayerId);
  if (!localPlayer) return null;

  const isVondo = localPlayer.role === 'vondo';
  const wifiHidden = snapshot.sabotage.active === 'wifi_down' && !isVondo;
  const showTasks = canCompleteTasks(localPlayer) && !wifiHidden;
  const showVents = isVondo || localPlayer.specialRole === 'mistri';
  const playerColorSpec =
    PLAYER_COLORS.find((c) => c.id === localPlayer.color) ?? PLAYER_COLORS[0];

  const incompleteTasks = showTasks
    ? localPlayer.tasks
        .filter((t) => !t.completed)
        .map((t) => TASK_STATIONS.find((s) => s.id === t.taskId))
        .filter((s): s is NonNullable<typeof s> => Boolean(s))
    : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="মহল্লার কৌশলগত ম্যাপ"
      className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-6"
      style={{ backgroundColor: 'rgba(6, 10, 18, 0.86)' }}
    >
      <div
        className="w-full max-w-4xl rounded-2xl border border-amber-400/35 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{ backgroundColor: 'rgba(13, 20, 34, 0.98)' }}
      >
        <header className="px-4 sm:px-6 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <MapPin className="w-5 h-5 text-amber-300 shrink-0" />
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-white leading-tight">
                {isVondo && localPlayer.alive
                  ? 'বাটপার নাশকতা ম্যাপ · কে বাটপার?'
                  : 'মহল্লা ম্যাপ · কে বাটপার?'}
              </h2>
              <p className="text-[11px] text-slate-400">
                ৩৪টি এলাকা · {incompleteTasks.length > 0 ? `বাকি কাজ ${incompleteTasks.length}টি` : 'ক্যামেরা, অ্যাডমিন, ভাইটালস, রেললাইন ও ওপার পাড়া'} · বন্ধ করতে [Tab] বা [Esc] চাপো
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ম্যাপ বন্ধ করো"
            className="min-w-[40px] min-h-[40px] rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-3 sm:p-5 overflow-y-auto flex-1 flex flex-col items-center gap-4">
          <div className="w-full max-w-[600px] aspect-square rounded-2xl border border-slate-700/70 bg-slate-950 p-2">
            <svg
              viewBox={`${-MAP_HALF_SIZE - 8} ${-MAP_HALF_SIZE - 8} ${(MAP_HALF_SIZE + 8) * 2} ${(MAP_HALF_SIZE + 8) * 2}`}
              className="w-full h-full"
              role="img"
              aria-label="৩৪ এলাকার সম্পূর্ণ মহল্লা ম্যাপ"
            >
              <rect
                x={-MAP_HALF_SIZE - 8}
                y={-MAP_HALF_SIZE - 8}
                width={(MAP_HALF_SIZE + 8) * 2}
                height={(MAP_HALF_SIZE + 8) * 2}
                fill="#0b1322"
                rx="4"
              />

              {/* Main Roads, Crosswalks, Outer Boulevards & South Rail Line */}
              <rect x={-10} y={-MAP_HALF_SIZE} width={20} height={MAP_HALF_SIZE * 2} fill="#1e293b" opacity={0.68} />
              <rect x={-MAP_HALF_SIZE} y={-10} width={MAP_HALF_SIZE * 2} height={20} fill="#1e293b" opacity={0.68} />
              <rect
                x={-54}
                y={-54}
                width={108}
                height={108}
                fill="none"
                stroke="#334155"
                strokeWidth="4.2"
                strokeDasharray="3 2"
              />
              {/* Expanded Outer Para & Opar Para Avenues (z = -114, -72, ±52, 72, 96, 112, 144, x = ±52, ±86, ±118) */}
              <line x1={-154} y1={-114} x2={154} y2={-114} stroke="#334155" strokeWidth="4.2" />
              <line x1={-154} y1={-72} x2={154} y2={-72} stroke="#334155" strokeWidth="4.0" />
              <line x1={-154} y1={-52} x2={154} y2={-52} stroke="#334155" strokeWidth="3.8" />
              <line x1={-154} y1={52} x2={154} y2={52} stroke="#334155" strokeWidth="3.8" />
              <line x1={-154} y1={72} x2={154} y2={72} stroke="#334155" strokeWidth="4.0" />
              <line x1={-154} y1={96} x2={154} y2={96} stroke="#334155" strokeWidth="3.5" />
              <line x1={-154} y1={112} x2={154} y2={112} stroke="#334155" strokeWidth="4.2" />
              <line x1={-154} y1={144} x2={154} y2={144} stroke="#334155" strokeWidth="4.0" />
              <line x1={-118} y1={-154} x2={-118} y2={154} stroke="#334155" strokeWidth="4.2" />
              <line x1={-86} y1={-154} x2={-86} y2={154} stroke="#334155" strokeWidth="3.8" />
              <line x1={-52} y1={-154} x2={-52} y2={154} stroke="#334155" strokeWidth="3.8" />
              <line x1={52} y1={-154} x2={52} y2={154} stroke="#334155" strokeWidth="3.8" />
              <line x1={86} y1={-154} x2={86} y2={154} stroke="#334155" strokeWidth="3.8" />
              <line x1={118} y1={-154} x2={118} y2={154} stroke="#334155" strokeWidth="4.2" />
              {/* South Rail Line & Crossings */}
              <line x1={-MAP_HALF_SIZE + 2} y1={RAILWAY_TRACK_Z - 1.1} x2={MAP_HALF_SIZE - 2} y2={RAILWAY_TRACK_Z - 1.1} stroke="#94a3b8" strokeWidth="0.65" />
              <line x1={-MAP_HALF_SIZE + 2} y1={RAILWAY_TRACK_Z + 1.1} x2={MAP_HALF_SIZE - 2} y2={RAILWAY_TRACK_Z + 1.1} stroke="#94a3b8" strokeWidth="0.65" />
              <line x1={-MAP_HALF_SIZE + 2} y1={RAILWAY_TRACK_Z} x2={MAP_HALF_SIZE - 2} y2={RAILWAY_TRACK_Z} stroke="#475569" strokeWidth="2.6" strokeDasharray="1.1 1.6" />
              {/* Center Adda Chowk Zebra Crosswalk Hints */}
              <line x1={-7} y1={-11.5} x2={7} y2={-11.5} stroke="#94a3b8" strokeOpacity={0.35} strokeWidth="1.2" strokeDasharray="1.4 1.4" />
              <line x1={-7} y1={11.5} x2={7} y2={11.5} stroke="#94a3b8" strokeOpacity={0.35} strokeWidth="1.2" strokeDasharray="1.4 1.4" />
              <line x1={-11.5} y1={-7} x2={-11.5} y2={7} stroke="#94a3b8" strokeOpacity={0.35} strokeWidth="1.2" strokeDasharray="1.4 1.4" />
              <line x1={11.5} y1={-7} x2={11.5} y2={7} stroke="#94a3b8" strokeOpacity={0.35} strokeWidth="1.2" strokeDasharray="1.4 1.4" />
              <text x={-34} y={-116.5} textAnchor="middle" fill="#64748b" fontSize="2.5" fontWeight="700">
                উত্তর কলোনি সড়ক
              </text>
              <text x={-36} y={RAILWAY_TRACK_Z + 5.4} textAnchor="middle" fill="#94a3b8" fontSize="2.4" fontWeight="700">
                বাংলা এক্সপ্রেস রেললাইন
              </text>
              <text x={0} y={114.6} textAnchor="middle" fill="#64748b" fontSize="2.5" fontWeight="700">
                ওপার পাড়া সড়ক
              </text>

              {/* Layer 1: 34 Zone Footprints */}
              {ZONES.map((z) => {
                const lockedSec =
                  z.id === 'cha_dokan'
                    ? snapshot.doorLocks.cha_dokan
                    : z.id === 'rickshaw_garage'
                      ? snapshot.doorLocks.rickshaw_garage
                      : z.id === 'desco_power'
                        ? snapshot.doorLocks.desco_power
                        : z.id === 'dish_roof'
                          ? snapshot.doorLocks.dish_roof
                          : 0;
                const topY = z.z - z.depth / 2;
                return (
                  <g key={z.id}>
                    <rect
                      x={z.x - z.width / 2}
                      y={topY}
                      width={z.width}
                      height={z.depth}
                      fill={z.color}
                      fillOpacity={0.54}
                      stroke={lockedSec > 0 ? '#f59e0b' : '#64748b'}
                      strokeWidth={lockedSec > 0 ? '1.3' : '0.55'}
                      rx="2"
                    />
                    {lockedSec > 0 && (
                      <text
                        x={z.x}
                        y={z.z + 1}
                        textAnchor="middle"
                        fill="#fbbf24"
                        fontSize="2.3"
                        fontWeight="800"
                      >
                        বন্ধ {Math.ceil(lockedSec)}সে.
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Layer 1B: Precision Architecture — Pukur & Jheel Par Water, Building Walls, Rooftops & Stairs */}
              {WALLS.map((w) => {
                if (w.id === 'pukur_water' || w.id === 'jheel_water') {
                  return (
                    <g key={w.id}>
                      <rect
                        x={w.minX}
                        y={w.minZ}
                        width={w.maxX - w.minX}
                        height={w.maxZ - w.minZ}
                        fill="#0284c7"
                        fillOpacity={0.78}
                        stroke="#7dd3fc"
                        strokeWidth="0.6"
                        rx="1.2"
                      />
                      {w.id === 'pukur_water' && (
                        <line x1={w.maxX} y1={-4} x2={w.maxX} y2={4} stroke="#cbd5e1" strokeWidth="1.2" />
                      )}
                    </g>
                  );
                }
                const isOuter = w.id.startsWith('outer_');
                const isLowProp = w.height <= 1.9;
                return (
                  <rect
                    key={w.id}
                    x={w.minX}
                    y={w.minZ}
                    width={Math.max(0.9, w.maxX - w.minX)}
                    height={Math.max(0.9, w.maxZ - w.minZ)}
                    fill={isOuter ? '#475569' : isLowProp ? '#78350f' : '#94a3b8'}
                    fillOpacity={isOuter ? 0.85 : isLowProp ? 0.72 : 0.88}
                    rx="0.3"
                  />
                );
              })}

              {/* Walkable Chhad Rooftop Decks */}
              {ROOFTOPS.map((r) => (
                <rect
                  key={r.id}
                  x={r.minX}
                  y={r.minZ}
                  width={r.maxX - r.minX}
                  height={r.maxZ - r.minZ}
                  fill="#38bdf8"
                  fillOpacity={0.09}
                  stroke="#38bdf8"
                  strokeOpacity={0.55}
                  strokeWidth="0.55"
                  strokeDasharray="1.8 1.2"
                  rx="0.8"
                />
              ))}

              {/* Exterior Staircases to Rooftops */}
              {STAIR_RAMPS.map((st) => {
                const w = st.maxX - st.minX;
                const d = st.maxZ - st.minZ;
                const treadLines = 5;
                return (
                  <g key={st.id}>
                    <rect
                      x={st.minX}
                      y={st.minZ}
                      width={w}
                      height={d}
                      fill="#f59e0b"
                      fillOpacity={0.35}
                      stroke="#fbbf24"
                      strokeWidth="0.55"
                      rx="0.4"
                    />
                    {Array.from({ length: treadLines }, (_, i) => {
                      const t = (i + 1) / (treadLines + 1);
                      if (st.axis === 'z') {
                        const yPos = st.minZ + d * t;
                        return (
                          <line
                            key={i}
                            x1={st.minX + 0.3}
                            y1={yPos}
                            x2={st.maxX - 0.3}
                            y2={yPos}
                            stroke="#fde68a"
                            strokeWidth="0.4"
                          />
                        );
                      }
                      const xPos = st.minX + w * t;
                      return (
                        <line
                          key={i}
                          x1={xPos}
                          y1={st.minZ + 0.3}
                          x2={xPos}
                          y2={st.maxZ - 0.3}
                          stroke="#fde68a"
                          strokeWidth="0.4"
                        />
                      );
                    })}
                  </g>
                );
              })}

              {/* Rolling Tin Shutters (Live Door Lock Status) */}
              {DOORS.map((d) => {
                const locked = snapshot.doorLocks[d.zoneId] > 0;
                return (
                  <rect
                    key={d.id}
                    x={d.minX}
                    y={d.minZ}
                    width={Math.max(1, d.maxX - d.minX)}
                    height={Math.max(1, d.maxZ - d.minZ)}
                    fill={locked ? '#f59e0b' : '#334155'}
                    fillOpacity={locked ? 0.95 : 0.45}
                    stroke={locked ? '#fef3c7' : '#64748b'}
                    strokeWidth={locked ? '0.6' : '0.35'}
                    rx="0.3"
                  />
                );
              })}

              {/* Layer 2: Utility Stations */}
              <g>
                <circle cx={EMERGENCY_BELL_POS.x} cy={EMERGENCY_BELL_POS.z} r={2.1} fill="#38bdf8" stroke="#0f172a" strokeWidth="0.7" />
                <text x={EMERGENCY_BELL_POS.x} y={EMERGENCY_BELL_POS.z - 3.0} textAnchor="middle" fill="#7dd3fc" fontSize="2.1" fontWeight="700">
                  ঘণ্টা
                </text>

                <circle cx={SECURITY_CAMS_POS.x} cy={SECURITY_CAMS_POS.z} r={2.0} fill="#fb7185" stroke="#0f172a" strokeWidth="0.7" />
                <text x={SECURITY_CAMS_POS.x} y={SECURITY_CAMS_POS.z + 4.3} textAnchor="middle" fill="#fda4af" fontSize="2.1" fontWeight="700">
                  সিসিটিভি
                </text>

                <circle cx={ADMIN_TABLE_POS.x} cy={ADMIN_TABLE_POS.z} r={2.0} fill="#38bdf8" stroke="#0f172a" strokeWidth="0.7" />
                <text x={ADMIN_TABLE_POS.x} y={ADMIN_TABLE_POS.z + 4.3} textAnchor="middle" fill="#bae6fd" fontSize="2.1" fontWeight="700">
                  অ্যাডমিন
                </text>

                <circle cx={VITALS_POS.x} cy={VITALS_POS.z} r={2.0} fill="#34d399" stroke="#0f172a" strokeWidth="0.7" />
                <text x={VITALS_POS.x} y={VITALS_POS.z + 4.3} textAnchor="middle" fill="#6ee7b7" fontSize="2.1" fontWeight="700">
                  ভাইটালস
                </text>
              </g>

              {/* Drain Vent Markers (Batpar & Mistri only) */}
              {showVents &&
                VENTS.map((v) => (
                  <g key={v.id}>
                    <rect
                      x={v.x - 1.3}
                      y={v.z - 1.3}
                      width={2.6}
                      height={2.6}
                      rx="0.6"
                      fill="#10b981"
                      stroke="#0f172a"
                      strokeWidth="0.6"
                    />
                  </g>
                ))}

              {/* Parked & Active Moholla Vehicles */}
              {snapshot.vehicles?.map((v) => (
                <rect
                  key={v.id}
                  x={v.x - 1.4}
                  y={v.z - 2.1}
                  width={2.8}
                  height={4.2}
                  rx="0.7"
                  fill={v.driverId ? '#38bdf8' : '#e2e8f0'}
                  fillOpacity={v.driverId ? 0.95 : 0.72}
                  stroke="#0f172a"
                  strokeWidth="0.55"
                  transform={`rotate(${-(v.yaw * 180) / Math.PI} ${v.x} ${v.z})`}
                />
              ))}

              {/* Remaining Task Pins */}
              {incompleteTasks.map((st) => {
                const label = st.title.length > 17 ? `${st.title.slice(0, 16)}…` : st.title;
                return (
                  <g key={st.id}>
                    <circle
                      cx={st.x}
                      cy={st.z}
                      r={2.5}
                      fill="#fbbf24"
                      stroke="#0f172a"
                      strokeWidth="0.8"
                    />
                    <rect
                      x={st.x - 13}
                      y={st.z + 3.4}
                      width={26}
                      height={3.9}
                      rx="1.1"
                      fill="#0f172a"
                      fillOpacity={0.94}
                      stroke="#fbbf24"
                      strokeWidth="0.45"
                    />
                    <text
                      x={st.x}
                      y={st.z + 6.1}
                      textAnchor="middle"
                      fill="#fde68a"
                      fontSize="2.1"
                      fontWeight="700"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}

              {/* Active Sabotage Repair Pin(s) */}
              {snapshot.sabotage.active === 'gas_leak' ? (
                GAS_LEAK_VALVES.map((v, idx) => (
                  <g key={v.id}>
                    <circle
                      cx={v.x}
                      cy={v.z}
                      r={5.2}
                      fill="#ef4444"
                      fillOpacity={0.28}
                      stroke="#ef4444"
                      strokeWidth="1"
                    />
                    <circle
                      cx={v.x}
                      cy={v.z}
                      r={2.4}
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth="0.8"
                    />
                    <rect
                      x={v.x - 11}
                      y={v.z - 9.0}
                      width={22}
                      height={4.2}
                      rx="1.2"
                      fill="#991b1b"
                      stroke="#fecaca"
                      strokeWidth="0.5"
                    />
                    <text
                      x={v.x}
                      y={v.z - 6.0}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="2.4"
                      fontWeight="800"
                    >
                      গ্যাস ভালভ {idx + 1}!
                    </text>
                  </g>
                ))
              ) : (
                snapshot.sabotage.active && (
                  <g>
                    <circle
                      cx={snapshot.sabotage.fixStationX}
                      cy={snapshot.sabotage.fixStationZ}
                      r={5.2}
                      fill="#ef4444"
                      fillOpacity={0.28}
                      stroke="#ef4444"
                      strokeWidth="1"
                    />
                    <circle
                      cx={snapshot.sabotage.fixStationX}
                      cy={snapshot.sabotage.fixStationZ}
                      r={2.4}
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth="0.8"
                    />
                    <rect
                      x={snapshot.sabotage.fixStationX - 11}
                      y={snapshot.sabotage.fixStationZ - 9.0}
                      width={22}
                      height={4.2}
                      rx="1.2"
                      fill="#991b1b"
                      stroke="#fecaca"
                      strokeWidth="0.5"
                    />
                    <text
                      x={snapshot.sabotage.fixStationX}
                      y={snapshot.sabotage.fixStationZ - 6.0}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="2.4"
                      fontWeight="800"
                    >
                      সমস্যা ঠিক করো!
                    </text>
                  </g>
                )
              )}

              {/* Local Player Live Directional Chevron & Vision Cone */}
              <g>
                <g
                  transform={`translate(${localPlayer.x}, ${localPlayer.z}) rotate(${180 - (localPlayer.yaw * 180) / Math.PI})`}
                >
                  <path
                    d="M 0 0 L -7 -14 A 15.5 15.5 0 0 1 7 -14 Z"
                    fill="#38bdf8"
                    fillOpacity={0.22}
                  />
                  <polygon
                    points="0,-4.4 3.4,3.2 0,1.4 -3.4,3.2"
                    fill={playerColorSpec.hex}
                    stroke="#ffffff"
                    strokeWidth="0.9"
                    strokeLinejoin="round"
                  />
                </g>
                <text
                  x={localPlayer.x}
                  y={localPlayer.z + 7.2}
                  textAnchor="middle"
                  fill="#ffffff"
                  stroke="#090f1d"
                  strokeWidth="1.1"
                  paintOrder="stroke"
                  fontSize="2.4"
                  fontWeight="800"
                >
                  তুমি{(localPlayer.y ?? 0) >= 2.2 ? ' (ছাদ)' : ''}
                </text>
              </g>

              {/* Layer 3: Clean Bangla District Name Headers (above each zone box) */}
              {ZONES.map((z) => {
                const topY = z.z - z.depth / 2;
                const badgeW = Math.max(z.width + 4, 24);
                const badgeH = 3.8;
                const badgeY = topY - badgeH - 0.35;
                return (
                  <g key={`${z.id}-badge`}>
                    <rect
                      x={z.x - badgeW / 2}
                      y={badgeY}
                      width={badgeW}
                      height={badgeH}
                      rx="1.2"
                      fill="#090f1d"
                      fillOpacity={0.94}
                      stroke={z.color}
                      strokeWidth="0.65"
                    />
                    <text
                      x={z.x}
                      y={badgeY + 2.65}
                      textAnchor="middle"
                      fill="#fde68a"
                      fontSize="2.2"
                      fontWeight="800"
                    >
                      {z.banglaName}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend or Batpar Sabotage Tactical Strip */}
          {isVondo && localPlayer.alive ? (
            <div className="w-full rounded-xl p-3 bg-rose-950/50 border border-rose-500/40 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-rose-200 flex items-center gap-1.5 mr-1">
                  <Zap className="w-4 h-4 text-amber-300" />
                  নাশকতা:
                </span>
                <button
                  type="button"
                  disabled={Boolean(snapshot.sabotage.active) || snapshot.sabotage.cooldownRemaining > 0}
                  onClick={() => {
                    onSabotage('loadshedding');
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-xs font-bold text-white"
                >
                  লোডশেডিং (ডেসকো)
                </button>
                <button
                  type="button"
                  disabled={Boolean(snapshot.sabotage.active) || snapshot.sabotage.cooldownRemaining > 0}
                  onClick={() => {
                    onSabotage('wifi_down');
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-bold text-white"
                >
                  ওয়াইফাই বন্ধ (ডিশ হাব)
                </button>
                <button
                  type="button"
                  disabled={Boolean(snapshot.sabotage.active) || snapshot.sabotage.cooldownRemaining > 0}
                  onClick={() => {
                    onSabotage('gas_leak');
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-40 text-xs font-bold text-white border border-amber-300/40"
                >
                  গ্যাস লিক (জরুরি!)
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1 mr-1">
                  <Lock className="w-3.5 h-3.5" />
                  শাটার{snapshot.doorLocks.cooldownRemaining > 0 ? ` (${Math.ceil(snapshot.doorLocks.cooldownRemaining)}সে.)` : ':'}
                </span>
                {DOOR_CARDS.map((d) => (
                  <button
                    key={d.zoneId}
                    type="button"
                    disabled={snapshot.doorLocks.cooldownRemaining > 0}
                    onClick={() => onLockDoors(d.zoneId)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 disabled:opacity-40 text-xs font-semibold text-white transition-colors"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> নির্ধারিত কাজ
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-400 inline-block" /> আড্ডা ঘণ্টা / অ্যাডমিন
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-400 inline-block" /> সিসিটিভি ক্যামেরা
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> ভাইটালস ক্লিনিক
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-400/70 border border-amber-300 inline-block" /> ছাদের সিঁড়ি
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-3.5 rounded-sm bg-slate-200 inline-block" /> রিকশা/গাড়ি [F]
              </span>
              {showVents && (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> গোপন ড্রেন
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
