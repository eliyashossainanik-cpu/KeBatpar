import { useState } from 'react';
import type { TaskStation } from '../shared/types';
import { X, CheckCircle2 } from 'lucide-react';

export interface TaskModalProps {
  station: TaskStation;
  onComplete: (taskId: string) => void;
  onClose: () => void;
}

export function TaskModal({ station, onComplete, onClose }: TaskModalProps) {
  const [done, setDone] = useState(false);

  // Task 1: Cha Mix (need 3 stirs)
  const [stirs, setStirs] = useState(0);

  // Task 2: DESCO Fuse Fix (3 switches must all be ON)
  const [fuses, setFuses] = useState([false, true, false]);

  // Task 3: Rickshaw Pump (0 to 100 PSI)
  const [psi, setPsi] = useState(20);

  // Task 4: Dish Tune (slider target 68..82)
  const [freq, setFreq] = useState(25);

  // Task 5: Bazar Hisab (50 + 75 = 125)
  const [hisabError, setHisabError] = useState(false);

  // Task 6: Pukur Water Check (3 sample drops)
  const [samples, setSamples] = useState(0);

  // Task 7: Fuchka Serve (3 sequential ingredients: Puri -> Aloo -> Tetul Tok)
  const [fuchkaStep, setFuchkaStep] = useState(0);

  // Task 8: Hero Saloon Trim (3 hair/beard snips)
  const [trimSpots, setTrimSpots] = useState([false, false, false]);

  // Task 9: Para Cricket Tape Ball (4 wraps to 100%)
  const [tapeWraps, setTapeWraps] = useState(0);

  // Task 10: Dadu Pharmacy ORS Mix (Saline packet + 2 Napa drops)
  const [orsAdded, setOrsAdded] = useState(false);
  const [napaCount, setNapaCount] = useState(0);

  // Task 11: Biyer Bari DJ Bass Sync (80..95 BPM + Drop Beat)
  const [djBpm, setDjBpm] = useState(64);

  // Task 12: Nawab Kacchi Handi (4 sequential layers)
  const [kacchiStep, setKacchiStep] = useState(0);

  // Task 13: Cyber PC FPS Boost (4 lag tasks cleared)
  const [cyberCleared, setCyberCleared] = useState([false, false, false, false]);

  // Task 14: Shilpi Dorji Panjabi Stitch (4 stitch points)
  const [dorjiStitches, setDorjiStitches] = useState([false, false, false, false]);

  // Task 15: Tiger Gym Reps (0 to 5 reps)
  const [gymReps, setGymReps] = useState(0);

  // Task 16: A+ Coaching Book Sort (3 subjects in order)
  const [bookStep, setBookStep] = useState(0);

  // Task 17: South Signal Yard Switches (3 track interlocks)
  const [signalSwitches, setSignalSwitches] = useState([false, false, false]);

  const finish = () => {
    if (done) return;
    setDone(true);
    setTimeout(() => {
      onComplete(station.id);
    }, 320);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={station.title}
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(6, 10, 18, 0.72)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 border border-amber-400/30 shadow-2xl"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.97)' }}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <span className="text-xs font-semibold text-amber-300">{station.zoneName}</span>
            <h2 className="font-display text-2xl font-bold text-white mt-0.5">{station.title}</h2>
            <p className="text-sm text-slate-400">
              {station.banglaTitle !== station.title
                ? station.banglaTitle
                : station.medium === 'digital'
                  ? 'ডিজিটাল কাজ'
                  : 'হাতে-কলমে কাজ'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="কাজ বন্ধ করো"
            className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="py-8 flex flex-col items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-12 h-12" />
            <span className="font-display text-lg font-bold">কাজ সম্পন্ন হয়েছে!</span>
          </div>
        ) : (
          <div>
            {station.kind === 'cha_mix' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  মামার স্পেশাল দুধ-চায়ের জন্য কনডেন্সড মিল্ক দিয়ে মাটির কাপটি ৩ বার ঘুঁটে নাও।
                </p>
                <div className="w-full h-4 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{ width: `${(stirs / 3) * 100}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = stirs + 1;
                    setStirs(next);
                    if (next >= 3) finish();
                  }}
                  className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold"
                >
                  চিনি ও চা মেশাও ({stirs}/৩)
                </button>
              </div>
            )}

            {station.kind === 'fuse_fix' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  মহল্লার লোডশেডিং থামাতে ৩টি ডেসকো ব্রেকার সুইচই চালু করো।
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {fuses.map((on, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const next = [...fuses];
                        next[idx] = !next[idx];
                        setFuses(next);
                        if (next.every(Boolean)) finish();
                      }}
                      className={`py-5 rounded-xl font-display font-bold text-sm border transition-colors ${
                        on
                          ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                          : 'bg-rose-950 border-rose-500/40 text-rose-200'
                      }`}
                    >
                      লাইন {idx + 1}
                      <span className="block text-xs mt-1">{on ? 'চালু' : 'ট্রিপ করেছে'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {station.kind === 'rickshaw_pump' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  রিকশার পেছনের চাকায় ১০০ PSI পর্যন্ত হাওয়া পাম্প করো।
                </p>
                <div className="flex items-center justify-between text-xs font-mono-tabular text-slate-300">
                  <span>চাপ</span>
                  <span className="text-amber-300 font-bold">{psi} PSI</span>
                </div>
                <div className="w-full h-4 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-emerald-400 transition-all" style={{ width: `${psi}%` }} />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.min(100, psi + 20);
                    setPsi(next);
                    if (next >= 100) finish();
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold"
                >
                  হাওয়া পাম্প করো (+২০)
                </button>
              </div>
            )}

            {station.kind === 'dish_tune' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  ক্রিকেট লাইভ দেখার জন্য ডিশের সিগন্যাল <strong className="text-amber-300">৭০ – ৮০ MHz</strong>-এ মেলাও।
                </p>
                <div className="flex items-center justify-between font-mono-tabular text-sm">
                  <span className="text-slate-400">সিগন্যাল:</span>
                  <span className={freq >= 70 && freq <= 80 ? 'text-emerald-400 font-bold' : 'text-amber-300'}>
                    {freq} MHz
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={freq}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setFreq(val);
                    if (val >= 70 && val <= 80) finish();
                  }}
                  aria-label="স্যাটেলাইট ফ্রিকোয়েন্সি MHz"
                  className="w-full accent-amber-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFreq(75);
                    finish();
                  }}
                  className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-display font-bold text-sm"
                >
                  ৭৫ MHz-এ লক করো
                </button>
              </div>
            )}

            {station.kind === 'bazar_hisab' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  মুদি দোকানের হিসাব: ১ কেজি আলু (৫০ টাকা) + ১ কেজি পেঁয়াজ (৭৫ টাকা) = কত?
                </p>
                {hisabError && <p className="text-xs text-rose-400">ভুল হিসাব! আবার চেষ্টা করো।</p>}
                <div className="grid grid-cols-3 gap-2.5">
                  {[115, 125, 135].map((ans) => (
                    <button
                      key={ans}
                      type="button"
                      onClick={() => {
                        if (ans === 125) finish();
                        else setHisabError(true);
                      }}
                      className="py-3.5 rounded-xl bg-slate-800 hover:bg-amber-400 hover:text-slate-950 font-mono-tabular font-bold text-base text-white transition-colors"
                    >
                      {ans} টাকা
                    </button>
                  ))}
                </div>
              </div>
            )}

            {station.kind === 'pukur_check' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  কোনো বাটপার পুকুরে ময়লা ফেলেছে কিনা দেখতে পুকুর ঘাট থেকে ৩টি পানির নমুনা পরীক্ষা করো।
                </p>
                <div className="w-full h-4 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-sky-400 transition-all"
                    style={{ width: `${(samples / 3) * 100}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = samples + 1;
                    setSamples(next);
                    if (next >= 3) finish();
                  }}
                  className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-display font-bold"
                >
                  পানির নমুনা যাচাই করো ({samples}/৩)
                </button>
              </div>
            )}

            {station.kind === 'fuchka_serve' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  ৩ ধাপে মচমচে এক প্লেট <strong className="text-amber-300">ঝাল ফুচকা</strong> তৈরি করো!
                </p>
                <div className="w-full h-4 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{ width: `${(fuchkaStep / 3) * 100}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { idx: 0, label: '১. ফুচকা ভাঙো' },
                    { idx: 1, label: '২. আলু ভর্তা দাও' },
                    { idx: 2, label: '৩. তেঁতুল টক!' },
                  ].map((step) => {
                    const doneStep = fuchkaStep > step.idx;
                    const activeStep = fuchkaStep === step.idx;
                    return (
                      <button
                        key={step.idx}
                        type="button"
                        disabled={!activeStep}
                        onClick={() => {
                          const next = fuchkaStep + 1;
                          setFuchkaStep(next);
                          if (next >= 3) finish();
                        }}
                        className={`py-3 px-2 rounded-xl text-xs font-bold border transition-colors ${
                          doneStep
                            ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                            : activeStep
                              ? 'bg-amber-400 hover:bg-amber-300 border-amber-200 text-slate-950'
                              : 'bg-slate-800 border-slate-700 text-slate-500'
                        }`}
                      >
                        {step.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {station.kind === 'saloon_trim' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  সালিশ শুরু হওয়ার আগেই <strong className="text-sky-300">হিরো সেলুনে</strong> ৩টি অংশের চুল-দাড়ি ছাঁটা শেষ করো!
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {['বামের ছাঁট', 'ওপরের স্টাইল', 'দাড়ির লাইন'].map((spot, idx) => {
                    const trimmed = trimSpots[idx];
                    return (
                      <button
                        key={spot}
                        type="button"
                        onClick={() => {
                          if (trimmed) return;
                          const next = [...trimSpots];
                          next[idx] = true;
                          setTrimSpots(next);
                          if (next.every(Boolean)) finish();
                        }}
                        className={`py-4 px-2 rounded-xl font-display font-bold text-xs border transition-colors ${
                          trimmed
                            ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                            : 'bg-sky-950 hover:bg-sky-800 border-sky-400/40 text-sky-200'
                        }`}
                      >
                        {spot}
                        <span className="block text-[10px] mt-1">{trimmed ? 'দারুণ ছাঁট!' : 'কাটো'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {station.kind === 'cricket_tape' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  পাড়ার টেপ-টেনিস ম্যাচের জন্য বলের চারপাশে ৪ পরত লাল টেপ শক্ত করে প্যাঁচাও!
                </p>
                <div className="flex items-center justify-between text-xs font-mono-tabular text-slate-300">
                  <span>টেপ গ্রিপ</span>
                  <span className="text-emerald-300 font-bold">{tapeWraps * 25}%</span>
                </div>
                <div className="w-full h-4 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-rose-500 transition-all"
                    style={{ width: `${tapeWraps * 25}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.min(4, tapeWraps + 1);
                    setTapeWraps(next);
                    if (next >= 4) finish();
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold"
                >
                  লাল টেপ প্যাঁচাও ({tapeWraps}/৪)
                </button>
              </div>
            )}

            {station.kind === 'pharmacy_mix' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  দাদুর মহল্লা বক্সের জন্য <strong className="text-teal-300">১ প্যাকেট স্যালাইন</strong> ও{' '}
                  <strong className="text-amber-300">২টি নাপা</strong> ট্যাবলেট গুছিয়ে দাও।
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={orsAdded}
                    onClick={() => {
                      setOrsAdded(true);
                      if (napaCount >= 2) finish();
                    }}
                    className={`py-4 px-3 rounded-xl font-display font-bold text-xs border transition-colors ${
                      orsAdded
                        ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                        : 'bg-teal-950 hover:bg-teal-800 border-teal-400/40 text-teal-200'
                    }`}
                  >
                    {orsAdded ? 'স্যালাইন মেশানো হয়েছে!' : '+ ওরস্যালাইন ঢালো'}
                  </button>
                  <button
                    type="button"
                    disabled={napaCount >= 2}
                    onClick={() => {
                      const next = napaCount + 1;
                      setNapaCount(next);
                      if (orsAdded && next >= 2) finish();
                    }}
                    className={`py-4 px-3 rounded-xl font-display font-bold text-xs border transition-colors ${
                      napaCount >= 2
                        ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                        : 'bg-amber-950 hover:bg-amber-800 border-amber-400/40 text-amber-200'
                    }`}
                  >
                    + নাপা যোগ করো ({napaCount}/২)
                  </button>
                </div>
              </div>
            )}

            {station.kind === 'pandal_dj' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  বিয়ে বাড়ির ডিজে বক্স <strong className="text-fuchsia-300">৮০ – ৯৫ BPM</strong>-এ সেট করে আসর জমাও!
                </p>
                <div className="flex items-center justify-between font-mono-tabular text-sm">
                  <span className="text-slate-400">বেস গতি:</span>
                  <span className={djBpm >= 80 && djBpm <= 95 ? 'text-emerald-400 font-bold' : 'text-fuchsia-300'}>
                    {djBpm} BPM
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={120}
                  value={djBpm}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setDjBpm(val);
                    if (val >= 80 && val <= 95) finish();
                  }}
                  aria-label="ডিজে বেস গতি"
                  className="w-full accent-fuchsia-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    setDjBpm(88);
                    finish();
                  }}
                  className="w-full py-2.5 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-950 font-display font-bold text-sm"
                >
                  বিয়ে বাড়ির বেস ছাড়ো (৮৮ BPM)
                </button>
              </div>
            )}

            {station.kind === 'kacchi_cook' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  মহল্লাবাসী আসার আগেই ক্রম অনুসারে <strong className="text-amber-300">কাচ্চি বিরিয়ানির হাঁড়ি</strong> সাজাও!
                </p>
                <div className="w-full h-4 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{ width: `${(kacchiStep / 4) * 100}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { idx: 0, label: '১. জাফরানি চাল' },
                    { idx: 1, label: '২. মাংস ও আলু' },
                    { idx: 2, label: '৩. ঘি ও বেরেস্তা' },
                    { idx: 3, label: '৪. দম সিল করো!' },
                  ].map((step) => {
                    const doneStep = kacchiStep > step.idx;
                    const activeStep = kacchiStep === step.idx;
                    return (
                      <button
                        key={step.idx}
                        type="button"
                        disabled={!activeStep}
                        onClick={() => {
                          const next = kacchiStep + 1;
                          setKacchiStep(next);
                          if (next >= 4) finish();
                        }}
                        className={`py-3.5 px-3 rounded-xl text-xs font-bold border transition-colors ${
                          doneStep
                            ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                            : activeStep
                              ? 'bg-amber-400 hover:bg-amber-300 border-amber-200 text-slate-950'
                              : 'bg-slate-800 border-slate-700 text-slate-500'
                        }`}
                      >
                        {step.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {station.kind === 'cyber_pc' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  সাইবার আড্ডায় <strong className="text-indigo-300">১৪৪ FPS</strong> পেতে ৪টি বাড়তি অ্যাপ বন্ধ করো!
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {['ক্রোম (৮৪ ট্যাব)', 'উইন্ডোজ আপডেট', 'পিং ৪৫০ ms', 'ড্রাইভার সমস্যা'].map((proc, idx) => {
                    const cleared = cyberCleared[idx];
                    return (
                      <button
                        key={proc}
                        type="button"
                        onClick={() => {
                          if (cleared) return;
                          const next = [...cyberCleared];
                          next[idx] = true;
                          setCyberCleared(next);
                          if (next.every(Boolean)) finish();
                        }}
                        className={`py-3.5 px-3 rounded-xl font-display font-bold text-xs border transition-colors ${
                          cleared
                            ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                            : 'bg-indigo-950 hover:bg-indigo-800 border-indigo-400/40 text-indigo-200'
                        }`}
                      >
                        {proc}
                        <span className="block text-[10px] mt-1">{cleared ? 'বন্ধ হয়েছে ✓' : 'অ্যাপ বন্ধ করো'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {station.kind === 'dorji_stitch' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  <strong className="text-fuchsia-300">ঈদ স্পেশাল পাঞ্জাবির</strong> ৪টি সেলাই নিখুঁতভাবে শেষ করো!
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {['কলারের সেলাই', 'বাম হাতা', 'ডান হাতা', 'বোতামের ঘর'].map((part, idx) => {
                    const stitched = dorjiStitches[idx];
                    return (
                      <button
                        key={part}
                        type="button"
                        onClick={() => {
                          if (stitched) return;
                          const next = [...dorjiStitches];
                          next[idx] = true;
                          setDorjiStitches(next);
                          if (next.every(Boolean)) finish();
                        }}
                        className={`py-3.5 px-3 rounded-xl font-display font-bold text-xs border transition-colors ${
                          stitched
                            ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                            : 'bg-fuchsia-950 hover:bg-fuchsia-800 border-fuchsia-400/40 text-fuchsia-200'
                        }`}
                      >
                        {part}
                        <span className="block text-[10px] mt-1">{stitched ? 'সেলাই সম্পন্ন!' : 'সেলাই করো'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {station.kind === 'gym_lift' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  <strong className="text-rose-300">{station.zoneName}</strong>-এ ৫টি ডাম্বেল রেপ সম্পন্ন করো!
                </p>
                <div className="flex items-center justify-between text-xs font-mono-tabular text-slate-300">
                  <span>শক্তির মাত্রা</span>
                  <span className="text-rose-300 font-bold">{gymReps} / ৫ রেপ</span>
                </div>
                <div className="w-full h-4 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-rose-500 transition-all" style={{ width: `${(gymReps / 5) * 100}%` }} />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.min(5, gymReps + 1);
                    setGymReps(next);
                    if (next >= 5) finish();
                  }}
                  className="w-full py-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-display font-bold"
                >
                  ডাম্বেল তোলো (+১)
                </button>
              </div>
            )}

            {station.kind === 'book_sort' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  সঠিক ক্রম অনুযায়ী কোচিংয়ের বইগুলো সাজাও: <strong className="text-emerald-300">১ → ২ → ৩</strong>!
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { idx: 0, label: '১. বাংলা প্রথম' },
                    { idx: 1, label: '২. পদার্থবিজ্ঞান' },
                    { idx: 2, label: '৩. উচ্চতর গণিত' },
                  ].map((book) => {
                    const doneBook = bookStep > book.idx;
                    const activeBook = bookStep === book.idx;
                    return (
                      <button
                        key={book.idx}
                        type="button"
                        disabled={!activeBook}
                        onClick={() => {
                          const next = bookStep + 1;
                          setBookStep(next);
                          if (next >= 3) finish();
                        }}
                        className={`py-4 px-2 rounded-xl text-xs font-bold border transition-colors ${
                          doneBook
                            ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                            : activeBook
                              ? 'bg-sky-400 hover:bg-sky-300 border-sky-200 text-slate-950'
                              : 'bg-slate-800 border-slate-700 text-slate-500'
                        }`}
                      >
                        {book.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {station.kind === 'rail_signal' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  সবুজ সিগন্যাল চালু করতে <strong className="text-amber-300">বাংলা এক্সপ্রেসের</strong> ৩টি ট্র্যাক লকই ঠিক করো!
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {['ট্র্যাক সুইচ', 'নিরাপত্তা গেট', 'সবুজ বাতি'].map((lbl, idx) => {
                    const active = signalSwitches[idx];
                    return (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => {
                          if (active) return;
                          const next = [...signalSwitches];
                          next[idx] = true;
                          setSignalSwitches(next);
                          if (next.every(Boolean)) finish();
                        }}
                        className={`py-4 px-2 rounded-xl font-display font-bold text-xs border transition-colors ${
                          active
                            ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                            : 'bg-amber-950 hover:bg-amber-800 border-amber-400/40 text-amber-200'
                        }`}
                      >
                        {lbl}
                        <span className="block text-[10px] mt-1">{active ? 'সবুজ' : 'লাল'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
