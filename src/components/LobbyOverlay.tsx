import { memo, useEffect, useRef, useState } from 'react';
import {
  PLAYER_COLORS,
  type PlayerColorId,
  type RoomSettings,
  type RoomSnapshot,
  type VehicleState,
} from '../shared/types';
import { VEHICLE_SPECS } from '../shared/mapData';
import {
  LOBBY_CHAT_MAX_CHARS,
  MAX_MATCH_PLAYERS,
  MIN_MATCH_PLAYERS,
  PLAYER_NAME_MAX_CHARS,
  canStartLobbyMatch,
  getRolePoolPreview,
} from '../shared/gameRules';
import {
  BookOpen,
  Bot,
  Car,
  Check,
  ChevronDown,
  Copy,
  Crown,
  Link2,
  LogOut,
  MessageSquare,
  Play,
  Send,
  Settings2,
  UserMinus,
  UserX,
  Users,
  Volume2,
  X,
} from 'lucide-react';

export interface LobbyOverlayProps {
  snapshot: RoomSnapshot;
  localPlayerId: string;
  errorMsg: string | null;
  onMobileSheetExpandedChange?: (expanded: boolean) => void;
  onUpdateSettings: (settings: Partial<RoomSettings>) => void;
  onCustomize: (name?: string, color?: PlayerColorId) => void;
  onReadyToggle?: (ready: boolean) => void;
  onKickPlayer?: (targetPlayerId: string) => void;
  onAddBot: () => void;
  onRemoveBot?: (targetPlayerId?: string) => void;
  onRemoveBots: () => void;
  onSendLobbyChat: (text: string) => void;
  onStartMatch: () => void;
  onCancelStart?: () => void;
  onOpenGuide: () => void;
  onLeaveRoom: () => void;
  drivingVehicle?: VehicleState | null;
  nearbyVehicle?: VehicleState | null;
  driveSpeedMs?: number;
  onToggleVehicle?: (vehicleId?: string) => void;
  onVehicleHorn?: () => void;
}

type MobileLobbyTab = 'players' | 'settings' | 'chat';

export const LobbyOverlay = memo(function LobbyOverlay({
  snapshot,
  localPlayerId,
  errorMsg,
  onMobileSheetExpandedChange,
  onUpdateSettings,
  onCustomize,
  onReadyToggle,
  onKickPlayer,
  onAddBot,
  onRemoveBot,
  onRemoveBots,
  onSendLobbyChat,
  onStartMatch,
  onCancelStart,
  onOpenGuide,
  onLeaveRoom,
  drivingVehicle = null,
  nearbyVehicle = null,
  driveSpeedMs = 0,
  onToggleVehicle,
  onVehicleHorn,
}: LobbyOverlayProps) {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(true);
  const [mobileTab, setMobileTab] = useState<MobileLobbyTab | null>(null);
  const localPlayer = snapshot.players.find((p) => p.id === localPlayerId);
  const isHost = Boolean(localPlayer?.isHost);
  const isSolo = Boolean(snapshot.isSolo);
  const [nameDraft, setNameDraft] = useState(localPlayer?.name ?? 'Lal Mia');
  const desktopChatEndRef = useRef<HTMLDivElement | null>(null);
  const mobileChatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (localPlayer?.name) {
      setNameDraft(localPlayer.name);
    }
  }, [localPlayer?.name]);

  useEffect(() => {
    desktopChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    mobileChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [snapshot.lobbyChat?.length, mobileTab]);

  useEffect(() => {
    onMobileSheetExpandedChange?.(mobileTab !== null);
  }, [mobileTab, onMobileSheetExpandedChange]);

  useEffect(() => {
    return () => onMobileSheetExpandedChange?.(false);
  }, [onMobileSheetExpandedChange]);

  const startCheck = canStartLobbyMatch(snapshot.players);
  const rolePreview = getRolePoolPreview(snapshot.players.length, snapshot.settings);
  const takenColors = new Set(
    snapshot.players.filter((p) => p.id !== localPlayerId).map((p) => p.color),
  );
  const emptySlotCount = Math.max(0, MAX_MATCH_PLAYERS - snapshot.players.length);
  const isCountingDown =
    snapshot.lobbyCountdownSec !== null && snapshot.lobbyCountdownSec !== undefined;
  const chatCount = snapshot.lobbyChat?.length ?? 0;

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(snapshot.roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/?room=${encodeURIComponent(snapshot.roomCode)}`;
    navigator.clipboard?.writeText(inviteUrl).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const submitName = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== localPlayer?.name) {
      onCustomize(trimmed, undefined);
    }
  };

  const submitChat = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = chatInput.trim().slice(0, LOBBY_CHAT_MAX_CHARS);
    if (!clean) return;
    onSendLobbyChat(clean);
    setChatInput('');
  };

  const toggleMobileTab = (tab: MobileLobbyTab) => {
    setMobileTab((prev) => (prev === tab ? null : tab));
  };

  const renderPrimaryCta = (fullWidthMobile = false) => {
    const sizeCls = fullWidthMobile ? 'w-full min-h-[44px]' : 'min-h-[42px]';
    if (isHost) {
      if (isCountingDown && onCancelStart) {
        return (
          <button
            type="button"
            onClick={onCancelStart}
            className={`${sizeCls} px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-display font-bold text-sm`}
          >
            বাতিল ({snapshot.lobbyCountdownSec} সে.)
          </button>
        );
      }
      return (
        <button
          type="button"
          data-start="true"
          disabled={!startCheck.ok}
          onClick={onStartMatch}
          title={startCheck.reason ?? 'খেলা শুরু করো'}
          className={`${sizeCls} px-6 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-950 font-display font-bold text-sm flex items-center justify-center gap-2`}
        >
          <Play className="w-4 h-4 fill-current" />
          খেলো ({snapshot.players.length}/{MAX_MATCH_PLAYERS})
        </button>
      );
    }
    if (onReadyToggle && localPlayer) {
      return (
        <button
          type="button"
          onClick={() => onReadyToggle(!localPlayer.ready)}
          className={`${sizeCls} px-6 py-2 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 ${
            localPlayer.ready
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
          }`}
        >
          <Check className="w-4 h-4" />
          {localPlayer.ready ? 'রেডি ✓' : 'রেডি হও'}
        </button>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-2.5 sm:p-5 overflow-hidden">
      {/* Top Bar: KE BATPAR 2.0 + Room Code / Solo Room + How to Play + Leave */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div
          className="pointer-events-auto rounded-2xl px-3 py-2 sm:px-5 sm:py-3 border border-white/12 flex flex-wrap items-center gap-2.5 sm:gap-4"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
        >
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              <span className="text-amber-300 font-bold">KE BATPAR 2.0</span> · v2.0 ·{' '}
              {isSolo ? 'সলো লবি' : 'মহল্লা রুম'}
            </span>
            <span className="font-mono-tabular text-lg sm:text-2xl font-bold text-amber-300 tracking-widest leading-tight">
              {isSolo ? 'প্রাইভেট ম্যাচ' : snapshot.roomCode}
            </span>
          </div>

          {!isSolo && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyCode}
                aria-label="রুম কোড কপি করো"
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-xs font-bold text-slate-950 flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'কপি!' : 'কপি'}
              </button>
              <button
                type="button"
                onClick={handleCopyInviteLink}
                aria-label="আমন্ত্রণ লিংক শেয়ার করো"
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copiedLink ? 'লিংক কপি হয়েছে' : 'লিংক শেয়ার'}</span>
                <span className="sm:hidden">{copiedLink ? 'কপি' : 'লিংক'}</span>
              </button>
            </div>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onOpenGuide}
            className="min-h-[40px] px-3 sm:px-3.5 py-2 rounded-xl border border-sky-400/35 text-xs font-bold text-sky-200 hover:text-white flex items-center gap-1.5"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
          >
            <BookOpen className="w-4 h-4 text-sky-300" />
            <span className="hidden sm:inline">খেলার নিয়ম</span>
            <span className="sm:hidden">নিয়ম</span>
          </button>
          <button
            type="button"
            onClick={onLeaveRoom}
            className="min-h-[40px] px-3 sm:px-3.5 py-2 rounded-xl border border-white/12 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1.5"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
          >
            <LogOut className="w-4 h-4" />
            বের হও
          </button>
        </div>
      </div>

      {/* Center Countdown Banner (leaves Cha-er dokan 3D walk space clear!) */}
      {isCountingDown && (
        <div className="my-auto flex justify-center pointer-events-none">
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-auto rounded-2xl px-6 py-4 border border-amber-400/60 shadow-2xl text-center space-y-2"
            style={{ backgroundColor: 'rgba(9, 15, 28, 0.94)' }}
          >
            <p className="text-xs uppercase tracking-widest text-amber-300 font-bold">
              খেলা শুরু হচ্ছে!
            </p>
            <div className="font-mono-tabular text-5xl font-black text-white">
              {snapshot.lobbyCountdownSec}
            </div>
            {isHost && onCancelStart && (
              <button
                type="button"
                onClick={onCancelStart}
                className="min-h-[40px] px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold inline-flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                ক্যানসেল করো
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bottom Area: Vehicle Prompt + Error + Mobile Sheet / Desktop 3-Column Dock */}
      <div className="flex flex-col items-center gap-2 mt-auto w-full">
        {(drivingVehicle || nearbyVehicle) && onToggleVehicle && (
          <div
            className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 px-3.5 py-2 rounded-2xl border border-amber-400/45 shadow-xl"
            style={{ backgroundColor: 'rgba(10, 16, 30, 0.92)' }}
          >
            {drivingVehicle ? (
              <>
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Car className="w-4 h-4" />
                  {VEHICLE_SPECS[drivingVehicle.kind].banglaName}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-white/10 font-mono-tabular text-xs font-black text-emerald-300">
                  {Math.round(driveSpeedMs * 3.6)} km/h
                </span>
                {onVehicleHorn && (
                  <button
                    type="button"
                    onClick={onVehicleHorn}
                    className="min-h-[36px] px-2.5 py-1 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center gap-1"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    হর্ন [K]
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onToggleVehicle()}
                  className="min-h-[36px] px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold"
                >
                  নেমে যাও [F]
                </button>
              </>
            ) : nearbyVehicle ? (
              <button
                type="button"
                onClick={() => onToggleVehicle(nearbyVehicle.id)}
                className="min-h-[38px] px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1.5"
              >
                <Car className="w-4 h-4" />
                গাড়িতে ওঠো ({VEHICLE_SPECS[nearbyVehicle.kind].banglaName}) [F]
              </button>
            ) : null}
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="pointer-events-auto px-4 py-2 rounded-xl bg-rose-950 border border-rose-500/40 text-xs text-rose-200 font-semibold"
          >
            {errorMsg}
          </div>
        )}

        {/* MOBILE COMPACT WAITING DOCK (< 1024px): leaves 3D courtyard open for MobileControls */}
        <div
          className="lg:hidden pointer-events-auto w-full max-w-xl rounded-2xl p-2.5 border border-white/12 shadow-2xl space-y-2.5"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.94)' }}
        >
          {/* Expandable Sheet Content */}
          {mobileTab !== null && (
            <div className="space-y-2.5 pb-2.5 border-b border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-amber-300">
                  {mobileTab === 'players'
                    ? `খেলোয়াড় ও সাজগোজ (${snapshot.players.length}/${MAX_MATCH_PLAYERS})`
                    : mobileTab === 'settings'
                      ? isHost
                        ? 'ম্যাচ সেটিংস (হোস্ট)'
                        : 'ম্যাচ সেটিংস'
                      : 'লবি আড্ডা'}
                </span>
                <div className="flex items-center gap-1.5">
                  {mobileTab === 'players' && isHost && snapshot.players.length < MAX_MATCH_PLAYERS && (
                    <button
                      type="button"
                      onClick={onAddBot}
                      className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-200 flex items-center gap-1"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      + বট
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMobileTab(null)}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1"
                  >
                    <ChevronDown className="w-4 h-4 text-amber-300" />
                    ৩ডি-তে ফিরো
                  </button>
                </div>
              </div>

              <div className="max-h-[52vh] overflow-y-auto overscroll-contain pr-0.5 space-y-3">
                {mobileTab === 'players' && (
                  <>
                    {/* Name + Color customization */}
                    <div className="space-y-2 rounded-xl bg-slate-950/60 border border-slate-800 p-2.5">
                      <div className="flex items-center gap-2">
                        <input
                          id="mobile-lobby-name-input"
                          type="text"
                          maxLength={PLAYER_NAME_MAX_CHARS}
                          value={nameDraft}
                          onChange={(e) => setNameDraft(e.target.value)}
                          onBlur={submitName}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              submitName();
                            }
                          }}
                          aria-label="তোমার নাম"
                          className="flex-1 min-w-0 min-h-[40px] px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-amber-400"
                        />
                        <button
                          type="button"
                          onClick={submitName}
                          className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-300"
                        >
                          সেভ
                        </button>
                      </div>

                      <div
                        className="grid grid-cols-5 gap-1.5 justify-items-center"
                        role="radiogroup"
                        aria-label="লবির রঙ বেছে নাও"
                      >
                        {PLAYER_COLORS.map((c) => {
                          const isMine = localPlayer?.color === c.id;
                          const isTaken = takenColors.has(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              disabled={isTaken}
                              onClick={() => onCustomize(undefined, c.id)}
                              aria-label={`রঙ ${c.label}${isTaken ? ' (নেওয়া হয়েছে)' : ''}`}
                              aria-checked={isMine}
                              role="radio"
                              className="w-10 h-10 flex items-center justify-center rounded-full disabled:cursor-not-allowed"
                            >
                              <span
                                className={`w-7 h-7 rounded-full border-2 transition-transform ${
                                  isMine
                                    ? 'border-amber-300 scale-110'
                                    : isTaken
                                      ? 'border-slate-700 opacity-25'
                                      : 'border-white/30'
                                }`}
                                style={{ backgroundColor: c.hex }}
                              />
                            </button>
                          );
                        })}
                      </div>

                      {isHost && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={onAddBot}
                            disabled={snapshot.players.length >= MAX_MATCH_PLAYERS}
                            className="flex-1 min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5"
                          >
                            <Bot className="w-3.5 h-3.5 text-amber-300" />
                            + বট যোগ করো
                          </button>
                          {snapshot.players.some((p) => p.isBot) && (
                            <button
                              type="button"
                              onClick={onRemoveBots}
                              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                            >
                              সব বট সরাও
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Player list */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                        <span>
                          স্লট ({snapshot.players.length}/{MAX_MATCH_PLAYERS} · সর্বনিম্ন {MIN_MATCH_PLAYERS})
                        </span>
                        <span className="text-amber-300">{rolePreview.batparCount} বাটপার</span>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        {snapshot.players.map((p) => {
                          const col = PLAYER_COLORS.find((c) => c.id === p.color) ?? PLAYER_COLORS[0];
                          const isReady = p.isHost || p.isBot || p.ready;
                          return (
                            <div
                              key={p.id}
                              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs ${
                                p.id === localPlayerId
                                  ? 'bg-slate-900 border-amber-400/50'
                                  : 'bg-slate-900/80 border-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/25"
                                  style={{ backgroundColor: col.hex }}
                                />
                                <span className="font-semibold text-white truncate">
                                  {p.name}
                                  {p.id === localPlayerId ? ' (তুমি)' : ''}
                                </span>
                                {p.isHost && (
                                  <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" aria-label="হোস্ট" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] font-mono-tabular text-slate-400">
                                  {p.pingMs ?? 34}ms
                                </span>
                                <span
                                  className={`text-xs font-bold ${
                                    isReady ? 'text-emerald-400' : 'text-slate-500'
                                  }`}
                                >
                                  {isReady ? '✓' : '…'}
                                </span>
                                {isHost && p.id !== localPlayerId && (
                                  p.isBot && onRemoveBot ? (
                                    <button
                                      type="button"
                                      onClick={() => onRemoveBot(p.id)}
                                      aria-label={`বট সরাও ${p.name}`}
                                      className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-slate-800 hover:bg-rose-900/70 text-slate-300 hover:text-rose-200"
                                    >
                                      <UserMinus className="w-3.5 h-3.5" />
                                    </button>
                                  ) : !p.isBot && onKickPlayer ? (
                                    <button
                                      type="button"
                                      onClick={() => onKickPlayer(p.id)}
                                      aria-label={`বাদ দাও ${p.name}`}
                                      className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-slate-800 hover:bg-rose-900/70 text-slate-300 hover:text-rose-200"
                                    >
                                      <UserX className="w-3.5 h-3.5" />
                                    </button>
                                  ) : null
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {Array.from({ length: emptySlotCount }).map((_, idx) => (
                          <div
                            key={`m_empty_${idx}`}
                            className="flex items-center justify-between px-3 py-2 rounded-xl border border-dashed border-slate-800 text-[11px] text-slate-500"
                          >
                            <span>খালি স্লট #{snapshot.players.length + idx + 1}</span>
                            <span>উন্মুক্ত</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {mobileTab === 'settings' && (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-200">
                      <label className="flex items-center justify-between gap-1.5 min-h-[40px] px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-400">বাটপার</span>
                        <select
                          disabled={!isHost}
                          value={snapshot.settings.vondoCount}
                          onChange={(e) => onUpdateSettings({ vondoCount: Number(e.target.value) })}
                          className="bg-transparent text-white font-semibold disabled:opacity-60"
                        >
                          <option value={1} className="bg-slate-900">১</option>
                          <option value={2} disabled={snapshot.players.length < 6} className="bg-slate-900">
                            ২ {snapshot.players.length < 6 ? '(৬+)' : ''}
                          </option>
                          <option value={3} disabled={snapshot.players.length < 10} className="bg-slate-900">
                            ৩ {snapshot.players.length < 10 ? '(১০+)' : ''}
                          </option>
                          <option value={4} disabled={snapshot.players.length < 14} className="bg-slate-900">
                            ৪ {snapshot.players.length < 14 ? '(১৪+)' : ''}
                          </option>
                          <option value={5} disabled={snapshot.players.length < 17} className="bg-slate-900">
                            ৫ {snapshot.players.length < 17 ? '(১৭+)' : ''}
                          </option>
                        </select>
                      </label>
                      <label className="flex items-center justify-between gap-1.5 min-h-[40px] px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-400">কিল বিরতি</span>
                        <select
                          disabled={!isHost}
                          value={snapshot.settings.killCooldownSec}
                          onChange={(e) => onUpdateSettings({ killCooldownSec: Number(e.target.value) })}
                          className="bg-transparent text-white font-semibold disabled:opacity-60"
                        >
                          {[12, 18, 25, 30].map((v) => (
                            <option key={v} value={v} className="bg-slate-900">{v} সে.</option>
                          ))}
                        </select>
                      </label>
                      <label className="flex items-center justify-between gap-1.5 min-h-[40px] px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-400">কাজ</span>
                        <select
                          disabled={!isHost}
                          value={snapshot.settings.tasksPerPlayer}
                          onChange={(e) => onUpdateSettings({ tasksPerPlayer: Number(e.target.value) })}
                          className="bg-transparent text-white font-semibold disabled:opacity-60"
                        >
                          {[3, 4, 5, 6, 8, 10, 12, 15].map((v) => (
                            <option key={v} value={v} className="bg-slate-900">{v}</option>
                          ))}
                        </select>
                      </label>
                      <label className="flex items-center justify-between gap-1.5 min-h-[40px] px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-400">সালিশ</span>
                        <select
                          disabled={!isHost}
                          value={snapshot.settings.meetingTimeSec}
                          onChange={(e) => onUpdateSettings({ meetingTimeSec: Number(e.target.value) })}
                          className="bg-transparent text-white font-semibold disabled:opacity-60"
                        >
                          {[20, 30, 45, 60].map((v) => (
                            <option key={v} value={v} className="bg-slate-900">{v} সে.</option>
                          ))}
                        </select>
                      </label>
                      <label className="flex items-center justify-between gap-1.5 min-h-[40px] px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-400">গতি</span>
                        <select
                          disabled={!isHost}
                          value={snapshot.settings.moveSpeed}
                          onChange={(e) => onUpdateSettings({ moveSpeed: Number(e.target.value) })}
                          className="bg-transparent text-white font-semibold disabled:opacity-60"
                        >
                          <option value={7.65} className="bg-slate-900">০.৮৫x</option>
                          <option value={9} className="bg-slate-900">১.০x</option>
                          <option value={11.25} className="bg-slate-900">১.২৫x</option>
                          <option value={13.5} className="bg-slate-900">১.৫x</option>
                          <option value={15.75} className="bg-slate-900">১.৭৫x</option>
                          <option value={18} className="bg-slate-900">২.০x</option>
                        </select>
                      </label>
                      <label className="flex items-center justify-between gap-1.5 min-h-[40px] px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-400">ঘণ্টা</span>
                        <select
                          disabled={!isHost}
                          value={snapshot.settings.emergencyMeetingsPerPlayer}
                          onChange={(e) =>
                            onUpdateSettings({ emergencyMeetingsPerPlayer: Number(e.target.value) })
                          }
                          className="bg-transparent text-white font-semibold disabled:opacity-60"
                        >
                          {[1, 2, 3].map((v) => (
                            <option key={v} value={v} className="bg-slate-900">
                              {v}/{snapshot.settings.emergencyCooldownSec}সে.
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-300">
                      {(
                        [
                          ['confirmEjects', 'আসল পরিচয় দেখাও'],
                          ['anonymousVotes', 'গোপন ভোট'],
                          ['visualTasks', 'লাইভ কাজের দৃশ্য'],
                          ['enableSpecialRoles', 'স্পেশাল রোল'],
                          ['enableNeutralRoles', 'নিরপেক্ষ চরিত্র'],
                          ['autoFillBots', 'অটো বট পূরণ'],
                        ] as const
                      ).map(([key, label]) => (
                        <label
                          key={key}
                          className="flex items-center gap-2 min-h-[38px] px-2 py-1 rounded-lg bg-slate-900/70 border border-slate-800/70 cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            disabled={!isHost}
                            checked={Boolean(snapshot.settings[key])}
                            onChange={(e) => onUpdateSettings({ [key]: e.target.checked })}
                            className="accent-amber-400 w-4 h-4 disabled:opacity-60 shrink-0"
                          />
                          <span className="truncate">{label}</span>
                        </label>
                      ))}
                    </div>

                    <div className="rounded-xl px-3 py-2 bg-slate-950/75 border border-slate-800 text-xs text-slate-300">
                      <span className="font-bold text-amber-300 block mb-0.5">
                        চরিত্রের তালিকা ({snapshot.players.length} জন):
                      </span>
                      <span>{rolePreview.summary}</span>
                    </div>
                  </div>
                )}

                {mobileTab === 'chat' && (
                  <div className="flex flex-col rounded-xl bg-slate-950/70 border border-slate-800 p-2.5 space-y-2">
                    <div className="h-36 overflow-y-auto space-y-1.5 text-xs">
                      {chatCount === 0 ? (
                        <p className="text-[11px] text-slate-500 italic">
                          খেলা শুরুর আগে এখানে আড্ডা দাও...
                        </p>
                      ) : (
                        (snapshot.lobbyChat ?? []).map((m) => {
                          const col =
                            PLAYER_COLORS.find((c) => c.id === m.senderColor) ?? PLAYER_COLORS[0];
                          return (
                            <div key={m.id} className="leading-snug break-words">
                              <span className="font-bold mr-1" style={{ color: col.hex }}>
                                {m.senderName}:
                              </span>
                              <span className="text-slate-200">{m.text}</span>
                            </div>
                          );
                        })
                      )}
                      <div ref={mobileChatEndRef} />
                    </div>
                    <form onSubmit={submitChat} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        maxLength={LOBBY_CHAT_MAX_CHARS}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="মেসেজ লিখো..."
                        aria-label="লবি চ্যাট বার্তা"
                        className="flex-1 min-w-0 min-h-[42px] px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="submit"
                        aria-label="লবি চ্যাট পাঠাও"
                        className="min-w-[44px] min-h-[42px] flex items-center justify-center rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Always-visible Compact Mobile Footer: 3 Tabs + Primary CTA */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => toggleMobileTab('players')}
              className={`min-h-[40px] px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                mobileTab === 'players'
                  ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                  : 'bg-slate-900 border-slate-800 text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                খেলোয়াড় ({snapshot.players.length}/{MAX_MATCH_PLAYERS})
              </span>
            </button>
            <button
              type="button"
              onClick={() => toggleMobileTab('settings')}
              className={`min-h-[40px] px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                mobileTab === 'settings'
                  ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                  : 'bg-slate-900 border-slate-800 text-slate-200'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5 shrink-0" />
              <span>সেটিংস</span>
            </button>
            <button
              type="button"
              onClick={() => toggleMobileTab('chat')}
              className={`min-h-[40px] px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                mobileTab === 'chat'
                  ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                  : 'bg-slate-900 border-slate-800 text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span>আড্ডা{chatCount > 0 ? ` (${chatCount})` : ''}</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="text-[11px] text-center truncate px-1">
              {isHost ? (
                startCheck.ok ? (
                  <span className="text-emerald-300 font-semibold">
                    সবাই প্রস্তুত! শুরু করতে চাপ দাও
                  </span>
                ) : (
                  <span className="text-amber-300 font-semibold">{startCheck.reason}</span>
                )
              ) : (
                <span className="text-slate-300">
                  {localPlayer?.ready ? 'রেডি হয়েছ — হোস্ট শুরু করবে' : 'প্রস্তুত হলে রেডি হও চাপো'}
                </span>
              )}
            </div>
            {renderPrimaryCta(true)}
          </div>
        </div>

        {/* DESKTOP 3-COLUMN WAITING DOCK (>= 1024px) */}
        <div
          className="hidden lg:block pointer-events-auto w-full max-w-5xl rounded-2xl p-4 border border-white/12 shadow-2xl space-y-3"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.93)' }}
        >
          {/* Customize Bar + Bot Add/Clear + Walk Hint */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="lobby-name-input" className="text-[11px] font-semibold text-slate-400">
                নাম:
              </label>
              <input
                id="lobby-name-input"
                type="text"
                maxLength={PLAYER_NAME_MAX_CHARS}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={submitName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitName();
                  }
                }}
                className="w-36 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={submitName}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-amber-300"
              >
                সেভ
              </button>

              <div
                className="flex flex-wrap items-center gap-1 pl-1 max-w-md"
                role="radiogroup"
                aria-label="লবির রঙ বেছে নাও"
              >
                {PLAYER_COLORS.map((c) => {
                  const isMine = localPlayer?.color === c.id;
                  const isTaken = takenColors.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={isTaken}
                      onClick={() => onCustomize(undefined, c.id)}
                      aria-label={`রঙ ${c.label}${isTaken ? ' (নেওয়া হয়েছে)' : ''}`}
                      aria-checked={isMine}
                      role="radio"
                      title={isTaken ? `${c.label} নেওয়া হয়ে গেছে` : c.label}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        isMine
                          ? 'border-amber-300 scale-110'
                          : isTaken
                            ? 'border-slate-700 opacity-25 cursor-not-allowed'
                            : 'border-white/30 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-400">
                WASD হাঁটা · মাউস ঘোরানো · ১–৬ মিম সাউন্ড
              </span>
              {isHost && (
                <>
                  <button
                    type="button"
                    onClick={onAddBot}
                    disabled={snapshot.players.length >= MAX_MATCH_PLAYERS}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-slate-200 flex items-center gap-1"
                  >
                    <Bot className="w-3.5 h-3.5 text-amber-300" />
                    + বট যোগ করো
                  </button>
                  {snapshot.players.some((p) => p.isBot) && (
                    <button
                      type="button"
                      onClick={onRemoveBots}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                    >
                      সব বট সরাও
                    </button>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={() => setShowSettingsDrawer((v) => !v)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-200 flex items-center gap-1"
              >
                <Settings2 className="w-3.5 h-3.5" />
                {showSettingsDrawer ? 'সেটিংস লুকাও' : 'ম্যাচ সেটিংস'}
              </button>
            </div>
          </div>

          {/* 3-Column Grid: Player Slots | Host Settings + Role Pool | Lobby Chat */}
          <div className="grid grid-cols-12 gap-3">
            {/* Slots List */}
            <div className="col-span-4 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                <span>
                  মহল্লার খেলোয়াড় ({snapshot.players.length}/{MAX_MATCH_PLAYERS} · সর্বনিম্ন {MIN_MATCH_PLAYERS})
                </span>
                <span className="text-amber-300">{rolePreview.batparCount} বাটপার</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                {snapshot.players.map((p) => {
                  const col = PLAYER_COLORS.find((c) => c.id === p.color) ?? PLAYER_COLORS[0];
                  const isReady = p.isHost || p.isBot || p.ready;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs ${
                        p.id === localPlayerId
                          ? 'bg-slate-900 border-amber-400/50'
                          : 'bg-slate-900/80 border-slate-800'
                      }`}
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
                        {p.isHost && (
                          <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" aria-label="হোস্ট" />
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono-tabular text-slate-400">
                          {p.pingMs ?? 34}ms
                        </span>
                        <span
                          className={`text-[10px] font-bold ${
                            isReady ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                          title={isReady ? 'প্রস্তুত' : 'অপেক্ষায়'}
                        >
                          {isReady ? '✓' : '…'}
                        </span>
                        {isHost && p.id !== localPlayerId && (
                          p.isBot && onRemoveBot ? (
                            <button
                              type="button"
                              onClick={() => onRemoveBot(p.id)}
                              aria-label={`বট সরাও ${p.name}`}
                              className="p-1 rounded bg-slate-800 hover:bg-rose-900/70 text-slate-300 hover:text-rose-200"
                            >
                              <UserMinus className="w-3 h-3" />
                            </button>
                          ) : !p.isBot && onKickPlayer ? (
                            <button
                              type="button"
                              onClick={() => onKickPlayer(p.id)}
                              aria-label={`বাদ দাও ${p.name}`}
                              className="p-1 rounded bg-slate-800 hover:bg-rose-900/70 text-slate-300 hover:text-rose-200"
                            >
                              <UserX className="w-3 h-3" />
                            </button>
                          ) : null
                        )}
                      </div>
                    </div>
                  );
                })}

                {Array.from({ length: emptySlotCount }).map((_, idx) => (
                  <div
                    key={`empty_${idx}`}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-xl border border-dashed border-slate-800 text-[11px] text-slate-500"
                  >
                    <span>খালি স্লট #{snapshot.players.length + idx + 1}</span>
                    <span>উন্মুক্ত</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Host Settings + Role Pool Preview */}
            {showSettingsDrawer && (
              <div className="col-span-5 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                  <span>{isHost ? 'হোস্ট সেটিংস (লাইভ)' : 'রুমের সেটিংস'}</span>
                  <span className="text-sky-300">
                    {snapshot.settings.enableSpecialRoles ? 'স্পেশাল রোল চালু' : 'সাধারণ মোড'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[11px] text-slate-200">
                  <label className="flex items-center justify-between gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">বাটপার</span>
                    <select
                      disabled={!isHost}
                      value={snapshot.settings.vondoCount}
                      onChange={(e) => onUpdateSettings({ vondoCount: Number(e.target.value) })}
                      className="bg-transparent text-white font-semibold disabled:opacity-60"
                    >
                      <option value={1} className="bg-slate-900">১</option>
                      <option value={2} disabled={snapshot.players.length < 6} className="bg-slate-900">
                        ২ {snapshot.players.length < 6 ? '(৬+ জন)' : ''}
                      </option>
                      <option value={3} disabled={snapshot.players.length < 10} className="bg-slate-900">
                        ৩ {snapshot.players.length < 10 ? '(১০+ জন)' : ''}
                      </option>
                      <option value={4} disabled={snapshot.players.length < 14} className="bg-slate-900">
                        ৪ {snapshot.players.length < 14 ? '(১৪+ জন)' : ''}
                      </option>
                      <option value={5} disabled={snapshot.players.length < 17} className="bg-slate-900">
                        ৫ {snapshot.players.length < 17 ? '(১৭+ জন)' : ''}
                      </option>
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">কিল বিরতি</span>
                    <select
                      disabled={!isHost}
                      value={snapshot.settings.killCooldownSec}
                      onChange={(e) => onUpdateSettings({ killCooldownSec: Number(e.target.value) })}
                      className="bg-transparent text-white font-semibold disabled:opacity-60"
                    >
                      {[12, 18, 25, 30].map((v) => (
                        <option key={v} value={v} className="bg-slate-900">{v} সে.</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">কাজ</span>
                    <select
                      disabled={!isHost}
                      value={snapshot.settings.tasksPerPlayer}
                      onChange={(e) => onUpdateSettings({ tasksPerPlayer: Number(e.target.value) })}
                      className="bg-transparent text-white font-semibold disabled:opacity-60"
                    >
                      {[3, 4, 5, 6, 8, 10, 12, 15].map((v) => (
                        <option key={v} value={v} className="bg-slate-900">{v}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">সালিশ</span>
                    <select
                      disabled={!isHost}
                      value={snapshot.settings.meetingTimeSec}
                      onChange={(e) => onUpdateSettings({ meetingTimeSec: Number(e.target.value) })}
                      className="bg-transparent text-white font-semibold disabled:opacity-60"
                    >
                      {[20, 30, 45, 60].map((v) => (
                        <option key={v} value={v} className="bg-slate-900">{v} সে.</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">গতি</span>
                    <select
                      disabled={!isHost}
                      value={snapshot.settings.moveSpeed}
                      onChange={(e) => onUpdateSettings({ moveSpeed: Number(e.target.value) })}
                      className="bg-transparent text-white font-semibold disabled:opacity-60"
                    >
                      <option value={7.65} className="bg-slate-900">০.৮৫x</option>
                      <option value={9} className="bg-slate-900">১.০x</option>
                      <option value={11.25} className="bg-slate-900">১.২৫x</option>
                      <option value={13.5} className="bg-slate-900">১.৫x</option>
                      <option value={15.75} className="bg-slate-900">১.৭৫x</option>
                      <option value={18} className="bg-slate-900">২.০x</option>
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">ঘণ্টা/বিরতি</span>
                    <select
                      disabled={!isHost}
                      value={snapshot.settings.emergencyMeetingsPerPlayer}
                      onChange={(e) =>
                        onUpdateSettings({ emergencyMeetingsPerPlayer: Number(e.target.value) })
                      }
                      className="bg-transparent text-white font-semibold disabled:opacity-60"
                    >
                      {[1, 2, 3].map((v) => (
                        <option key={v} value={v} className="bg-slate-900">
                          {v}/{snapshot.settings.emergencyCooldownSec}সে.
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Boolean toggles */}
                <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-slate-300 px-1">
                  {(
                    [
                      ['confirmEjects', 'আসল পরিচয় দেখাও'],
                      ['anonymousVotes', 'গোপন ভোট'],
                      ['visualTasks', 'লাইভ কাজের দৃশ্য'],
                      ['enableSpecialRoles', 'স্পেশাল রোল'],
                      ['enableNeutralRoles', 'নিরপেক্ষ চরিত্র'],
                      ['autoFillBots', 'অটো বট পূরণ'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        disabled={!isHost}
                        checked={Boolean(snapshot.settings[key])}
                        onChange={(e) => onUpdateSettings({ [key]: e.target.checked })}
                        className="accent-amber-400 w-3.5 h-3.5 disabled:opacity-60"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>

                {/* Role Pool Preview */}
                <div className="rounded-xl px-2.5 py-2 bg-slate-950/75 border border-slate-800 text-[11px] text-slate-300">
                  <span className="font-bold text-amber-300 block mb-0.5">
                    চরিত্রের তালিকা ({snapshot.players.length} জন):
                  </span>
                  <span>{rolePreview.summary}</span>
                </div>
              </div>
            )}

            {/* Lobby Chat */}
            <div
              className={`${
                showSettingsDrawer ? 'col-span-3' : 'col-span-8'
              } flex flex-col rounded-xl bg-slate-950/70 border border-slate-800 p-2.5 h-44`}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 pb-1.5 border-b border-slate-800/80">
                <MessageSquare className="w-3.5 h-3.5 text-amber-300" />
                <span>লবি আড্ডা</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 py-1.5 text-xs">
                {chatCount === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">
                    খেলা শুরুর আগে এখানে আড্ডা দাও...
                  </p>
                ) : (
                  (snapshot.lobbyChat ?? []).map((m) => {
                    const col = PLAYER_COLORS.find((c) => c.id === m.senderColor) ?? PLAYER_COLORS[0];
                    return (
                      <div key={m.id} className="leading-snug break-words">
                        <span className="font-bold mr-1" style={{ color: col.hex }}>
                          {m.senderName}:
                        </span>
                        <span className="text-slate-200">{m.text}</span>
                      </div>
                    );
                  })
                )}
                <div ref={desktopChatEndRef} />
              </div>
              <form onSubmit={submitChat} className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  maxLength={LOBBY_CHAT_MAX_CHARS}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="মেসেজ লিখো..."
                  aria-label="লবি চ্যাট বার্তা"
                  className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  aria-label="লবি চ্যাট পাঠাও"
                  className="p-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>

          {/* Footer Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
            <div className="text-xs text-slate-300">
              {isHost ? (
                startCheck.ok ? (
                  <span className="text-emerald-300 font-semibold">
                    সবাই প্রস্তুত! খেলা শুরু করতে শুরু বোতামে চাপ দাও।
                  </span>
                ) : (
                  <span className="text-amber-300 font-semibold">{startCheck.reason}</span>
                )
              ) : (
                <span className="text-slate-300">
                  {localPlayer?.ready
                    ? 'রেডি হয়েছ! হোস্ট শুরু করলেই ম্যাচ শুরু হবে।'
                    : 'রেডি বাটনে চাপ দাও — সবাই রেডি হলে হোস্ট শুরু করবে!'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">{renderPrimaryCta(false)}</div>
          </div>
        </div>
      </div>
    </div>
  );
});
