import { useState } from 'react';
import { SPECIAL_ROLES, type SpecialRole } from '../shared/types';
import { BookOpen, CheckSquare, Compass, Gamepad2, ShieldAlert, Users, X, Zap } from 'lucide-react';

export interface GuideModalProps {
  onClose: () => void;
}

type GuideTab = 'wins' | 'tasks' | 'sabotage' | 'roles';

const ROLE_ORDER: SpecialRole[] = [
  'none',
  'goyenda',
  'kobiraj',
  'mistri',
  'daroga',
  'neta',
  'daktar',
  'ghotok_khala',
  'master_moshai',
  'cctv_kaku',
  'hatur_daktar',
  'bohurupi',
  'jharudar',
  'supari_killer',
  'dalal',
  'pagol',
  'chamcha',
  'chandabaz',
  'tiktok_star',
];

export function GuideModal({ onClose }: GuideModalProps) {
  const [activeTab, setActiveTab] = useState<GuideTab>('wins');

  const tabs: Array<{ id: GuideTab; label: string }> = [
    { id: 'wins', label: 'জেতার শর্ত' },
    { id: 'tasks', label: 'কাজসমূহ' },
    { id: 'sabotage', label: 'নাশকতা' },
    { id: 'roles', label: 'চরিত্রসমূহ' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="কে বাটপার? নিয়মকানুন ও নিয়ন্ত্রণ নির্দেশিকা"
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6"
      style={{ backgroundColor: 'rgba(6, 10, 18, 0.88)' }}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-amber-400/35 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ backgroundColor: 'rgba(13, 20, 34, 0.98)' }}
      >
        <header className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-300 shrink-0" />
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                খেলার নিয়ম — মহল্লার বিধি ও চরিত্র
              </h2>
              <p className="text-xs text-slate-400">
                জেতার শর্ত, কাজ, নাশকতার নিয়ম, বিশেষ ক্ষমতা ও নিয়ন্ত্রণ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="নির্দেশিকা বন্ধ করো"
            className="min-w-[40px] min-h-[40px] rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* 4 Tabs */}
        <div
          role="tablist"
          aria-label="নিয়মকানুন বিভাগ"
          className="px-5 pt-3 pb-2 border-b border-slate-800 flex flex-wrap gap-2 bg-slate-950/50"
        >
          {tabs.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                  selected
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-200">
          {activeTab === 'wins' && (
            <div className="space-y-4">
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl p-4 bg-sky-950/45 border border-sky-400/30">
                  <h3 className="font-display font-bold text-sky-300 text-sm mb-1.5 flex items-center gap-1.5">
                    <Compass className="w-4 h-4" />
                    পাড়াবাসী দল জিতবে যদি:
                  </h3>
                  <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4">
                    <li>
                      <strong>১০০% কাজ সম্পন্ন:</strong> সব পাড়াবাসী মিলে মহল্লার সব কাজ শেষ করলে (ভূত হয়েও কাজ করলে তা গণনা হয়!)।
                    </li>
                    <li>
                      <strong>সব বাটপার বাদ:</strong> সালিশে সব বাটপারকে পুকুরে চুবানি দিলে অথবা দারোগা গুলি করে খতম করলে।
                    </li>
                  </ul>
                </div>
                <div className="rounded-xl p-4 bg-rose-950/45 border border-rose-400/30">
                  <h3 className="font-display font-bold text-rose-300 text-sm mb-1.5 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    বাটপার দল জিতবে যদি:
                  </h3>
                  <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4">
                    <li>
                      <strong>সংখ্যাগরিষ্ঠতা:</strong> জীবিত বাটপার সংখ্যা &ge; সব জীবিত অ-বাটপার খেলোয়াড় হলে (পাগলা বাবাসহ নিরপেক্ষরা অ-বাটপার হিসেবে গণ্য!)।
                    </li>
                    <li>
                      <strong>জরুরি নাশকতা শেষ:</strong> গ্যাস লিক (৪৫ সেকেন্ড) টাইমার ০ হয়ে গেলে! (লোডশেডিং ও ওয়াইফাই বন্ধে খেলা শেষ হয় না।)
                    </li>
                  </ul>
                </div>
              </section>

              <section className="rounded-xl p-4 bg-purple-950/35 border border-purple-400/30">
                <h3 className="font-display font-bold text-purple-300 text-sm mb-1 flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  নিরপেক্ষ চরিত্র (৫–১৫ জন) ও ভূতের নিয়ম
                </h3>
                <ul className="space-y-1 text-xs text-slate-300 list-disc pl-4">
                  <li>
                    <strong>পাগলা বাবা:</strong> সালিশের ভোটে সবাই মিলে তাকে পুকুরে ফেললেই একা জিতে যায়! খেলা সেখানেই শেষ, বাকিরা হারে।
                  </li>
                  <li>
                    <strong>চামচা, চাঁদাবাজ ও টিকটক স্টার:</strong> চামচা বসের দলের সাথে সহ-বিজয়ী হয়; চাঁদাবাজ প্রতি ৩০ সেকেন্ড পরপর সব জীবিত প্রতিবেশী থেকে ধরা না পড়ে চাঁদা নিলে জেতে (শিকার জেনে যায়); টিকটক স্টার ৩টি এলাকায় রিল বানিয়ে শেষ ৪ জনে টিকে থাকলে জেতে!
                  </li>
                  <li>
                    <strong>ভূত মোড:</strong> মারা গেলে অদৃশ্য ভূত হয়ে যাবে — দেয়াল ভেদ করে হাঁটতে পারবে, ভূত চ্যাটে কথা বলতে পারবে, আর পাড়াবাসী হলে কাজও শেষ করতে পারবে!
                  </li>
                </ul>
              </section>

              <section className="rounded-xl p-3.5 bg-slate-900 border border-slate-800">
                <h3 className="font-display font-bold text-amber-300 text-sm mb-1.5 flex items-center gap-1.5">
                  <Gamepad2 className="w-4 h-4" />
                  দ্রুত নিয়ন্ত্রণ (কিবোর্ড শর্টকাট)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-300 font-mono-tabular">
                  <div><strong>WASD / তীর বোতাম</strong> চলা · <strong>Space</strong> লাফ</div>
                  <div><strong>মাউস ড্র্যাগ / [C]</strong> চারদিকে তাকানো · <strong>[Y]</strong> ক্যামেরা ঠিক</div>
                  <div><strong>[E]</strong> কাজ / মেরামত / ক্যামেরা · <strong>[R]</strong> লাশ রিপোর্ট</div>
                  <div><strong>[F]</strong> আড্ডা ঘণ্টা · <strong>[G]</strong> বিশেষ ক্ষমতা</div>
                  <div><strong>[Q]</strong> গ্যাপে নাও (বাটপার) · <strong>[V]</strong> ড্রেন</div>
                  <div><strong>[Tab]</strong> ম্যাপ ও নাশকতা · <strong>[1–6]</strong> মিম সাউন্ড</div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-3">
              <div className="rounded-xl p-4 bg-slate-900 border border-slate-800 space-y-2">
                <h3 className="font-display font-bold text-amber-300 text-sm flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4" />
                  মহল্লার কাজ যেভাবে কাজ করে
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4">
                  <li>
                    হলুদ স্টেশনের কাছে গিয়ে <strong>[E]</strong> চাপো — ৩ থেকে ৬ সেকেন্ডের মিনি-কাজ শেষ করলেই দলের কাজের অগ্রগতি বাড়ে।
                  </li>
                  <li>
                    <strong>২টি সাধারণ + ২টি ছোট + ১টি বড় (মোট ৫টি):</strong> সাধারণ কাজ সব পাড়াবাসীর জন্য এক; বড় কাজ একটু নির্জন জায়গায় থাকে (ঝুঁকি বেশি!)।
                  </li>
                  <li>
                    <strong>দৃশ্যমান কাজ:</strong> কিছু কাজ (যেমন চা বানানো, পুকুর পরীক্ষা) ৬ মিটারের মধ্যে অন্যরা দেখতে পায় — বাটপার ভুয়া কাজ করলে কোনো প্রভাব দেখা যায় না!
                  </li>
                  <li>
                    <strong>বাটপারের ভুয়া তালিকা:</strong> বাটপারও একই কাজের তালিকা পায়, কিন্তু তা শেষ করলে দলের কাজের অগ্রগতি বাড়ে না।
                  </li>
                </ul>
              </div>
              <div className="rounded-xl p-4 bg-slate-900 border border-slate-800">
                <h3 className="font-display font-bold text-sky-300 text-sm mb-1.5">
                  নজরদারি কেন্দ্রসমূহ
                </h3>
                <ul className="space-y-1 text-xs text-slate-300 list-disc pl-4">
                  <li><strong>সিসিটিভি বুথ (উত্তর):</strong> মহল্লার গুরুত্বপূর্ণ মোড়গুলোর লাইভ ক্যামেরা ফিড দেখো।</li>
                  <li><strong>অ্যাডমিন রাডার (পূর্ব):</strong> কোন এলাকায় কতজন মানুষ আছে তা সরাসরি দেখো।</li>
                  <li><strong>ভাইটালস ক্লিনিক (পশ্চিম):</strong> কে জীবিত আর কে মারা গেছে তা তাৎক্ষণিক পরীক্ষা করো।</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'sabotage' && (
            <div className="space-y-3">
              <div className="rounded-xl p-4 bg-amber-950/30 border border-amber-400/35 space-y-2">
                <h3 className="font-display font-bold text-amber-300 text-sm flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  সাধারণ নাশকতা (এতে খেলা শেষ হয় না)
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4">
                  <li>
                    <strong>লোডশেডিং:</strong> পাড়াবাসীর দৃষ্টিসীমা ০.৪৫ গুণ কমে যায় ও পর্দা অন্ধকার হয় (বাটপারের সমস্যা হয় না)। ডেসকো প্যানেলে গিয়ে ৩ সেকেন্ড <strong>[E]</strong> চেপে ধরে ঠিক করো, নইলে ৯০ সেকেন্ড পর এমনিই বিদ্যুৎ ফিরবে!
                  </li>
                  <li>
                    <strong>ওয়াইফাই বন্ধ:</strong> কাজের তালিকা ও প্রগ্রেস বার লুকিয়ে যায় এবং ডিজিটাল কাজ বন্ধ থাকে। ডিশ হাবের ছাদে গিয়ে ৩ সেকেন্ড <strong>[E]</strong> চেপে ধরে ঠিক করো, নইলে ৯০ সেকেন্ড পর ঠিক হবে!
                  </li>
                  <li>
                    <strong>দোকানের শাটার বন্ধ:</strong> ১০ সেকেন্ডের জন্য দরজা বন্ধ থাকে (১৮ সেকেন্ড বিরতি) — এতে খেলা শেষ হয় না।
                  </li>
                </ul>
              </div>

              <div className="rounded-xl p-4 bg-rose-950/40 border border-rose-500/40 space-y-2">
                <h3 className="font-display font-bold text-rose-300 text-sm flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  জরুরি নাশকতা: গ্যাস লিক (৪৫ সেকেন্ড)
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4">
                  <li>
                    <strong>শুধুমাত্র গ্যাস লিকেই খেলা শেষ হতে পারে!</strong> ৪৫ সেকেন্ডের মধ্যে বন্ধ না করলে বাটপাররা সাথে সাথে জিতে যাবে!
                  </li>
                  <li>
                    <strong>বন্ধ করার নিয়ম:</strong> দুইটি আলাদা এলাকার ভালভ (চায়ের দোকান ও রিকশা গ্যারেজ) একসাথে <strong>২ জন খেলোয়াড়</strong> মিলে ২ সেকেন্ড চেপে ধরে রাখতে হবে।
                  </li>
                  <li>
                    <strong>নিয়ম:</strong> ম্যাচের শুরুতে ৪০ সেকেন্ড নাশকতা বন্ধ থাকে, এবং ঠিক বা শেষ হওয়ার পর ৩৫ সেকেন্ড বিরতি থাকে। শুধু গ্যাস লিক চলার সময়ই আড্ডা ঘণ্টা বন্ধ থাকে!
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="rounded-xl p-3 bg-slate-900 border border-rose-500/30">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-rose-300">আসল বাটপার</span>
                  <span className="text-[11px] font-mono-tabular text-rose-200">গ্যাপে নাও [Q] · ড্রেন [V]</span>
                </div>
                <p className="text-xs text-slate-300">
                  সুযোগ বুঝে পাড়াবাসীকে ঘায়েল করো, গোপন ড্রেন দিয়ে পালাও আর লোডশেডিং, ওয়াইফাই বা গ্যাস লিক নাশকতা দাও।
                </p>
              </div>
              {ROLE_ORDER.map((r) => {
                const meta = SPECIAL_ROLES[r];
                return (
                  <div key={r} className="rounded-xl p-3 bg-slate-900 border border-slate-800">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold" style={{ color: meta.accentHex }}>
                        {meta.banglaTitle}
                      </span>
                      <span className="text-[11px] font-mono-tabular text-slate-400">{meta.abilityLabel}</span>
                    </div>
                    <p className="text-xs text-slate-300">{meta.shortDesc}</p>
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
