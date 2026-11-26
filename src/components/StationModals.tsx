import { PLAYER_COLORS, type RoomSnapshot } from '../shared/types';
import { SECURITY_CAMERAS, ZONES, distance2D, getZoneIdAt } from '../shared/mapData';
import { X, Video, Radar, Activity, WifiOff, Skull } from 'lucide-react';

export type StationModalKind = 'cams' | 'admin' | 'vitals';

export interface StationModalProps {
  kind: StationModalKind;
  snapshot: RoomSnapshot;
  onClose: () => void;
}

export function StationModal({ kind, snapshot, onClose }: StationModalProps) {
  const wifiDown = snapshot.sabotage.active === 'wifi_down';
  const commsJammed = (kind === 'admin' || kind === 'vitals') && (snapshot.commsJammedUntil ?? 0) > Date.now();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={
        kind === 'cams' ? 'নিরাপত্তা সিসিটিভি মনিটর' : kind === 'admin' ? 'অ্যাডমিন পাড়া রাডার' : 'মহল্লা স্বাস্থ্য পরীক্ষা'
      }
      className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-6"
      style={{ backgroundColor: 'rgba(6, 10, 18, 0.8)' }}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-amber-400/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ backgroundColor: 'rgba(12, 19, 32, 0.98)' }}
      >
        <header className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {kind === 'cams' && <Video className="w-5 h-5 text-rose-400" />}
            {kind === 'admin' && <Radar className="w-5 h-5 text-sky-400" />}
            {kind === 'vitals' && <Activity className="w-5 h-5 text-emerald-400" />}
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                {kind === 'cams'
                  ? 'মহল্লা সিসিটিভি ক্যামেরা ফিড'
                  : kind === 'admin'
                  ? 'অ্যাডমিন টেবিল · লাইভ পাড়া রাডার'
                  : 'মহল্লা হেলথ ভাইটালস ইসিজি'}
              </h2>
              <p className="text-xs text-slate-400">
                {kind === 'cams'
                  ? 'তুমি ক্যামেরা দেখার সময় বাইরে লাল লাইট জ্বলতে থাকে।'
                  : kind === 'admin'
                  ? 'প্রতিটি ভবনে কতজন আছে তা দেখায় (ড্রেন ও লাশসহ)।'
                  : 'সব পাড়াবাসীর হৃৎস্পন্দনের অবস্থা সরাসরি দেখায়।'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="স্টেশন বন্ধ করো"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {wifiDown ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3 rounded-xl bg-slate-950 border border-rose-500/40">
              <WifiOff className="w-10 h-10 text-rose-400" />
              <h3 className="font-display text-xl font-bold text-rose-300">ওয়াইফাই সংযোগ বিচ্ছিন্ন!</h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm">
                বাটপার ডিশ কেবল হাবের তার কেটে দিয়েছে! মনিটর দেখার আগে ডিশ রাউটার ঠিক করো।
              </p>
            </div>
          ) : commsJammed ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3 rounded-xl bg-slate-950 border border-amber-500/45">
              <WifiOff className="w-10 h-10 text-amber-400" />
              <h3 className="font-display text-xl font-bold text-amber-300">দালালের কারণে সিগন্যাল জ্যাম!</h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm">
                দালাল জ্যাম চলছে — কয়েক সেকেন্ড পর অ্যাডমিন রাডার ও ভাইটালস ইসিজি সিগন্যাল ফিরে আসবে।
              </p>
            </div>
          ) : kind === 'cams' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {SECURITY_CAMERAS.map((cam) => {
                const visiblePlayers = snapshot.players.filter(
                  (p) =>
                    p.alive &&
                    !p.inVent &&
                    distance2D(p.x, p.z, cam.viewCenterX, cam.viewCenterZ) <= cam.viewRadius,
                );
                const visibleBodies = snapshot.bodies.filter(
                  (b) => distance2D(b.x, b.z, cam.viewCenterX, cam.viewCenterZ) <= cam.viewRadius,
                );
                return (
                  <div
                    key={cam.id}
                    className="rounded-xl p-3.5 bg-slate-950 border border-slate-800 flex flex-col justify-between min-h-[148px]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono-tabular text-xs font-bold text-emerald-300">{cam.label}</span>
                      <span className="px-2 py-0.5 rounded bg-rose-600/90 text-[10px] font-mono-tabular font-bold text-white">
                        রেকর্ডিং
                      </span>
                    </div>

                    <div className="flex-1 flex flex-wrap items-center gap-2 py-2">
                      {visiblePlayers.length === 0 && visibleBodies.length === 0 ? (
                        <span className="text-xs text-slate-500 font-mono-tabular">কোনো নড়াচড়া নেই...</span>
                      ) : (
                        <>
                          {visiblePlayers.map((p) => {
                            const visColor = p.disguiseColor ?? p.color;
                            const visName = p.disguiseName ?? p.name;
                            const c = PLAYER_COLORS.find((col) => col.id === visColor) ?? PLAYER_COLORS[0];
                            const moving = Math.hypot(p.vx, p.vz) > 0.25;
                            return (
                              <div
                                key={p.id}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700"
                              >
                                <span
                                  className="w-3.5 h-3.5 rounded-full shrink-0"
                                  style={{ backgroundColor: c.hex }}
                                />
                                <span className="text-xs font-semibold text-white">{visName}</span>
                                <span className="text-[10px] text-slate-400">
                                  {moving ? 'হাঁটছে' : 'দাঁড়িয়ে'}
                                </span>
                              </div>
                            );
                          })}
                          {visibleBodies.map((b) => (
                            <div
                              key={b.id}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs font-bold"
                            >
                              <Skull className="w-3.5 h-3.5" />
                              লাশ: {b.victimName}
                            </div>
                          ))}
                        </>
                      )}
                    </div>

                    <div className="text-[11px] font-mono-tabular text-slate-500 border-t border-slate-900 pt-1.5">
                      পরিসীমা {cam.viewRadius} মি. · লাইভ ফিড
                    </div>
                  </div>
                );
              })}
            </div>
          ) : kind === 'admin' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ZONES.map((zone) => {
                // Classic Among Us Admin Table: counts alive players (even in vents!) + unreported bodies inside room bounds
                const aliveCount = snapshot.players.filter(
                  (p) => p.alive && getZoneIdAt(p.x, p.z) === zone.id,
                ).length;
                const bodyCount = snapshot.bodies.filter((b) => getZoneIdAt(b.x, b.z) === zone.id).length;
                const totalSignals = aliveCount + bodyCount;

                return (
                  <div
                    key={zone.id}
                    className={`rounded-xl p-3.5 border ${
                      totalSignals > 0
                        ? 'bg-sky-950/35 border-sky-400/50'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="font-display text-sm font-bold text-white">{zone.banglaName}</span>
                      <span className="font-mono-tabular text-xs font-bold text-amber-300">{totalSignals}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                      {totalSignals === 0 ? (
                        <span className="text-[11px] text-slate-500">খালি</span>
                      ) : (
                        Array.from({ length: totalSignals }).map((_, idx) => (
                          <span
                            key={idx}
                            title="অজ্ঞাত পাড়াবাসী সিগন্যাল"
                            className="w-5 h-5 rounded-md bg-amber-300/90 border border-slate-950 inline-block"
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {snapshot.players.map((p) => {
                const c = PLAYER_COLORS.find((col) => col.id === p.color) ?? PLAYER_COLORS[0];
                const hasBody = snapshot.bodies.some((b) => b.victimId === p.id);
                const statusLabel = p.alive ? 'সুস্থ' : hasBody ? 'মৃত' : 'ভূত';
                const statusColor = p.alive
                  ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30'
                  : hasBody
                  ? 'text-rose-400 border-rose-500/50 bg-rose-950/40'
                  : 'text-slate-400 border-slate-700 bg-slate-900/70';

                return (
                  <div key={p.id} className={`rounded-xl p-3 border ${statusColor} space-y-2`}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full shrink-0 border border-white/25"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className="text-xs font-bold text-white truncate">{p.name}</span>
                    </div>
                    <svg viewBox="0 0 100 28" className="w-full h-7" aria-hidden="true">
                      {p.alive ? (
                        <polyline
                          fill="none"
                          stroke="#34d399"
                          strokeWidth="2.4"
                          points="0,16 20,16 28,6 36,24 44,10 52,16 74,16 82,7 90,22 100,16"
                        />
                      ) : (
                        <line
                          x1="0"
                          y1="16"
                          x2="100"
                          y2="16"
                          stroke={hasBody ? '#fb7185' : '#64748b'}
                          strokeWidth="2.4"
                        />
                      )}
                    </svg>
                    <div className="font-mono-tabular text-xs font-bold">{statusLabel}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
