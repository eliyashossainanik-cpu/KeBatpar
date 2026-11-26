import { useEffect, useMemo, useRef, useState } from 'react';
import { PLAYER_COLORS, type RoomSnapshot } from '../shared/types';
import { QUICK_BANGLISH_ALIVE, QUICK_BANGLISH_GHOST } from '../shared/banglaComedy';
import { getQuickMemeList, type MemeSoundId } from '../audio/soundEngine';
import { subscribeMemePack } from '../audio/memePackStore';
import {
  Check,
  X,
  Send,
  SkipForward,
  Volume2,
  MessageSquareText,
  Megaphone,
  Vote,
  MessageCircle,
  Crown,
} from 'lucide-react';

export interface MeetingModalProps {
  snapshot: RoomSnapshot;
  localPlayerId: string;
  onSendChat: (text: string) => void;
  onCastVote: (targetId: string | 'skip') => void;
  onPlayMeme?: (memeId: MemeSoundId) => void;
  onTypingChange?: (typing: boolean) => void;
}

function ChibiSuspectAvatar({
  hex,
  alive,
  isCaller,
}: {
  hex: string;
  alive: boolean;
  isCaller: boolean;
}) {
  return (
    <div className="relative shrink-0 w-9 h-9 sm:w-10 sm:h-10 [@media(max-height:540px)]:w-8 [@media(max-height:540px)]:h-8">
      <svg viewBox="0 0 48 48" className={`w-full h-full ${alive ? '' : 'opacity-50 grayscale'}`}>
        {/* Backpack */}
        <rect x="3" y="16" width="8" height="18" rx="3.5" fill="#94a3b8" stroke="#0f172a" strokeWidth="2.2" />
        {/* Body */}
        <rect
          x="9"
          y="7"
          width="32"
          height="35"
          rx="15"
          fill={hex}
          stroke={isCaller ? '#fbbf24' : '#0f172a'}
          strokeWidth={isCaller ? '2.8' : '2.2'}
        />
        {alive ? (
          <>
            {/* Glossy Visor */}
            <rect x="20" y="13" width="18" height="11" rx="5.5" fill="#bae6fd" stroke="#0f172a" strokeWidth="2.2" />
            <ellipse cx="32" cy="16.5" rx="3" ry="1.4" fill="#ffffff" />
            {/* Rosy Cheeks */}
            <ellipse cx="18" cy="27" rx="2.6" ry="1.5" fill="#fb7185" opacity="0.85" />
            <ellipse cx="36" cy="27" rx="2.6" ry="1.5" fill="#fb7185" opacity="0.85" />
          </>
        ) : (
          <>
            {/* KO Visor with X eyes */}
            <rect x="20" y="13" width="18" height="11" rx="5.5" fill="#475569" stroke="#0f172a" strokeWidth="2.2" />
            <path d="M24 16 L28 20 M28 16 L24 20 M31 16 L35 20 M35 16 L31 20" stroke="#f8fafc" strokeWidth="1.8" strokeLinecap="round" />
          </>
        )}
      </svg>
      {isCaller && alive && (
        <span
          title="এই সালিশ ডেকেছে"
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow"
        >
          <Megaphone className="w-2.5 h-2.5" />
        </span>
      )}
    </div>
  );
}

export function MeetingModal({
  snapshot,
  localPlayerId,
  onSendChat,
  onCastVote,
  onPlayMeme,
  onTypingChange,
}: MeetingModalProps) {
  const [chatText, setChatText] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState<string | 'skip' | null>(null);
  const [queuedVoteTarget, setQueuedVoteTarget] = useState<string | 'skip' | null>(null);
  const [mobileTab, setMobileTab] = useState<'vote' | 'chat'>('vote');
  const [seenChatCount, setSeenChatCount] = useState(0);
  const [, setPackVer] = useState(0);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const isLocalTypingRef = useRef(false);

  useEffect(() => subscribeMemePack(() => setPackVer((v) => v + 1)), []);
  const quickMemes = getQuickMemeList();

  const localPlayer = snapshot.players.find((p) => p.id === localPlayerId);
  const caller = snapshot.players.find((p) => p.id === snapshot.meetingCallerId);
  const isVoteResults = snapshot.phase === 'vote_results';
  const discussionSec = Math.max(0, Math.ceil(snapshot.discussionTimer ?? 0));
  const inDiscussion = !isVoteResults && discussionSec > 0;
  const canSelectSuspect = Boolean(!isVoteResults && localPlayer?.alive && !localPlayer?.hasVoted);
  const canVote = Boolean(canSelectSuspect && !inDiscussion);

  const visibleChat = useMemo(
    () => snapshot.chat.filter((msg) => !msg.ghostOnly || !localPlayer?.alive),
    [snapshot.chat, localPlayer?.alive],
  );

  useEffect(() => {
    if (mobileTab === 'chat') {
      setSeenChatCount(visibleChat.length);
    }
  }, [mobileTab, visibleChat.length]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [visibleChat.length, mobileTab]);

  // Auto-submit queued pre-vote the moment Discussion ends
  useEffect(() => {
    if (canVote && queuedVoteTarget) {
      const target = queuedVoteTarget;
      setQueuedVoteTarget(null);
      setSelectedTargetId(null);
      onCastVote(target);
    }
  }, [canVote, queuedVoteTarget, onCastVote]);

  useEffect(() => {
    if (!canSelectSuspect || isVoteResults) {
      setSelectedTargetId(null);
      setQueuedVoteTarget(null);
    }
  }, [canSelectSuspect, isVoteResults]);

  const unreadCount = mobileTab === 'vote' ? Math.max(0, visibleChat.length - seenChatCount) : 0;
  const quickMsgPool = localPlayer?.alive ? QUICK_BANGLISH_ALIVE : QUICK_BANGLISH_GHOST;
  const skipVoters = isVoteResults
    ? snapshot.players.filter((v) => v.alive && (!v.hasVoted || v.votedFor === 'skip'))
    : [];

  const alivePlayers = snapshot.players.filter((p) => p.alive);
  const votedCount = alivePlayers.filter((p) => p.hasVoted).length;

  const sortedPlayers = useMemo(() => {
    return [...snapshot.players].sort((a, b) => {
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      if (a.id === localPlayerId) return -1;
      if (b.id === localPlayerId) return 1;
      return 0;
    });
  }, [snapshot.players, localPlayerId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      if (isLocalTypingRef.current) {
        isLocalTypingRef.current = false;
        onTypingChange?.(false);
      }
    };
  }, [onTypingChange]);

  const setTypingActive = (active: boolean) => {
    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (active) {
      if (!isLocalTypingRef.current) {
        isLocalTypingRef.current = true;
        onTypingChange?.(true);
      }
      typingTimeoutRef.current = window.setTimeout(() => {
        typingTimeoutRef.current = null;
        if (isLocalTypingRef.current) {
          isLocalTypingRef.current = false;
          onTypingChange?.(false);
        }
      }, 2200);
    } else if (isLocalTypingRef.current) {
      isLocalTypingRef.current = false;
      onTypingChange?.(false);
    }
  };

  const activeTypers = useMemo(() => {
    const ids = snapshot.typingPlayerIds ?? [];
    if (ids.length === 0) return [];
    const idSet = new Set(ids);
    return snapshot.players.filter((p) => p.alive && p.id !== localPlayerId && idSet.has(p.id));
  }, [snapshot.typingPlayerIds, snapshot.players, localPlayerId]);

  const handleSubmitChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    setTypingActive(false);
    onSendChat(chatText);
    setChatText('');
  };

  const confirmVote = (target: string | 'skip') => {
    if (!canSelectSuspect) return;
    if (inDiscussion) {
      setQueuedVoteTarget(target);
      setSelectedTargetId(null);
      return;
    }
    setSelectedTargetId(null);
    setQueuedVoteTarget(null);
    onCastVote(target);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="জরুরি সালিশ ও ভোট"
      className="fixed inset-0 z-30 flex items-center justify-center p-1.5 sm:p-3 lg:p-5"
      style={{ backgroundColor: 'rgba(5, 9, 17, 0.88)' }}
    >
      <div
        className="w-full max-w-5xl h-[95dvh] sm:h-[92dvh] lg:h-[min(86dvh,720px)] rounded-2xl border border-amber-400/35 shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: 'rgba(13, 20, 36, 0.99)' }}
      >
        {/* Compact Courtroom Header */}
        <header className="px-3 sm:px-5 py-2 sm:py-3 [@media(max-height:540px)]:py-1.5 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 bg-slate-950/60">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300 truncate">
              <span>
                {snapshot.meetingReason === 'body'
                  ? 'লাশ পাওয়া গেছে!'
                  : 'জরুরি সালিশ ঘণ্টা'}
              </span>
              {caller && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">ডেকেছে {caller.name}</span>
                </>
              )}
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span className="hidden sm:inline font-mono-tabular text-slate-300">
                {votedCount}/{alivePlayers.length} ভোট দিয়েছে
              </span>
            </div>
            <h2 className="font-display text-base sm:text-xl [@media(max-height:540px)]:text-base font-extrabold text-white truncate">
              {isVoteResults
                ? 'ভোটের ফলাফল · পুকুরে কে যাবে?'
                : snapshot.meetingReason === 'body'
                  ? 'লাশ পাওয়া গেছে! কে বাটপার বলো?'
                  : 'জরুরি সালিশ · কে বাটপার ধরো!'}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {localPlayer?.specialRole === 'neta' && localPlayer.alive && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-400/15 border border-amber-400/35 text-[11px] font-bold text-amber-300">
                <Crown className="w-3 h-3" /> ২ গুণ ভোট
              </span>
            )}
            <div className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-right">
              <span className="block text-[10px] text-slate-400 leading-none">
                {isVoteResults ? 'রায়' : inDiscussion ? 'আলোচনা' : 'ভোটের সময়'}
              </span>
              <span
                className={`font-mono-tabular text-base sm:text-xl [@media(max-height:540px)]:text-sm font-extrabold leading-tight ${
                  inDiscussion ? 'text-sky-300' : 'text-amber-300'
                }`}
              >
                {isVoteResults
                  ? 'লকড'
                  : inDiscussion
                    ? `${discussionSec} সে.`
                    : `${Math.max(0, Math.ceil(snapshot.meetingTimer))} সে.`}
              </span>
            </div>
          </div>
        </header>

        {/* Portrait Mobile (< 640px) Tab Switcher */}
        <div className="sm:hidden px-2.5 pt-2 pb-1.5 border-b border-slate-800/80 bg-slate-950/40 shrink-0">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => setMobileTab('vote')}
              className={`min-h-[40px] px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                mobileTab === 'vote'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Vote className="w-4 h-4 shrink-0" />
              <span>সালিশ ভোট</span>
              {canVote && (
                <span className="font-mono-tabular text-[10px] opacity-80">
                  ({votedCount}/{alivePlayers.length})
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('chat')}
              className={`min-h-[40px] px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                mobileTab === 'chat'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>আড্ডা চ্যাট</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono-tabular text-[10px]">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Main Body: Split Side-by-Side on >=640px (Landscape Phones & Desktop), Tabbed on Portrait Phones */}
        <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-12 overflow-hidden">
          {/* LEFT: Suspect Voting Roster */}
          <section
            aria-label="সন্দেহভাজন ভোটের তালিকা"
            className={`${
              mobileTab === 'vote' ? 'flex' : 'hidden sm:flex'
            } sm:col-span-7 flex-col min-h-0 sm:border-r border-slate-800`}
          >
            <div className="flex-1 min-h-0 p-2.5 sm:p-3.5 [@media(max-height:540px)]:p-2 overflow-y-auto">
              {inDiscussion && (
                <div className="mb-2.5 px-3 py-2 rounded-xl bg-sky-950/75 border border-sky-400/40 text-sky-100 text-xs flex items-center justify-between gap-2">
                  <span className="font-semibold">
                    আলোচনা চলছে — সবার কথা শোনো, এরপর ভোট চালু হবে!
                  </span>
                  <span className="font-mono-tabular font-extrabold text-sky-300 shrink-0">
                    {discussionSec} সে.
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 gap-2 [@media(max-height:540px)]:gap-1.5">
                {sortedPlayers.map((p) => {
                  const c = PLAYER_COLORS.find((col) => col.id === p.color) ?? PLAYER_COLORS[0];
                  const isSelf = p.id === localPlayerId;
                  const isVotedByMe = localPlayer?.votedFor === p.id;
                  const isQueuedByMe = inDiscussion && queuedVoteTarget === p.id;
                  const isSelected = canSelectSuspect && selectedTargetId === p.id;
                  const isEjectedWinner = isVoteResults && snapshot.ejection?.ejectedId === p.id;
                  const votersForP = isVoteResults
                    ? snapshot.players.filter((v) => v.alive && v.votedFor === p.id)
                    : [];
                  const totalVoteWeight = votersForP.reduce(
                    (acc, voter) => acc + (voter.specialRole === 'neta' ? 2 : 1),
                    0,
                  );

                  return (
                    <div
                      key={p.id}
                      className={`rounded-xl border transition-colors ${
                        !p.alive
                          ? 'bg-slate-950/75 border-slate-900 opacity-55'
                          : isEjectedWinner
                            ? 'bg-rose-950/75 border-rose-400'
                            : isVotedByMe || isQueuedByMe
                              ? 'bg-amber-950/65 border-amber-400'
                              : isSelected
                                ? 'bg-slate-800/95 border-amber-400'
                                : 'bg-slate-900/90 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {/* Big Tap-to-Select Suspect Row */}
                      <button
                        type="button"
                        disabled={!p.alive || !canSelectSuspect}
                        onClick={() => {
                          if (!canSelectSuspect || !p.alive) return;
                          setSelectedTargetId((prev) => (prev === p.id ? null : p.id));
                        }}
                        aria-label={`সন্দেহভাজন বাছাই ${p.name}`}
                        className="w-full min-h-[54px] [@media(max-height:540px)]:min-h-[46px] p-2 sm:p-2.5 [@media(max-height:540px)]:p-1.5 flex items-center justify-between gap-2 text-left disabled:cursor-default active:scale-[0.99] transition-transform"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ChibiSuspectAvatar
                            hex={c.hex}
                            alive={p.alive}
                            isCaller={snapshot.meetingCallerId === p.id}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="font-bold text-xs sm:text-sm text-white truncate">
                                {p.name}
                              </span>
                              {isSelf && (
                                <span className="text-[10px] font-bold text-amber-300 shrink-0">
                                  (তুমি)
                                </span>
                              )}
                              {(snapshot.netaRevealedId === p.id ||
                                (isSelf && localPlayer?.specialRole === 'neta')) && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/45 text-amber-300 text-[9px] font-extrabold tracking-wide shrink-0">
                                  নেতা · ২ গুণ
                                </span>
                              )}
                            </div>
                            <span className="block text-[11px] text-slate-400 truncate">
                              {!p.alive
                                ? 'পুকুরে চুবানি খেয়েছে'
                                : isVotedByMe
                                  ? 'তোমার ভোট লকড'
                                  : isQueuedByMe
                                    ? `প্রি-মার্ক (${discussionSec} সে.)`
                                    : p.hasVoted
                                      ? 'ভোট দিয়েছে'
                                      : snapshot.meetingCallerId === p.id
                                        ? 'সালিশ ডেকেছে!'
                                        : 'কথা বলছে...'}
                            </span>
                          </div>
                        </div>

                        {/* Right Status Indicator */}
                        <div className="shrink-0 flex items-center gap-1">
                          {isVotedByMe && (
                            <span className="px-2 py-1 rounded-lg bg-amber-400 text-slate-950 text-[10px] font-extrabold flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> ভোট লক
                            </span>
                          )}
                          {isQueuedByMe && !isVotedByMe && (
                            <span className="px-2 py-1 rounded-lg bg-sky-400 text-slate-950 text-[10px] font-extrabold flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> প্রি-ভোট
                            </span>
                          )}
                          {!isVotedByMe && !isQueuedByMe && p.alive && p.hasVoted && !isVoteResults && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[10px] font-bold">
                              ভোট ডান ✓
                            </span>
                          )}
                          {isVoteResults && totalVoteWeight > 0 && (
                            <span className="font-mono-tabular px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-400/40 text-rose-200 text-xs font-extrabold">
                              {totalVoteWeight}
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Selected Target Confirm / Cancel Row (Anti-Mis-Tap) */}
                      {isSelected && (
                        <div className="px-2 pb-2 pt-0.5 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => confirmVote(p.id)}
                            aria-label={`${p.name} এর বিরুদ্ধে ভোট নিশ্চিত করো`}
                            className={`flex-1 min-h-[38px] px-2.5 py-1.5 rounded-lg ${
                              inDiscussion
                                ? 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                                : 'bg-rose-500 hover:bg-rose-400 text-white'
                            } active:scale-95 font-display font-bold text-xs flex items-center justify-center gap-1 transition-transform whitespace-nowrap`}
                          >
                            <Check className="w-3.5 h-3.5 shrink-0" />
                            <span>{inDiscussion ? `ভোট লক (${discussionSec} সে.)` : 'পুকুরে ফেলো!'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedTargetId(null)}
                            aria-label="বাছাই বাতিল করো"
                            className="min-h-[38px] min-w-[38px] px-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center justify-center"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Live Vote Tally Pips During vote_results */}
                      {isVoteResults && votersForP.length > 0 && (
                        <div className="px-2.5 pb-2 pt-1 border-t border-slate-800/80 flex flex-wrap items-center gap-1">
                          {votersForP.flatMap((voter) => {
                            const vc =
                              PLAYER_COLORS.find((col) => col.id === voter.color) ?? PLAYER_COLORS[0];
                            const weight = voter.specialRole === 'neta' ? 2 : 1;
                            return Array.from({ length: weight }, (_, pipIdx) => (
                              <span
                                key={`${voter.id}_${pipIdx}`}
                                title={snapshot.settings.anonymousVotes ? 'গোপন ভোট' : voter.name}
                                className="w-4 h-4 rounded-full border border-white/35 inline-block"
                                style={{
                                  backgroundColor: snapshot.settings.anonymousVotes
                                    ? '#94a3b8'
                                    : vc.hex,
                                }}
                              />
                            ));
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Thumb Action Bar (Skip Vote / Tally Status) */}
            <div className="px-2.5 sm:px-3.5 py-2 [@media(max-height:540px)]:py-1.5 border-t border-slate-800 bg-slate-950/75 flex items-center justify-between gap-2 shrink-0">
              {isVoteResults ? (
                <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="font-semibold">স্কিপ:</span>
                    {skipVoters.length === 0 ? (
                      <span className="text-slate-500">কেউ স্কিপ করেনি</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        {skipVoters.map((voter) => {
                          const vc =
                            PLAYER_COLORS.find((col) => col.id === voter.color) ?? PLAYER_COLORS[0];
                          return (
                            <span
                              key={voter.id}
                              title={snapshot.settings.anonymousVotes ? 'গোপন স্কিপ' : voter.name}
                              className="w-4 h-4 rounded-full border border-white/30 inline-block"
                              style={{
                                backgroundColor: snapshot.settings.anonymousVotes
                                  ? '#94a3b8'
                                  : vc.hex,
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <span className="font-bold text-amber-300">
                    {snapshot.ejection?.ejectedName
                      ? `${snapshot.ejection.ejectedName}-কে পুকুরে চুবানি!`
                      : snapshot.ejection?.reason === 'tie'
                        ? 'ভোট সমান — কেউ পুকুরে যাবে না!'
                        : 'সবাই স্কিপ করেছে — বাটপার বাঁচলো!'}
                  </span>
                </div>
              ) : (
                <>
                  <span className="text-[11px] sm:text-xs text-slate-300 truncate">
                    {!localPlayer?.alive
                      ? 'ভূত মোড: ভোট বন্ধ, শুধু চ্যাট চালু।'
                      : inDiscussion
                        ? queuedVoteTarget
                          ? `প্রি-ভোট লকড! ${discussionSec} সে. পর জমা হবে`
                          : `আলোচনা (${discussionSec} সে.) — প্রি-মার্ক করতে ট্যাপ করো!`
                        : localPlayer.hasVoted
                          ? 'ভোট লক হয়েছে! বাকি সবার জন্য অপেক্ষা...'
                          : 'সন্দেহভাজন বেছে পুকুরে ফেলো, বা স্কিপ করো!'}
                  </span>

                  {selectedTargetId === 'skip' && canSelectSuspect ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => confirmVote('skip')}
                        className={`min-h-[42px] px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 whitespace-nowrap ${
                          inDiscussion
                            ? 'bg-sky-400 hover:bg-sky-300 text-slate-950'
                            : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />{' '}
                        {inDiscussion ? `স্কিপ লক (${discussionSec} সে.)` : 'স্কিপ নিশ্চিত'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTargetId(null)}
                        aria-label="স্কিপ বাতিল"
                        className="min-h-[42px] min-w-[40px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!canSelectSuspect}
                      onClick={() => setSelectedTargetId('skip')}
                      className={`min-h-[42px] [@media(max-height:540px)]:min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap ${
                        localPlayer?.votedFor === 'skip' || (inDiscussion && queuedVoteTarget === 'skip')
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 border border-slate-700'
                      }`}
                    >
                      <SkipForward className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {inDiscussion && queuedVoteTarget === 'skip'
                          ? `স্কিপ লকড (${discussionSec} সে.)`
                          : 'স্কিপ করো'}
                      </span>
                    </button>
                  )}
                </>
              )}
            </div>
          </section>

          {/* RIGHT: Live Adda Chat + Quick Roasts + Meme SFX */}
          <section
            aria-label="মহল্লা আড্ডা চ্যাট"
            className={`${
              mobileTab === 'chat' ? 'flex' : 'hidden sm:flex'
            } sm:col-span-5 flex-col min-h-0 bg-slate-950/35`}
          >
            <div className="px-3 py-2 [@media(max-height:540px)]:py-1.5 border-b border-slate-800 text-xs font-semibold text-slate-300 flex items-center justify-between shrink-0">
              <span>মহল্লা আড্ডা চ্যাট</span>
              {!localPlayer?.alive ? (
                <span className="text-sky-300">ভূত চ্যাট</span>
              ) : (
                <span className="text-[11px] text-slate-400">সবাই দেখছে</span>
              )}
            </div>

            <div
              ref={chatScrollRef}
              className="flex-1 min-h-0 p-2.5 sm:p-3 space-y-2 overflow-y-auto"
            >
              {visibleChat.map((msg) => {
                const c = PLAYER_COLORS.find((col) => col.id === msg.senderColor) ?? PLAYER_COLORS[0];
                return (
                  <div
                    key={msg.id}
                    className={`rounded-xl px-2.5 py-1.5 text-xs ${
                      msg.system
                        ? 'bg-amber-950/60 border border-amber-500/30 text-amber-200'
                        : msg.ghostOnly
                          ? 'bg-sky-950/50 border border-sky-500/30 text-sky-100'
                          : 'bg-slate-900 text-slate-200 border border-slate-800/70'
                    }`}
                  >
                    {!msg.system && (
                      <div
                        className="flex items-center gap-1.5 font-bold text-[11px]"
                        style={{ color: c.id === 'kalo' ? '#cbd5e1' : c.hex }}
                      >
                        <span>{msg.senderName}</span>
                      </div>
                    )}
                    <p className="leading-snug">{msg.text}</p>
                  </div>
                );
              })}
              {activeTypers.length > 0 && localPlayer?.alive && (
                <div
                  aria-live="polite"
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900/75 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1.5"
                >
                  <span className="inline-flex gap-0.5" aria-hidden="true">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-bounce [animation-delay:120ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-bounce [animation-delay:240ms]" />
                  </span>
                  <span className="truncate">
                    {activeTypers.length === 1
                      ? `${activeTypers[0].name} লিখছে...`
                      : `${activeTypers.slice(0, 2).map((t) => t.name).join(', ')} লিখছে...`}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Bangla Roasts */}
            <div
              role="region"
              aria-label="দ্রুত বাংলা বার্তা"
              className="px-2.5 py-1.5 border-t border-slate-800 bg-slate-900/80 flex items-center gap-1.5 overflow-x-auto shrink-0"
            >
              <MessageSquareText className="w-3.5 h-3.5 text-sky-300 shrink-0" />
              {quickMsgPool.map((qmsg) => (
                <button
                  key={qmsg}
                  type="button"
                  onClick={() => onSendChat(qmsg)}
                  className="min-h-[32px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-sky-400 hover:text-slate-950 text-[11px] font-semibold text-sky-200 whitespace-nowrap transition-colors shrink-0"
                >
                  {qmsg}
                </button>
              ))}
            </div>

            {onPlayMeme && (
              <div
                role="region"
                aria-label="কুইক ভয়েস ও মিম সাউন্ড"
                className="px-2.5 py-1.5 border-t border-slate-800 bg-slate-950/70 flex items-center gap-1.5 overflow-x-auto shrink-0"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                {quickMemes.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onPlayMeme(m.id)}
                    className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors shrink-0 ${
                      m.isVoicePack
                        ? 'bg-emerald-950/85 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-400 hover:text-slate-950'
                        : 'bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-amber-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={handleSubmitChat}
              className="p-2 sm:p-2.5 border-t border-slate-800 flex items-center gap-1.5 shrink-0"
            >
              <input
                type="text"
                maxLength={140}
                value={chatText}
                onChange={(e) => {
                  const val = e.target.value;
                  setChatText(val);
                  setTypingActive(val.trim().length > 0);
                }}
                placeholder={
                  !localPlayer?.alive
                    ? 'ভূত চ্যাট (জীবিতরা দেখবে না)...'
                    : 'বাংলায় আলোচনা করো...'
                }
                aria-label="চ্যাট বার্তা"
                className="flex-1 min-w-0 min-h-[42px] [@media(max-height:540px)]:min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                aria-label="বার্তা পাঠাও"
                className="min-h-[42px] [@media(max-height:540px)]:min-h-[38px] px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>পাঠাও</span>
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
