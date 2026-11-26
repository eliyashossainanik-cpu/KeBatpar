import { PLAYER_COLORS, type PlayerColorId, type PlayerState, type SpecialRole } from './types';

export interface AutoIdentity {
  name: string;
  color: PlayerColorId;
}

export const FUNNY_MULTIPLAYER_IDENTITIES: AutoIdentity[] = [
  { name: 'Chacha 420', color: 'holud' },
  { name: 'Fuchka King', color: 'komola' },
  { name: 'Biryani Bablu', color: 'lal' },
  { name: 'Cha-Pagol Titu', color: 'shobuj' },
  { name: 'WiFi Wasim', color: 'neel' },
  { name: 'Pukur Pintu', color: 'beguni' },
  { name: 'Daktar Dulal', color: 'sada' },
  { name: 'Kalo Kalu', color: 'kalo' },
  { name: 'Golapi Sumi', color: 'golapi' },
  { name: 'Akashi Raju', color: 'akashi' },
  { name: 'Badami Bashir', color: 'badami' },
  { name: 'Tute Tariq', color: 'tute' },
  { name: 'Jam Jasim', color: 'jam' },
  { name: 'Pata Polash', color: 'olive' },
  { name: 'Sona Sohel', color: 'tan' },
  { name: 'Korolla Kabir', color: 'korolla' },
  { name: 'Firoza Farhan', color: 'firoza' },
  { name: 'Sindur Sajjad', color: 'sindur' },
  { name: 'Mehedi Munna', color: 'mehedi' },
  { name: 'Chandan Chintu', color: 'chandan' },
];

export function pickAutoMultiplayerIdentity(
  usedNames: Iterable<string> = [],
  usedColors: Iterable<PlayerColorId> = [],
  rng: () => number = Math.random,
): AutoIdentity {
  const takenNameSet = new Set(Array.from(usedNames, (n) => n.trim().toLowerCase()));
  const takenColorSet = new Set(usedColors);

  const openColorPool = PLAYER_COLORS.filter((c) => !takenColorSet.has(c.id));
  const openIdentityPool = FUNNY_MULTIPLAYER_IDENTITIES.filter(
    (entry) => !takenNameSet.has(entry.name.toLowerCase()),
  );

  const exactMatches = openIdentityPool.filter((entry) => !takenColorSet.has(entry.color));
  if (exactMatches.length > 0) {
    return exactMatches[Math.floor(rng() * exactMatches.length)];
  }

  const pickedName =
    openIdentityPool.length > 0
      ? openIdentityPool[Math.floor(rng() * openIdentityPool.length)].name
      : `Para Hero ${Math.floor(10 + rng() * 89)}`;

  const pickedColor =
    openColorPool.length > 0
      ? openColorPool[Math.floor(rng() * openColorPool.length)].id
      : PLAYER_COLORS[Math.floor(rng() * PLAYER_COLORS.length)].id;

  return { name: pickedName, color: pickedColor };
}

export function resolveUniqueMultiplayerIdentity(
  requestedName: string | undefined,
  requestedColor: PlayerColorId | undefined,
  existingPlayers: ReadonlyArray<Pick<PlayerState, 'name' | 'color'>>,
  rng: () => number = Math.random,
): AutoIdentity {
  const usedNames = new Set(existingPlayers.map((p) => p.name.trim().toLowerCase()));
  const usedColors = new Set(existingPlayers.map((p) => p.color));

  const trimmed = (requestedName ?? '').trim().slice(0, 16);
  const auto = pickAutoMultiplayerIdentity(usedNames, usedColors, rng);

  let finalName = trimmed;
  if (!finalName || usedNames.has(finalName.toLowerCase())) {
    if (!trimmed) {
      finalName = auto.name;
    } else if (!usedNames.has(auto.name.toLowerCase())) {
      finalName = auto.name;
    } else {
      let suffix = 2;
      while (usedNames.has(`${trimmed.slice(0, 13)} ${suffix}`.toLowerCase())) {
        suffix++;
      }
      finalName = `${trimmed.slice(0, 13)} ${suffix}`;
    }
  }

  let finalColor: PlayerColorId;
  if (requestedColor && !usedColors.has(requestedColor)) {
    finalColor = requestedColor;
  } else if (!usedColors.has(auto.color)) {
    finalColor = auto.color;
  } else {
    const remaining = PLAYER_COLORS.find((c) => !usedColors.has(c.id));
    finalColor = remaining ? remaining.id : PLAYER_COLORS[existingPlayers.length % PLAYER_COLORS.length].id;
  }

  return { name: finalName, color: finalColor };
}

export const QUICK_BANGLISH_ALIVE = [
  'আমি তো চায়ের দোকানে চা খাচ্ছিলাম ভাই!',
  'একশ পার্সেন্ট ওকে পুকুরে চুবানি দাও!',
  'তুই-ই বাটপার, দেখেই সন্দেহ লাগছে!',
  'প্রমাণ ছাড়া দোষ দিও না মামা!',
  'ফুচকা চত্বরে কেমন সন্দেহজনক ঘুরছিল!',
  'কারেন্ট যাওয়া মাত্রই কাজটা সেরেছে!',
  'এখন স্কিপ মারো, পরের রাউন্ডে দেখা যাবে!',
];

export const QUICK_BANGLISH_GHOST = [
  'আমাকে পিছন থেকে গায়েব করে দিল রে ভাই!',
  'বাটপার আমার পিছে ছিল, ওকে ধরো সবাই!',
  'ভূত হয়েও চায়ের আড্ডা দেখছি হিহি!',
];

export const ROLE_COMEDY_TAGLINES: Record<SpecialRole, string> = {
  none: 'চা-বিস্কুট খাও, কাজ সারো — আর বাটপার দেখলেই সালিশ ডাকো!',
  goyenda: 'চোখে আতশকাঁচ লাগাও — আজকে আসল বাটপার ধরা পড়বেই!',
  kobiraj: 'তাবিজের পাওয়ার চালু! আড়ালে মারতে এলেও কেউ বাঁচতে পারবে না!',
  mistri: 'টেস্টার হাতে নিয়ে ঘোরো — বিদ্যুৎ আর ড্রেন দুটোই তোমার দখলে!',
  daroga: 'এক গুলিতে বাটপার খতম — কিন্তু ভুল করলে নিজেরই চাকরি শেষ!',
  neta: 'ভোটে দ্বিগুণ ক্ষমতা! ভাষণ দিলেই সবাই পুকুরে যাবে!',
  daktar: 'স্যালাইন নিয়ে তৈরি থাকো — পড়ে যাওয়া পাড়াবাসীকে বাঁচিয়ে তোলো!',
  ghotok_khala: 'মহল্লায় জুটি লাগাও — একজন মরলেই সাথে সাথে খবর চলে আসবে!',
  master_moshai: 'হাতে খাতা নিয়ে যাচাই করো — ভুয়া নাটক করলেই বাটপার ধরা!',
  cctv_kaku: 'পকেট ফোনেই সব সিসিটিভি — চা খেতে খেতেই চোরা বাটপার ধরো!',
  hatur_daktar: 'ঝাঁঝালো ইনজেকশন দিয়ে ১২ সেকেন্ডের জন্য পাড়াবাসীকে লোহার মতো বানাও!',
  bohurupi: 'চেহারা বদলে অন্য কাউকে ফাঁসাও — একদম সিনেমা লেভেলের নাটক!',
  jharudar: 'ঝাড়ু দিয়ে সব প্রমাণ গায়েব করো — কেউ কোনো লাশই খুঁজে পাবে না!',
  supari_killer: 'সুপারি টার্গেট দাগিয়ে রাখো — নিশানা মারলেই বিরতি অর্ধেক!',
  dalal: 'শাটার আটকাও আর ম্যাপ জ্যাম করো — পুরো মহল্লা অন্ধ হয়ে যাবে!',
  pagol: 'এমন অভিনয় করো যেন সবাই তোমাকেই পুকুরে ফেলে — তাহলেই জয়!',
  chamcha: 'বড় ভাইয়ের পেছনে লেগে থাকো — সে জিতলেই তুমিও সাথে কাপ পাবে!',
  chandabaz: 'সব জীবিত প্রতিবেশী থেকে ঝুঁকি নিয়ে চাঁদা তুললেই সবার আগে একা জিতে যাবে!',
  tiktok_star: '৩ জায়গায় ভাইরাল রিল বানাও — শেষ ৪ জনে টিকে থাকলেই জয়!',
};

export function getChubaniTaunts(name: string, wasVondo: boolean, wasPagol: boolean): string[] {
  if (wasPagol) {
    return [
      `${name}: "হাহাহা সবাই ফাঁদে পা দিয়েছ!"`,
      'পুকুরের মাছও হাসতে হাসতে গড়াগড়ি খাচ্ছে!',
      'পুরো মহল্লাকে দারুণ বোকা বানিয়ে জিতে গেল!',
    ];
  }
  if (wasVondo) {
    return [
      `১... ২... ৩... ${name} পুকুরে যা!!`,
      '"বাটপারি ছাড়বি নাকি পুকুরে চুবানি খাবি?!"',
      'সাঁতার না জানলে টিউব নিয়ে নামো রে!',
    ];
  }
  return [
    '১... ২... ৩... ঝপাং!!',
    '"ভাই আমি তো শুধু ফুচকা খাচ্ছিলাম!"',
    'মহল্লা আজকে বড় একটা ভুল করে ফেলল নাকি?!',
  ];
}
