import type {
  DoorLockState,
  DoorSpec,
  GasValveState,
  RoofDeckDef,
  SabotageSeverity,
  SabotageType,
  SecurityCamDef,
  StairRampDef,
  TaskStation,
  VehicleKind,
  VehicleSpec,
  VehicleState,
  VentNode,
  WallAABB,
  ZoneDef,
} from './types';

export const MAP_HALF_SIZE = 160;
export const PLAYER_RADIUS = 0.55;
export const RAILWAY_TRACK_Z = 86.5;

export const ZONES: ZoneDef[] = [
  // Core 9 Inner Moholla Districts
  {
    id: 'adda_chowk',
    name: 'Adda Chowk',
    banglaName: 'আড্ডা চক',
    x: 0,
    z: 0,
    width: 18,
    depth: 18,
    color: '#334155',
  },
  {
    id: 'cha_dokan',
    name: 'Cha-er Dokan',
    banglaName: 'চায়ের দোকান',
    x: -35,
    z: -32,
    width: 18,
    depth: 17,
    color: '#78350f',
  },
  {
    id: 'rickshaw_garage',
    name: 'Rickshaw Stand',
    banglaName: 'রিকশা গ্যারেজ',
    x: 35,
    z: -32,
    width: 18,
    depth: 17,
    color: '#065f46',
  },
  {
    id: 'desco_power',
    name: 'DESCO Powerhouse',
    banglaName: 'লোডশেডিং ঘর',
    x: -35,
    z: 32,
    width: 18,
    depth: 17,
    color: '#7f1d1d',
  },
  {
    id: 'dish_roof',
    name: 'Dish Cable Hub',
    banglaName: 'ডিশ কন্ট্রোল',
    x: 35,
    z: 32,
    width: 18,
    depth: 17,
    color: '#1e3a8a',
  },
  {
    id: 'pukur_ghat',
    name: 'Pukur Ghat',
    banglaName: 'পুকুর ঘাট',
    x: -40,
    z: 0,
    width: 18,
    depth: 18,
    color: '#0e7490',
  },
  {
    id: 'bazar_stall',
    name: 'Moholla Bazar',
    banglaName: 'মহল্লা বাজার',
    x: 40,
    z: 0,
    width: 18,
    depth: 18,
    color: '#9a3412',
  },
  {
    id: 'eidgah_north',
    name: 'Eidgah Maidan',
    banglaName: 'ঈদগাহ মাঠ',
    x: 0,
    z: -37,
    width: 20,
    depth: 15,
    color: '#064e3b',
  },
  {
    id: 'south_tank',
    name: 'WASA Water Tower',
    banglaName: 'পানির ট্যাংক',
    x: 0,
    z: 37,
    width: 20,
    depth: 15,
    color: '#1e293b',
  },

  // 5 Mid-Ring Moholla Districts
  {
    id: 'fuchka_corner',
    name: 'Fuchka Chottor',
    banglaName: 'ফুচকা চত্বর',
    x: 0,
    z: -66,
    width: 24,
    depth: 15,
    color: '#b45309',
  },
  {
    id: 'saloon_goli',
    name: 'Hero Saloon',
    banglaName: 'হিরো সেলুন',
    x: -66,
    z: -26,
    width: 18,
    depth: 18,
    color: '#9d174d',
  },
  {
    id: 'cricket_math',
    name: 'Para Cricket Math',
    banglaName: 'ক্রিকেট মাঠ',
    x: 66,
    z: -26,
    width: 18,
    depth: 22,
    color: '#15803d',
  },
  {
    id: 'pharmacy_mor',
    name: 'Dadu Pharmacy',
    banglaName: 'দাদু ফার্মেসি',
    x: -66,
    z: 26,
    width: 18,
    depth: 18,
    color: '#0369a1',
  },
  {
    id: 'biyer_pandal',
    name: 'Biyer Bari Pandal',
    banglaName: 'বিয়ে বাড়ি প্যান্ডেল',
    x: 66,
    z: 26,
    width: 18,
    depth: 22,
    color: '#be123c',
  },

  // 5 Expanded Outer Districts: 4 Para Bari Residential Houses + Moholla Rail Station (208m × 208m)
  {
    id: 'kakar_bari',
    name: "Kaka-r Bari",
    banglaName: 'কাকার বাড়ি',
    x: -74,
    z: -88,
    width: 16,
    depth: 16,
    color: '#b45309',
  },
  {
    id: 'master_bari',
    name: 'Master Bari',
    banglaName: 'মাস্টার বাড়ি',
    x: -32,
    z: -88,
    width: 16,
    depth: 16,
    color: '#92400e',
  },
  {
    id: 'chacha_bari',
    name: "Chacha-r Bari",
    banglaName: 'চাচার বাড়ি',
    x: 32,
    z: -88,
    width: 16,
    depth: 16,
    color: '#9f1239',
  },
  {
    id: 'khalar_bari',
    name: "Khala-r Bari",
    banglaName: 'খালার বাড়ি',
    x: 74,
    z: -88,
    width: 16,
    depth: 16,
    color: '#0f766e',
  },
  {
    id: 'rail_station',
    name: 'Moholla Rail Station',
    banglaName: 'মোহল্লা রেল স্টেশন',
    x: 0,
    z: 74,
    width: 40,
    depth: 11,
    color: '#0369a1',
  },

  // 15 Expanded Far-Moholla & South-of-Tracks (Opar Para) Locations (320m × 320m)
  {
    id: 'nanar_bari',
    name: "Nana-r Bari",
    banglaName: 'নানার বাড়ি',
    x: -138,
    z: -135,
    width: 18,
    depth: 18,
    color: '#b45309',
  },
  {
    id: 'cinema_hall',
    name: 'Balaka Cineplex',
    banglaName: 'বলাকা সিনেমা হল',
    x: -69,
    z: -135,
    width: 18,
    depth: 18,
    color: '#7e22ce',
  },
  {
    id: 'bhai_duplex',
    name: 'Boro Bhai Duplex',
    banglaName: 'বড় ভাই ডুপ্লেক্স',
    x: -28,
    z: -135,
    width: 20,
    depth: 18,
    color: '#1d4ed8',
  },
  {
    id: 'coaching_center',
    name: 'A+ Coaching',
    banglaName: 'জিপিএ-৫ কোচিং',
    x: 28,
    z: -135,
    width: 20,
    depth: 18,
    color: '#047857',
  },
  {
    id: 'khalur_bari',
    name: "Khalu-r Bari",
    banglaName: 'খালুর বাড়ি',
    x: 69,
    z: -135,
    width: 18,
    depth: 18,
    color: '#0f766e',
  },
  {
    id: 'jheel_par',
    name: 'Jheel Par Lake',
    banglaName: 'ঝিল পাড় লেক',
    x: -138,
    z: -82,
    width: 22,
    depth: 26,
    color: '#0e7490',
  },
  {
    id: 'shishu_park',
    name: 'Shishu Park & Ferris',
    banglaName: 'শিশু পার্ক ও নাগরদোলা',
    x: 138,
    z: -82,
    width: 22,
    depth: 26,
    color: '#db2777',
  },
  {
    id: 'kacchi_house',
    name: 'Nawab Kacchi Ghor',
    banglaName: 'নবাব কাচ্চি ঘর',
    x: -138,
    z: -28,
    width: 18,
    depth: 20,
    color: '#b91c1c',
  },
  {
    id: 'cyber_cafe',
    name: 'GG Cyber Adda',
    banglaName: 'সাইবার গেমিং আড্ডা',
    x: -138,
    z: 28,
    width: 18,
    depth: 20,
    color: '#4338ca',
  },
  {
    id: 'dorji_bari',
    name: 'Shilpi Dorji Bari',
    banglaName: 'শিল্পী দর্জি বাড়ি',
    x: 138,
    z: -28,
    width: 18,
    depth: 20,
    color: '#a21caf',
  },
  {
    id: 'tiger_gym',
    name: 'Tiger Para Gym',
    banglaName: 'টাইগার পাড়া জিম',
    x: 138,
    z: 28,
    width: 18,
    depth: 20,
    color: '#dc2626',
  },
  {
    id: 'mach_bazar',
    name: 'Opar Mach Bazar',
    banglaName: 'ওপার মাছ বাজার',
    x: -69,
    z: 128,
    width: 18,
    depth: 18,
    color: '#0284c7',
  },
  {
    id: 'rail_colony',
    name: 'Rail Colony Quarters',
    banglaName: 'রেল কলোনি কোয়ার্টার',
    x: -28,
    z: 128,
    width: 20,
    depth: 18,
    color: '#475569',
  },
  {
    id: 'signal_yard',
    name: 'South Signal Tower',
    banglaName: 'সিগন্যাল টাওয়ার',
    x: 28,
    z: 128,
    width: 20,
    depth: 18,
    color: '#ca8a04',
  },
  {
    id: 'fufu_bari',
    name: "Fufu-r Bari",
    banglaName: 'ফুফুর বাড়ি',
    x: 69,
    z: 128,
    width: 18,
    depth: 18,
    color: '#be185d',
  },
];

export const WALLS: WallAABB[] = [
  // Expanded 320m × 320m Outer Brick Compound Perimeter Walls
  { id: 'outer_n', minX: -160, maxX: 160, minZ: -160, maxZ: -158.2, height: 4.8 },
  { id: 'outer_s', minX: -160, maxX: 160, minZ: 158.2, maxZ: 160, height: 4.8 },
  { id: 'outer_w', minX: -160, maxX: -158.2, minZ: -160, maxZ: 160, height: 4.8 },
  { id: 'outer_e', minX: 158.2, maxX: 160, minZ: -160, maxZ: 160, height: 4.8 },

  { id: 'adda_table', minX: -2.0, maxX: 2.0, minZ: -2.0, maxZ: 2.0, height: 1.2, zone: 'adda_chowk' },

  // Sightline-breaking Moholla Alley Walls (ambush pockets, flanks, and blind corners)
  { id: 'alley_nw', minX: -17.5, maxX: -15.5, minZ: -20.5, maxZ: -9.5, height: 2.7 },
  { id: 'alley_ne', minX: 15.5, maxX: 17.5, minZ: -20.5, maxZ: -9.5, height: 2.7 },
  { id: 'alley_sw', minX: -17.5, maxX: -15.5, minZ: 9.5, maxZ: 20.5, height: 2.7 },
  { id: 'alley_se', minX: 15.5, maxX: 17.5, minZ: 9.5, maxZ: 20.5, height: 2.7 },
  { id: 'lane_nw', minX: -22.0, maxX: -12.5, minZ: -35.5, maxZ: -33.8, height: 2.7 },
  { id: 'lane_ne', minX: 12.5, maxX: 22.0, minZ: -35.5, maxZ: -33.8, height: 2.7 },
  { id: 'lane_sw', minX: -22.0, maxX: -12.5, minZ: 33.8, maxZ: 35.5, height: 2.7 },
  { id: 'lane_se', minX: 12.5, maxX: 22.0, minZ: 33.8, maxZ: 35.5, height: 2.7 },

  // Cha-er Dokan (NW)
  { id: 'cha_n_wall', minX: -45.0, maxX: -25.0, minZ: -41.0, maxZ: -40.1, height: 3.8, zone: 'cha_dokan' },
  { id: 'cha_w_wall', minX: -45.0, maxX: -44.1, minZ: -41.0, maxZ: -22.5, height: 3.8, zone: 'cha_dokan' },
  { id: 'cha_e_wall', minX: -25.9, maxX: -25.0, minZ: -41.0, maxZ: -22.5, height: 3.8, zone: 'cha_dokan' },
  { id: 'cha_s_stub', minX: -45.0, maxX: -36.5, minZ: -23.4, maxZ: -22.5, height: 3.8, zone: 'cha_dokan' },
  { id: 'cha_counter', minX: -39.5, maxX: -31.5, minZ: -37.2, maxZ: -35.2, height: 1.15, zone: 'cha_dokan' },

  // Rickshaw Garage (NE)
  { id: 'rick_n_wall', minX: 25.0, maxX: 45.0, minZ: -41.0, maxZ: -40.1, height: 3.8, zone: 'rickshaw_garage' },
  { id: 'rick_e_wall', minX: 44.1, maxX: 45.0, minZ: -41.0, maxZ: -22.5, height: 3.8, zone: 'rickshaw_garage' },
  { id: 'rick_w_wall', minX: 25.0, maxX: 25.9, minZ: -41.0, maxZ: -22.5, height: 3.8, zone: 'rickshaw_garage' },
  { id: 'rick_s_stub', minX: 36.5, maxX: 45.0, minZ: -23.4, maxZ: -22.5, height: 3.8, zone: 'rickshaw_garage' },

  // DESCO Powerhouse (SW - Two-Story Industrial)
  { id: 'desco_s_wall', minX: -45.0, maxX: -25.0, minZ: 40.1, maxZ: 41.0, height: 5.0, zone: 'desco_power' },
  { id: 'desco_w_wall', minX: -45.0, maxX: -44.1, minZ: 22.5, maxZ: 41.0, height: 5.0, zone: 'desco_power' },
  { id: 'desco_e_wall', minX: -25.9, maxX: -25.0, minZ: 22.5, maxZ: 41.0, height: 5.0, zone: 'desco_power' },
  { id: 'desco_n_stub', minX: -45.0, maxX: -36.5, minZ: 22.5, maxZ: 23.4, height: 5.0, zone: 'desco_power' },
  { id: 'desco_gen', minX: -40.5, maxX: -36.0, minZ: 30.5, maxZ: 34.8, height: 2.1, zone: 'desco_power' },

  // Dish Cable Hub (SE - Two-Story Broadcast Control)
  { id: 'dish_s_wall', minX: 25.0, maxX: 45.0, minZ: 40.1, maxZ: 41.0, height: 5.0, zone: 'dish_roof' },
  { id: 'dish_e_wall', minX: 44.1, maxX: 45.0, minZ: 22.5, maxZ: 41.0, height: 5.0, zone: 'dish_roof' },
  { id: 'dish_w_wall', minX: 25.0, maxX: 25.9, minZ: 22.5, maxZ: 41.0, height: 5.0, zone: 'dish_roof' },
  { id: 'dish_n_stub', minX: 36.5, maxX: 45.0, minZ: 22.5, maxZ: 23.4, height: 5.0, zone: 'dish_roof' },
  { id: 'dish_desk', minX: 32.5, maxX: 37.5, minZ: 33.2, maxZ: 35.8, height: 1.15, zone: 'dish_roof' },

  // Pukur Water (West)
  { id: 'pukur_water', minX: -51.0, maxX: -42.0, minZ: -8.0, maxZ: 8.0, height: 0.4, zone: 'pukur_ghat' },

  // Bazar Counter (East)
  { id: 'bazar_counter', minX: 42.5, maxX: 46.5, minZ: -5.0, maxZ: 5.0, height: 1.2, zone: 'bazar_stall' },

  // South WASA Water Tower Core
  { id: 'tank_core', minX: -2.4, maxX: 2.4, minZ: 36.5, maxZ: 41.5, height: 4.5, zone: 'south_tank' },

  // Tactical Supply Crate & Drum Clusters + Perimeter Sandbag Barricades
  { id: 'supply_rickshaw', minX: 39.8, maxX: 42.8, minZ: -38.4, maxZ: -36.0, height: 1.85, zone: 'rickshaw_garage' },
  { id: 'supply_desco', minX: -43.0, maxX: -39.8, minZ: 36.4, maxZ: 38.8, height: 1.85, zone: 'desco_power' },
  { id: 'supply_dish', minX: 39.8, maxX: 42.8, minZ: 25.0, maxZ: 27.4, height: 1.85, zone: 'dish_roof' },
  { id: 'supply_bazar', minX: 41.8, maxX: 44.8, minZ: 7.0, maxZ: 9.4, height: 1.85, zone: 'bazar_stall' },
  { id: 'barricade_nw', minX: -16.0, maxX: -11.4, minZ: -46.0, maxZ: -44.4, height: 1.1 },
  { id: 'barricade_ne', minX: 11.4, maxX: 16.0, minZ: -46.0, maxZ: -44.4, height: 1.1 },
  { id: 'barricade_sw', minX: -14.0, maxX: -9.4, minZ: 44.4, maxZ: 46.0, height: 1.1 },
  { id: 'barricade_se', minX: 9.4, maxX: 14.0, minZ: 44.4, maxZ: 46.0, height: 1.1 },

  // --- Mid-Ring Moholla Buildings & Landmarks ---
  // 1. Fuchka Chottor (North)
  { id: 'fuchka_cart', minX: -2.6, maxX: 2.6, minZ: -69.5, maxZ: -66.5, height: 2.3, zone: 'fuchka_corner' },
  { id: 'supply_fuchka', minX: 7.6, maxX: 10.6, minZ: -71.4, maxZ: -69.0, height: 1.85, zone: 'fuchka_corner' },

  // 2. Hero Saloon (Mid-West) — open East doorway z: -29.5 .. -22.5
  { id: 'saloon_w_wall', minX: -75.0, maxX: -74.1, minZ: -35.0, maxZ: -17.0, height: 3.8, zone: 'saloon_goli' },
  { id: 'saloon_n_wall', minX: -75.0, maxX: -57.0, minZ: -35.0, maxZ: -34.1, height: 3.8, zone: 'saloon_goli' },
  { id: 'saloon_s_wall', minX: -75.0, maxX: -57.0, minZ: -17.9, maxZ: -17.0, height: 3.8, zone: 'saloon_goli' },
  { id: 'saloon_e_n', minX: -57.9, maxX: -57.0, minZ: -35.0, maxZ: -29.5, height: 3.8, zone: 'saloon_goli' },
  { id: 'saloon_e_s', minX: -57.9, maxX: -57.0, minZ: -22.5, maxZ: -17.0, height: 3.8, zone: 'saloon_goli' },
  { id: 'saloon_counter', minX: -73.8, maxX: -71.8, minZ: -32.0, maxZ: -20.0, height: 1.15, zone: 'saloon_goli' },

  // 3. Para Cricket Math (Mid-East)
  { id: 'cricket_dugout', minX: 72.2, maxX: 74.2, minZ: -30.5, maxZ: -21.5, height: 1.3, zone: 'cricket_math' },

  // 4. Dadu Pharmacy (Mid-SW) — open East doorway z: 22.5 .. 29.5
  { id: 'pharm_w_wall', minX: -75.0, maxX: -74.1, minZ: 17.0, maxZ: 35.0, height: 3.8, zone: 'pharmacy_mor' },
  { id: 'pharm_n_wall', minX: -75.0, maxX: -57.0, minZ: 17.0, maxZ: 17.9, height: 3.8, zone: 'pharmacy_mor' },
  { id: 'pharm_s_wall', minX: -75.0, maxX: -57.0, minZ: 34.1, maxZ: 35.0, height: 3.8, zone: 'pharmacy_mor' },
  { id: 'pharm_e_n', minX: -57.9, maxX: -57.0, minZ: 17.0, maxZ: 22.5, height: 3.8, zone: 'pharmacy_mor' },
  { id: 'pharm_e_s', minX: -57.9, maxX: -57.0, minZ: 29.5, maxZ: 35.0, height: 3.8, zone: 'pharmacy_mor' },
  { id: 'pharm_counter', minX: -73.8, maxX: -71.6, minZ: 20.0, maxZ: 32.0, height: 1.2, zone: 'pharmacy_mor' },

  // 5. Biyer Bari Pandal (Mid-SE)
  { id: 'pandal_stage', minX: 70.5, maxX: 74.2, minZ: 22.5, maxZ: 29.5, height: 1.4, zone: 'biyer_pandal' },
  { id: 'supply_pandal', minX: 60.5, maxX: 63.5, minZ: 33.0, maxZ: 35.4, height: 1.85, zone: 'biyer_pandal' },

  // --- 4 Outer North Residential Para Houses (All with Full Walkable Chhad Rooftops!) ---
  // Kaka-r Bari (-82..-66, -96..-80) — open South doorway x: -77..-71
  { id: 'kaka_n_wall', minX: -82.0, maxX: -66.0, minZ: -96.0, maxZ: -95.1, height: 4.4, zone: 'kakar_bari' },
  { id: 'kaka_w_wall', minX: -82.0, maxX: -81.1, minZ: -96.0, maxZ: -80.0, height: 4.4, zone: 'kakar_bari' },
  { id: 'kaka_e_wall', minX: -66.9, maxX: -66.0, minZ: -96.0, maxZ: -80.0, height: 4.4, zone: 'kakar_bari' },
  { id: 'kaka_s_w', minX: -82.0, maxX: -77.0, minZ: -80.9, maxZ: -80.0, height: 4.4, zone: 'kakar_bari' },
  { id: 'kaka_s_e', minX: -71.0, maxX: -66.0, minZ: -80.9, maxZ: -80.0, height: 4.4, zone: 'kakar_bari' },
  { id: 'kaka_sofa', minX: -79.8, maxX: -76.5, minZ: -93.8, maxZ: -91.5, height: 1.0, zone: 'kakar_bari' },

  // Master Bari (-40..-24, -96..-80) — open South doorway x: -35..-29
  { id: 'master_n_wall', minX: -40.0, maxX: -24.0, minZ: -96.0, maxZ: -95.1, height: 4.4, zone: 'master_bari' },
  { id: 'master_w_wall', minX: -40.0, maxX: -39.1, minZ: -96.0, maxZ: -80.0, height: 4.4, zone: 'master_bari' },
  { id: 'master_e_wall', minX: -24.9, maxX: -24.0, minZ: -96.0, maxZ: -80.0, height: 4.4, zone: 'master_bari' },
  { id: 'master_s_w', minX: -40.0, maxX: -35.0, minZ: -80.9, maxZ: -80.0, height: 4.4, zone: 'master_bari' },
  { id: 'master_s_e', minX: -29.0, maxX: -24.0, minZ: -80.9, maxZ: -80.0, height: 4.4, zone: 'master_bari' },
  { id: 'master_desk', minX: -37.5, maxX: -33.5, minZ: -93.6, maxZ: -91.4, height: 1.05, zone: 'master_bari' },

  // Chacha-r Bari (24..40, -96..-80) — open South doorway x: 29..35
  { id: 'chacha_n_wall', minX: 24.0, maxX: 40.0, minZ: -96.0, maxZ: -95.1, height: 4.4, zone: 'chacha_bari' },
  { id: 'chacha_w_wall', minX: 24.0, maxX: 24.9, minZ: -96.0, maxZ: -80.0, height: 4.4, zone: 'chacha_bari' },
  { id: 'chacha_e_wall', minX: 39.1, maxX: 40.0, minZ: -96.0, maxZ: -80.0, height: 4.4, zone: 'chacha_bari' },
  { id: 'chacha_s_w', minX: 24.0, maxX: 29.0, minZ: -80.9, maxZ: -80.0, height: 4.4, zone: 'chacha_bari' },
  { id: 'chacha_s_e', minX: 35.0, maxX: 40.0, minZ: -80.9, maxZ: -80.0, height: 4.4, zone: 'chacha_bari' },
  { id: 'chacha_table', minX: 33.0, maxX: 37.2, minZ: -93.5, maxZ: -91.2, height: 1.0, zone: 'chacha_bari' },

  // Khala-r Bari (66..82, -96..-80) — open South doorway x: 71..77
  { id: 'khala_n_wall', minX: 66.0, maxX: 82.0, minZ: -96.0, maxZ: -95.1, height: 4.4, zone: 'khalar_bari' },
  { id: 'khala_w_wall', minX: 66.0, maxX: 66.9, minZ: -96.0, maxZ: -80.0, height: 4.4, zone: 'khalar_bari' },
  { id: 'khala_e_wall', minX: 81.1, maxX: 82.0, minZ: -96.0, maxZ: -80.0, height: 4.4, zone: 'khalar_bari' },
  { id: 'khala_s_w', minX: 66.0, maxX: 71.0, minZ: -80.9, maxZ: -80.0, height: 4.4, zone: 'khalar_bari' },
  { id: 'khala_s_e', minX: 77.0, maxX: 82.0, minZ: -80.9, maxZ: -80.0, height: 4.4, zone: 'khalar_bari' },
  { id: 'khala_table', minX: 75.5, maxX: 79.5, minZ: -93.6, maxZ: -91.3, height: 1.0, zone: 'khalar_bari' },

  // Outer Boulevard Sightline Dividers & Moholla Rail Station Structures (z = 74..88)
  { id: 'outer_alley_nw', minX: -32.0, maxX: -29.8, minZ: -64.0, maxZ: -57.5, height: 2.8 },
  { id: 'outer_alley_ne', minX: 29.8, maxX: 32.0, minZ: -64.0, maxZ: -57.5, height: 2.8 },
  { id: 'outer_alley_sw', minX: -32.0, maxX: -29.8, minZ: 57.5, maxZ: 64.0, height: 2.8 },
  { id: 'outer_alley_se', minX: 29.8, maxX: 32.0, minZ: 57.5, maxZ: 64.0, height: 2.8 },
  { id: 'outer_west_wall', minX: -94.0, maxX: -91.8, minZ: -6.0, maxZ: 6.0, height: 2.8 },
  { id: 'outer_east_wall', minX: 91.8, maxX: 94.0, minZ: -6.0, maxZ: 6.0, height: 2.8 },
  { id: 'rail_station_booth', minX: -16.5, maxX: -10.0, minZ: 70.5, maxZ: 74.0, height: 3.4, zone: 'rail_station' },
  { id: 'rail_cabin_w', minX: -59.5, maxX: -56.0, minZ: 80.5, maxZ: 83.8, height: 2.9, zone: 'rail_station' },
  { id: 'rail_cabin_e', minX: 56.0, maxX: 59.5, minZ: 80.5, maxZ: 83.8, height: 2.9, zone: 'rail_station' },
  { id: 'rail_cabin_center_w', minX: -11.5, maxX: -7.8, minZ: 80.5, maxZ: 83.8, height: 2.9, zone: 'rail_station' },
  { id: 'rail_cabin_center_e', minX: 7.8, maxX: 11.5, minZ: 80.5, maxZ: 83.8, height: 2.9, zone: 'rail_station' },
  { id: 'rail_cabin_far_w', minX: -125.5, maxX: -122.0, minZ: 80.5, maxZ: 83.8, height: 2.9, zone: 'rail_station' },
  { id: 'rail_cabin_far_e', minX: 122.0, maxX: 125.5, minZ: 80.5, maxZ: 83.8, height: 2.9, zone: 'rail_station' },

  // --- 15 Expanded Outer Moholla & Opar Para Buildings, Houses & Landmarks ---
  // 1. Nana-r Bari (-147..-129, -144..-126) — open South doorway x: -141..-135
  { id: 'nana_n_wall', minX: -147.0, maxX: -129.0, minZ: -144.0, maxZ: -143.1, height: 4.4, zone: 'nanar_bari' },
  { id: 'nana_w_wall', minX: -147.0, maxX: -146.1, minZ: -144.0, maxZ: -126.0, height: 4.4, zone: 'nanar_bari' },
  { id: 'nana_e_wall', minX: -129.9, maxX: -129.0, minZ: -144.0, maxZ: -126.0, height: 4.4, zone: 'nanar_bari' },
  { id: 'nana_s_w', minX: -147.0, maxX: -141.0, minZ: -126.9, maxZ: -126.0, height: 4.4, zone: 'nanar_bari' },
  { id: 'nana_s_e', minX: -135.0, maxX: -129.0, minZ: -126.9, maxZ: -126.0, height: 4.4, zone: 'nanar_bari' },
  { id: 'nana_table', minX: -144.5, maxX: -140.5, minZ: -141.5, maxZ: -139.0, height: 1.0, zone: 'nanar_bari' },

  // 2. Balaka Cineplex (-78..-60, -144..-126) — Grand Two-Story Cineplex (5.4m), open South doorway x: -72..-66
  { id: 'cinema_n_wall', minX: -78.0, maxX: -60.0, minZ: -144.0, maxZ: -143.1, height: 5.4, zone: 'cinema_hall' },
  { id: 'cinema_w_wall', minX: -78.0, maxX: -77.1, minZ: -144.0, maxZ: -126.0, height: 5.4, zone: 'cinema_hall' },
  { id: 'cinema_e_wall', minX: -60.9, maxX: -60.0, minZ: -144.0, maxZ: -126.0, height: 5.4, zone: 'cinema_hall' },
  { id: 'cinema_s_w', minX: -78.0, maxX: -72.0, minZ: -126.9, maxZ: -126.0, height: 5.4, zone: 'cinema_hall' },
  { id: 'cinema_s_e', minX: -66.0, maxX: -60.0, minZ: -126.9, maxZ: -126.0, height: 5.4, zone: 'cinema_hall' },
  { id: 'cinema_seats', minX: -74.5, maxX: -63.5, minZ: -140.5, maxZ: -138.2, height: 1.05, zone: 'cinema_hall' },

  // 3. Boro Bhai Duplex (-38..-18, -144..-126) — Grand Two-Story Duplex (5.4m), open South doorway x: -31..-25
  { id: 'bhai_n_wall', minX: -38.0, maxX: -18.0, minZ: -144.0, maxZ: -143.1, height: 5.4, zone: 'bhai_duplex' },
  { id: 'bhai_w_wall', minX: -38.0, maxX: -37.1, minZ: -144.0, maxZ: -126.0, height: 5.4, zone: 'bhai_duplex' },
  { id: 'bhai_e_wall', minX: -18.9, maxX: -18.0, minZ: -144.0, maxZ: -126.0, height: 5.4, zone: 'bhai_duplex' },
  { id: 'bhai_s_w', minX: -38.0, maxX: -31.0, minZ: -126.9, maxZ: -126.0, height: 5.4, zone: 'bhai_duplex' },
  { id: 'bhai_s_e', minX: -25.0, maxX: -18.0, minZ: -126.9, maxZ: -126.0, height: 5.4, zone: 'bhai_duplex' },
  { id: 'bhai_sofa', minX: -35.0, maxX: -30.5, minZ: -141.5, maxZ: -139.2, height: 1.0, zone: 'bhai_duplex' },

  // 4. A+ Coaching Center (18..38, -144..-126) — Two-Story Coaching Building (5.0m), open South doorway x: 25..31
  { id: 'coach_n_wall', minX: 18.0, maxX: 38.0, minZ: -144.0, maxZ: -143.1, height: 5.0, zone: 'coaching_center' },
  { id: 'coach_w_wall', minX: 18.0, maxX: 18.9, minZ: -144.0, maxZ: -126.0, height: 5.0, zone: 'coaching_center' },
  { id: 'coach_e_wall', minX: 37.1, maxX: 38.0, minZ: -144.0, maxZ: -126.0, height: 5.0, zone: 'coaching_center' },
  { id: 'coach_s_w', minX: 18.0, maxX: 25.0, minZ: -126.9, maxZ: -126.0, height: 5.0, zone: 'coaching_center' },
  { id: 'coach_s_e', minX: 31.0, maxX: 38.0, minZ: -126.9, maxZ: -126.0, height: 5.0, zone: 'coaching_center' },
  { id: 'coach_desk', minX: 22.0, maxX: 34.0, minZ: -141.5, maxZ: -139.5, height: 1.05, zone: 'coaching_center' },

  // 5. Khalu-r Bari (60..78, -144..-126) — open South doorway x: 66..72
  { id: 'khalu_n_wall', minX: 60.0, maxX: 78.0, minZ: -144.0, maxZ: -143.1, height: 4.4, zone: 'khalur_bari' },
  { id: 'khalu_w_wall', minX: 60.0, maxX: 60.9, minZ: -144.0, maxZ: -126.0, height: 4.4, zone: 'khalur_bari' },
  { id: 'khalu_e_wall', minX: 77.1, maxX: 78.0, minZ: -144.0, maxZ: -126.0, height: 4.4, zone: 'khalur_bari' },
  { id: 'khalu_s_w', minX: 60.0, maxX: 66.0, minZ: -126.9, maxZ: -126.0, height: 4.4, zone: 'khalur_bari' },
  { id: 'khalu_s_e', minX: 72.0, maxX: 78.0, minZ: -126.9, maxZ: -126.0, height: 4.4, zone: 'khalur_bari' },
  { id: 'khalu_table', minX: 70.5, maxX: 75.0, minZ: -141.5, maxZ: -139.2, height: 1.0, zone: 'khalur_bari' },

  // 6. Jheel Par Lake Water (-146..-130, -91..-73) + Shishu Park Nagordola Base (136..140, -84..-80)
  { id: 'jheel_water', minX: -146.5, maxX: -130.5, minZ: -91.5, maxZ: -72.5, height: 0.4, zone: 'jheel_par' },
  { id: 'park_ferris_base', minX: 136.0, maxX: 141.5, minZ: -85.0, maxZ: -79.0, height: 2.2, zone: 'shishu_park' },

  // 7. Nawab Kacchi Ghor (-147..-129, -38..-18) — open East doorway z: -31.5..-24.5
  { id: 'kacchi_w_wall', minX: -147.0, maxX: -146.1, minZ: -38.0, maxZ: -18.0, height: 4.4, zone: 'kacchi_house' },
  { id: 'kacchi_n_wall', minX: -147.0, maxX: -129.0, minZ: -38.0, maxZ: -37.1, height: 4.4, zone: 'kacchi_house' },
  { id: 'kacchi_s_wall', minX: -147.0, maxX: -129.0, minZ: -18.9, maxZ: -18.0, height: 4.4, zone: 'kacchi_house' },
  { id: 'kacchi_e_n', minX: -129.9, maxX: -129.0, minZ: -38.0, maxZ: -31.5, height: 4.4, zone: 'kacchi_house' },
  { id: 'kacchi_e_s', minX: -129.9, maxX: -129.0, minZ: -24.5, maxZ: -18.0, height: 4.4, zone: 'kacchi_house' },
  { id: 'kacchi_deg_counter', minX: -145.6, maxX: -142.2, minZ: -34.5, maxZ: -21.5, height: 1.25, zone: 'kacchi_house' },

  // 8. GG Cyber Adda (-147..-129, 18..38) — Two-Story Gaming Hub (5.0m), open East doorway z: 24.5..31.5
  { id: 'cyber_w_wall', minX: -147.0, maxX: -146.1, minZ: 18.0, maxZ: 38.0, height: 5.0, zone: 'cyber_cafe' },
  { id: 'cyber_n_wall', minX: -147.0, maxX: -129.0, minZ: 18.0, maxZ: 18.9, height: 5.0, zone: 'cyber_cafe' },
  { id: 'cyber_s_wall', minX: -147.0, maxX: -129.0, minZ: 37.1, maxZ: 38.0, height: 5.0, zone: 'cyber_cafe' },
  { id: 'cyber_e_n', minX: -129.9, maxX: -129.0, minZ: 18.0, maxZ: 24.5, height: 5.0, zone: 'cyber_cafe' },
  { id: 'cyber_e_s', minX: -129.9, maxX: -129.0, minZ: 31.5, maxZ: 38.0, height: 5.0, zone: 'cyber_cafe' },
  { id: 'cyber_pc_row', minX: -145.6, maxX: -142.5, minZ: 21.0, maxZ: 35.0, height: 1.15, zone: 'cyber_cafe' },

  // 9. Shilpi Dorji Bari (129..147, -38..-18) — open West doorway z: -31.5..-24.5
  { id: 'dorji_e_wall', minX: 146.1, maxX: 147.0, minZ: -38.0, maxZ: -18.0, height: 4.4, zone: 'dorji_bari' },
  { id: 'dorji_n_wall', minX: 129.0, maxX: 147.0, minZ: -38.0, maxZ: -37.1, height: 4.4, zone: 'dorji_bari' },
  { id: 'dorji_s_wall', minX: 129.0, maxX: 147.0, minZ: -18.9, maxZ: -18.0, height: 4.4, zone: 'dorji_bari' },
  { id: 'dorji_w_n', minX: 129.0, maxX: 129.9, minZ: -38.0, maxZ: -31.5, height: 4.4, zone: 'dorji_bari' },
  { id: 'dorji_w_s', minX: 129.0, maxX: 129.9, minZ: -24.5, maxZ: -18.0, height: 4.4, zone: 'dorji_bari' },
  { id: 'dorji_table', minX: 142.5, maxX: 145.6, minZ: -34.5, maxZ: -21.5, height: 1.15, zone: 'dorji_bari' },

  // 10. Tiger Para Gym (129..147, 18..38) — Grand Two-Story Fitness Arena (5.4m), open West doorway z: 24.5..31.5
  { id: 'gym_e_wall', minX: 146.1, maxX: 147.0, minZ: 18.0, maxZ: 38.0, height: 5.4, zone: 'tiger_gym' },
  { id: 'gym_n_wall', minX: 129.0, maxX: 147.0, minZ: 18.0, maxZ: 18.9, height: 5.4, zone: 'tiger_gym' },
  { id: 'gym_s_wall', minX: 129.0, maxX: 147.0, minZ: 37.1, maxZ: 38.0, height: 5.4, zone: 'tiger_gym' },
  { id: 'gym_w_n', minX: 129.0, maxX: 129.9, minZ: 18.0, maxZ: 24.5, height: 5.4, zone: 'tiger_gym' },
  { id: 'gym_w_s', minX: 129.0, maxX: 129.9, minZ: 31.5, maxZ: 38.0, height: 5.4, zone: 'tiger_gym' },
  { id: 'gym_rack', minX: 142.5, maxX: 145.6, minZ: 21.5, maxZ: 34.5, height: 1.85, zone: 'tiger_gym' },

  // 11. South Opar Para: Mach Bazar, Rail Colony Quarters, South Signal Tower, Fufu-r Bari
  { id: 'mach_table_n', minX: -75.5, maxX: -62.5, minZ: 121.0, maxZ: 123.5, height: 1.15, zone: 'mach_bazar' },
  { id: 'mach_table_s', minX: -75.5, maxX: -62.5, minZ: 132.5, maxZ: 135.0, height: 1.15, zone: 'mach_bazar' },

  // Rail Colony Quarters (-38..-18, 119..137) — Two-Story Quarters (5.0m), open North doorway x: -31..-25
  { id: 'colony_s_wall', minX: -38.0, maxX: -18.0, minZ: 136.1, maxZ: 137.0, height: 5.0, zone: 'rail_colony' },
  { id: 'colony_w_wall', minX: -38.0, maxX: -37.1, minZ: 119.0, maxZ: 137.0, height: 5.0, zone: 'rail_colony' },
  { id: 'colony_e_wall', minX: -18.9, maxX: -18.0, minZ: 119.0, maxZ: 137.0, height: 5.0, zone: 'rail_colony' },
  { id: 'colony_n_w', minX: -38.0, maxX: -31.0, minZ: 119.0, maxZ: 119.9, height: 5.0, zone: 'rail_colony' },
  { id: 'colony_n_e', minX: -25.0, maxX: -18.0, minZ: 119.0, maxZ: 119.9, height: 5.0, zone: 'rail_colony' },
  { id: 'colony_sofa', minX: -35.0, maxX: -30.5, minZ: 131.5, maxZ: 134.5, height: 1.0, zone: 'rail_colony' },

  // South Signal Yard (18..38, 119..137)
  { id: 'signal_tower_base', minX: 31.5, maxX: 36.0, minZ: 124.5, maxZ: 131.5, height: 3.8, zone: 'signal_yard' },

  // Fufu-r Bari (60..78, 119..137) — open North doorway x: 66..72
  { id: 'fufu_s_wall', minX: 60.0, maxX: 78.0, minZ: 136.1, maxZ: 137.0, height: 4.4, zone: 'fufu_bari' },
  { id: 'fufu_w_wall', minX: 60.0, maxX: 60.9, minZ: 119.0, maxZ: 137.0, height: 4.4, zone: 'fufu_bari' },
  { id: 'fufu_e_wall', minX: 77.1, maxX: 78.0, minZ: 119.0, maxZ: 137.0, height: 4.4, zone: 'fufu_bari' },
  { id: 'fufu_n_w', minX: 60.0, maxX: 66.0, minZ: 119.0, maxZ: 119.9, height: 4.4, zone: 'fufu_bari' },
  { id: 'fufu_n_e', minX: 72.0, maxX: 78.0, minZ: 119.0, maxZ: 119.9, height: 4.4, zone: 'fufu_bari' },
  { id: 'fufu_table', minX: 71.0, maxX: 75.0, minZ: 131.5, maxZ: 134.5, height: 1.0, zone: 'fufu_bari' },

  // Tactical Far-Moholla Sightline Walls & Supply Cover
  { id: 'outer_lane_nw', minX: -108.0, maxX: -98.0, minZ: -64.0, maxZ: -62.0, height: 2.8 },
  { id: 'outer_lane_ne', minX: 98.0, maxX: 108.0, minZ: -64.0, maxZ: -62.0, height: 2.8 },
  { id: 'outer_lane_sw', minX: -108.0, maxX: -98.0, minZ: 62.0, maxZ: 64.0, height: 2.8 },
  { id: 'outer_lane_se', minX: 98.0, maxX: 108.0, minZ: 62.0, maxZ: 64.0, height: 2.8 },

  // PUBG + GTA + Free Fire Outer Tactical Freight Containers, Parked Vehicles & Airdrop Crates
  { id: 'cont_nw_1', minX: -107.0, maxX: -100.5, minZ: -95.0, maxZ: -92.4, height: 2.9 },
  { id: 'cont_nw_2', minX: -105.0, maxX: -98.5, minZ: -85.0, maxZ: -82.4, height: 2.9 },
  { id: 'cont_ne_1', minX: 98.0, maxX: 104.5, minZ: -96.0, maxZ: -93.4, height: 2.9 },
  { id: 'cont_ne_2', minX: 100.5, maxX: 107.0, minZ: -84.0, maxZ: -81.4, height: 2.9 },
  { id: 'cont_sw_1', minX: -108.0, maxX: -101.5, minZ: 126.0, maxZ: 128.6, height: 2.9 },
  { id: 'cont_se_1', minX: 98.5, maxX: 105.0, minZ: 126.0, maxZ: 128.6, height: 2.9 },
  { id: 'cont_west_yard', minX: -144.0, maxX: -137.5, minZ: -64.5, maxZ: -61.9, height: 2.9 },
  { id: 'cont_east_yard', minX: 137.5, maxX: 144.0, minZ: -64.5, maxZ: -61.9, height: 2.9 },

  { id: 'airdrop_nw_park', minX: -101.2, maxX: -99.4, minZ: -18.8, maxZ: -17.0, height: 1.65 },
  { id: 'airdrop_ne_park', minX: 99.4, maxX: 101.2, minZ: 17.0, maxZ: 18.8, height: 1.65 },
  { id: 'airdrop_south_plaza', minX: -4.2, maxX: -2.4, minZ: 125.0, maxZ: 126.8, height: 1.65 },

  // Outer Moholla & Opar Para Street Props (Tapri Stalls, Brick Depots, Haat Stalls)
  { id: 'tapri_nw', minX: -104.1, maxX: -99.9, minZ: -128.6, maxZ: -125.9, height: 2.55 },
  { id: 'tapri_ne', minX: 99.9, maxX: 104.1, minZ: -128.6, maxZ: -125.9, height: 2.55 },
  { id: 'brick_depot_sw', minX: -106.5, maxX: -101.8, minZ: 103.0, maxZ: 105.8, height: 1.6 },
  { id: 'tapri_sw_1', minX: -108.1, maxX: -103.9, minZ: 118.8, maxZ: 121.4, height: 2.55 },
  { id: 'haat_stall_se_1', minX: 94.0, maxX: 98.2, minZ: 118.8, maxZ: 121.4, height: 2.55 },
  { id: 'haat_stall_se_2', minX: 103.4, maxX: 107.6, minZ: 118.8, maxZ: 121.4, height: 2.55 },
  { id: 'tapri_se_far', minX: 131.9, maxX: 136.1, minZ: 124.7, maxZ: 127.3, height: 2.55 },
];

// Rolling Tin Shutters across building doorways when Vondo triggers Door Lock Sabotage
export const DOORS: DoorSpec[] = [
  {
    id: 'door_cha_s',
    zoneId: 'cha_dokan',
    label: 'চায়ের দোকানের শাটার',
    minX: -36.5,
    maxX: -25.9,
    minZ: -23.4,
    maxZ: -22.5,
    height: 2.9,
  },
  {
    id: 'door_rick_s',
    zoneId: 'rickshaw_garage',
    label: 'রিকশা গ্যারেজের শাটার',
    minX: 25.9,
    maxX: 36.5,
    minZ: -23.4,
    maxZ: -22.5,
    height: 2.9,
  },
  {
    id: 'door_desco_n',
    zoneId: 'desco_power',
    label: 'ডেসকো অফিসের শাটার',
    minX: -36.5,
    maxX: -25.9,
    minZ: 22.5,
    maxZ: 23.4,
    height: 2.9,
  },
  {
    id: 'door_dish_n',
    zoneId: 'dish_roof',
    label: 'ডিশ অফিসের শাটার',
    minX: 25.9,
    maxX: 36.5,
    minZ: 22.5,
    maxZ: 23.4,
    height: 2.9,
  },
];

// Walkable Moholla Building Rooftops + Para Houses + Rail Foot-Overbridge
export const ROOFTOPS: RoofDeckDef[] = [
  {
    id: 'cha_roof',
    zoneId: 'cha_dokan',
    label: 'চায়ের দোকানের ছাদ',
    minX: -45.0,
    maxX: -25.0,
    minZ: -41.0,
    maxZ: -22.5,
    elevationY: 3.85,
    stairOpenings: [{ minX: -45.8, maxX: -43.5, minZ: -37.2, maxZ: -32.8 }],
  },
  {
    id: 'rick_roof',
    zoneId: 'rickshaw_garage',
    label: 'রিকশা গ্যারেজের ছাদ',
    minX: 25.0,
    maxX: 45.0,
    minZ: -41.0,
    maxZ: -22.5,
    elevationY: 3.85,
    stairOpenings: [{ minX: 43.5, maxX: 45.8, minZ: -37.2, maxZ: -32.8 }],
  },
  {
    id: 'desco_roof',
    zoneId: 'desco_power',
    label: 'ডেসকো ছাদ',
    minX: -45.0,
    maxX: -25.0,
    minZ: 22.5,
    maxZ: 41.0,
    elevationY: 5.05,
    stairOpenings: [{ minX: -45.8, maxX: -43.5, minZ: 32.8, maxZ: 37.2 }],
  },
  {
    id: 'dish_deck',
    zoneId: 'dish_roof',
    label: 'ডিশ অফিসের ছাদ',
    minX: 25.0,
    maxX: 45.0,
    minZ: 22.5,
    maxZ: 41.0,
    elevationY: 5.05,
    stairOpenings: [{ minX: 43.5, maxX: 45.8, minZ: 32.8, maxZ: 37.2 }],
  },
  {
    id: 'saloon_roof',
    zoneId: 'saloon_goli',
    label: 'হিরো সেলুনের ছাদ',
    minX: -75.0,
    maxX: -57.0,
    minZ: -35.0,
    maxZ: -17.0,
    elevationY: 3.85,
    stairOpenings: [{ minX: -71.8, maxX: -67.5, minZ: -35.8, maxZ: -33.5 }],
  },
  {
    id: 'pharm_roof',
    zoneId: 'pharmacy_mor',
    label: 'দাদু ফার্মেসির ছাদ',
    minX: -75.0,
    maxX: -57.0,
    minZ: 17.0,
    maxZ: 35.0,
    elevationY: 3.85,
    stairOpenings: [{ minX: -71.8, maxX: -67.5, minZ: 33.5, maxZ: 35.8 }],
  },
  {
    id: 'kaka_roof',
    zoneId: 'kakar_bari',
    label: 'কাকার বাড়ির ছাদ',
    minX: -82.0,
    maxX: -66.0,
    minZ: -96.0,
    maxZ: -80.0,
    elevationY: 4.45,
    stairOpenings: [{ minX: -67.5, maxX: -65.2, minZ: -90.4, maxZ: -86.0 }],
  },
  {
    id: 'master_roof',
    zoneId: 'master_bari',
    label: 'মাস্টার বাড়ির ছাদ',
    minX: -40.0,
    maxX: -24.0,
    minZ: -96.0,
    maxZ: -80.0,
    elevationY: 4.45,
    stairOpenings: [{ minX: -25.5, maxX: -23.2, minZ: -90.4, maxZ: -86.0 }],
  },
  {
    id: 'chacha_roof',
    zoneId: 'chacha_bari',
    label: 'চাচার বাড়ির ছাদ',
    minX: 24.0,
    maxX: 40.0,
    minZ: -96.0,
    maxZ: -80.0,
    elevationY: 4.45,
    stairOpenings: [{ minX: 23.2, maxX: 25.5, minZ: -90.4, maxZ: -86.0 }],
  },
  {
    id: 'khala_roof',
    zoneId: 'khalar_bari',
    label: 'খালার বাড়ির ছাদ',
    minX: 66.0,
    maxX: 82.0,
    minZ: -96.0,
    maxZ: -80.0,
    elevationY: 4.45,
    stairOpenings: [{ minX: 65.2, maxX: 67.5, minZ: -90.4, maxZ: -86.0 }],
  },
  {
    id: 'rail_overbridge',
    zoneId: 'rail_station',
    label: 'রেল ওভারব্রিজ',
    minX: 14.0,
    maxX: 18.0,
    minZ: 79.5,
    maxZ: 93.5,
    elevationY: 4.35,
    stairOpenings: [
      { minX: 14.0, maxX: 18.0, minZ: 79.0, maxZ: 80.5 },
      { minX: 14.0, maxX: 18.0, minZ: 92.5, maxZ: 94.0 },
    ],
  },
  // 11 New Outer Moholla & Opar Para Walkable Rooftops
  {
    id: 'nana_roof',
    zoneId: 'nanar_bari',
    label: 'নানার বাড়ির ছাদ',
    minX: -147.0,
    maxX: -129.0,
    minZ: -144.0,
    maxZ: -126.0,
    elevationY: 4.45,
    stairOpenings: [{ minX: -130.5, maxX: -128.2, minZ: -138.2, maxZ: -133.5 }],
  },
  {
    id: 'cinema_roof',
    zoneId: 'cinema_hall',
    label: 'বলাকা সিনেমা হলের ছাদ',
    minX: -78.0,
    maxX: -60.0,
    minZ: -144.0,
    maxZ: -126.0,
    elevationY: 5.45,
    stairOpenings: [{ minX: -61.5, maxX: -59.2, minZ: -138.2, maxZ: -133.5 }],
  },
  {
    id: 'bhai_roof',
    zoneId: 'bhai_duplex',
    label: 'বড় ভাই ডুপ্লেক্সের ছাদ',
    minX: -38.0,
    maxX: -18.0,
    minZ: -144.0,
    maxZ: -126.0,
    elevationY: 5.45,
    stairOpenings: [{ minX: -38.8, maxX: -36.5, minZ: -138.2, maxZ: -133.5 }],
  },
  {
    id: 'coaching_roof',
    zoneId: 'coaching_center',
    label: 'কোচিং সেন্টারের ছাদ',
    minX: 18.0,
    maxX: 38.0,
    minZ: -144.0,
    maxZ: -126.0,
    elevationY: 5.05,
    stairOpenings: [{ minX: 36.5, maxX: 38.8, minZ: -138.2, maxZ: -133.5 }],
  },
  {
    id: 'khalu_roof',
    zoneId: 'khalur_bari',
    label: 'খালুর বাড়ির ছাদ',
    minX: 60.0,
    maxX: 78.0,
    minZ: -144.0,
    maxZ: -126.0,
    elevationY: 4.45,
    stairOpenings: [{ minX: 59.2, maxX: 61.5, minZ: -138.2, maxZ: -133.5 }],
  },
  {
    id: 'kacchi_roof',
    zoneId: 'kacchi_house',
    label: 'নবাব কাচ্চির ছাদ',
    minX: -147.0,
    maxX: -129.0,
    minZ: -38.0,
    maxZ: -18.0,
    elevationY: 4.45,
    stairOpenings: [{ minX: -141.8, maxX: -137.2, minZ: -19.5, maxZ: -17.2 }],
  },
  {
    id: 'cyber_roof',
    zoneId: 'cyber_cafe',
    label: 'সাইবার আড্ডার ছাদ',
    minX: -147.0,
    maxX: -129.0,
    minZ: 18.0,
    maxZ: 38.0,
    elevationY: 5.05,
    stairOpenings: [{ minX: -141.8, maxX: -137.2, minZ: 17.2, maxZ: 19.5 }],
  },
  {
    id: 'dorji_roof',
    zoneId: 'dorji_bari',
    label: 'দর্জি বাড়ির ছাদ',
    minX: 129.0,
    maxX: 147.0,
    minZ: -38.0,
    maxZ: -18.0,
    elevationY: 4.45,
    stairOpenings: [{ minX: 137.2, maxX: 141.8, minZ: -19.5, maxZ: -17.2 }],
  },
  {
    id: 'gym_roof',
    zoneId: 'tiger_gym',
    label: 'টাইগার জিমের ছাদ',
    minX: 129.0,
    maxX: 147.0,
    minZ: 18.0,
    maxZ: 38.0,
    elevationY: 5.45,
    stairOpenings: [{ minX: 137.2, maxX: 141.8, minZ: 17.2, maxZ: 19.5 }],
  },
  {
    id: 'colony_roof',
    zoneId: 'rail_colony',
    label: 'রেল কলোনির ছাদ',
    minX: -38.0,
    maxX: -18.0,
    minZ: 119.0,
    maxZ: 137.0,
    elevationY: 5.05,
    stairOpenings: [{ minX: -38.8, maxX: -36.5, minZ: 128.5, maxZ: 133.2 }],
  },
  {
    id: 'fufu_roof',
    zoneId: 'fufu_bari',
    label: 'ফুফুর বাড়ির ছাদ',
    minX: 60.0,
    maxX: 78.0,
    minZ: 119.0,
    maxZ: 137.0,
    elevationY: 4.45,
    stairOpenings: [{ minX: 76.5, maxX: 78.8, minZ: 128.5, maxZ: 133.2 }],
  },
];

export const STAIR_RAMPS: StairRampDef[] = [
  {
    id: 'cha_stair',
    roofId: 'cha_roof',
    label: 'চায়ের দোকানের সিঁড়ি',
    minX: -48.0,
    maxX: -45.0,
    minZ: -37.0,
    maxZ: -25.5,
    axis: 'z',
    bottomCoord: -25.5,
    topCoord: -33.2,
    topY: 3.85,
    steps: 14,
  },
  {
    id: 'rick_stair',
    roofId: 'rick_roof',
    label: 'রিকশা গ্যারেজের সিঁড়ি',
    minX: 45.0,
    maxX: 48.0,
    minZ: -37.0,
    maxZ: -25.5,
    axis: 'z',
    bottomCoord: -25.5,
    topCoord: -33.2,
    topY: 3.85,
    steps: 14,
  },
  {
    id: 'desco_stair',
    roofId: 'desco_roof',
    label: 'ডেসকো সিঁড়ি',
    minX: -48.0,
    maxX: -45.0,
    minZ: 25.5,
    maxZ: 37.0,
    axis: 'z',
    bottomCoord: 25.5,
    topCoord: 33.2,
    topY: 5.05,
    steps: 18,
  },
  {
    id: 'dish_stair',
    roofId: 'dish_deck',
    label: 'ডিশ অফিসের সিঁড়ি',
    minX: 45.0,
    maxX: 48.0,
    minZ: 25.5,
    maxZ: 37.0,
    axis: 'z',
    bottomCoord: 25.5,
    topCoord: 33.2,
    topY: 5.05,
    steps: 18,
  },
  {
    id: 'saloon_stair',
    roofId: 'saloon_roof',
    label: 'সেলুনের সিঁড়ি',
    minX: -71.5,
    maxX: -60.2,
    minZ: -38.0,
    maxZ: -35.0,
    axis: 'x',
    bottomCoord: -60.2,
    topCoord: -67.9,
    topY: 3.85,
    steps: 14,
  },
  {
    id: 'pharm_stair',
    roofId: 'pharm_roof',
    label: 'ফার্মেসির সিঁড়ি',
    minX: -71.5,
    maxX: -60.2,
    minZ: 35.0,
    maxZ: 38.0,
    axis: 'x',
    bottomCoord: -60.2,
    topCoord: -67.9,
    topY: 3.85,
    steps: 14,
  },
  {
    id: 'kaka_stair',
    roofId: 'kaka_roof',
    label: 'কাকার বাড়ির সিঁড়ি',
    minX: -66.0,
    maxX: -63.0,
    minZ: -90.2,
    maxZ: -79.0,
    axis: 'z',
    bottomCoord: -79.0,
    topCoord: -86.4,
    topY: 4.45,
    steps: 16,
  },
  {
    id: 'master_stair',
    roofId: 'master_roof',
    label: 'মাস্টার বাড়ির সিঁড়ি',
    minX: -24.0,
    maxX: -21.0,
    minZ: -90.2,
    maxZ: -79.0,
    axis: 'z',
    bottomCoord: -79.0,
    topCoord: -86.4,
    topY: 4.45,
    steps: 16,
  },
  {
    id: 'chacha_stair',
    roofId: 'chacha_roof',
    label: 'চাচার বাড়ির সিঁড়ি',
    minX: 21.0,
    maxX: 24.0,
    minZ: -90.2,
    maxZ: -79.0,
    axis: 'z',
    bottomCoord: -79.0,
    topCoord: -86.4,
    topY: 4.45,
    steps: 16,
  },
  {
    id: 'khala_stair',
    roofId: 'khala_roof',
    label: 'খালার বাড়ির সিঁড়ি',
    minX: 63.0,
    maxX: 66.0,
    minZ: -90.2,
    maxZ: -79.0,
    axis: 'z',
    bottomCoord: -79.0,
    topCoord: -86.4,
    topY: 4.45,
    steps: 16,
  },
  {
    id: 'rail_bridge_stair_n',
    roofId: 'rail_overbridge',
    label: 'ওভারব্রিজ উত্তর সিঁড়ি',
    minX: 14.0,
    maxX: 18.0,
    minZ: 71.0,
    maxZ: 79.5,
    axis: 'z',
    bottomCoord: 71.0,
    topCoord: 79.5,
    topY: 4.35,
    steps: 18,
  },
  {
    id: 'rail_bridge_stair_s',
    roofId: 'rail_overbridge',
    label: 'ওভারব্রিজ দক্ষিণ সিঁড়ি',
    minX: 14.0,
    maxX: 18.0,
    minZ: 93.5,
    maxZ: 101.0,
    axis: 'z',
    bottomCoord: 101.0,
    topCoord: 93.5,
    topY: 4.35,
    steps: 18,
  },
  // 11 New Exterior Staircases
  {
    id: 'nana_stair',
    roofId: 'nana_roof',
    label: 'নানার বাড়ির সিঁড়ি',
    minX: -129.0,
    maxX: -126.0,
    minZ: -138.0,
    maxZ: -126.5,
    axis: 'z',
    bottomCoord: -126.5,
    topCoord: -134.2,
    topY: 4.45,
    steps: 16,
  },
  {
    id: 'cinema_stair',
    roofId: 'cinema_roof',
    label: 'সিনেমা হলের সিঁড়ি',
    minX: -60.0,
    maxX: -57.0,
    minZ: -138.0,
    maxZ: -126.5,
    axis: 'z',
    bottomCoord: -126.5,
    topCoord: -134.2,
    topY: 5.45,
    steps: 20,
  },
  {
    id: 'bhai_stair',
    roofId: 'bhai_roof',
    label: 'বড় ভাই ডুপ্লেক্সের সিঁড়ি',
    minX: -41.0,
    maxX: -38.0,
    minZ: -138.0,
    maxZ: -126.5,
    axis: 'z',
    bottomCoord: -126.5,
    topCoord: -134.2,
    topY: 5.45,
    steps: 20,
  },
  {
    id: 'coaching_stair',
    roofId: 'coaching_roof',
    label: 'কোচিং সেন্টারের সিঁড়ি',
    minX: 38.0,
    maxX: 41.0,
    minZ: -138.0,
    maxZ: -126.5,
    axis: 'z',
    bottomCoord: -126.5,
    topCoord: -134.2,
    topY: 5.05,
    steps: 18,
  },
  {
    id: 'khalu_stair',
    roofId: 'khalu_roof',
    label: 'খালুর বাড়ির সিঁড়ি',
    minX: 57.0,
    maxX: 60.0,
    minZ: -138.0,
    maxZ: -126.5,
    axis: 'z',
    bottomCoord: -126.5,
    topCoord: -134.2,
    topY: 4.45,
    steps: 16,
  },
  {
    id: 'kacchi_stair',
    roofId: 'kacchi_roof',
    label: 'কাচ্চি ঘরের সিঁড়ি',
    minX: -141.5,
    maxX: -130.0,
    minZ: -18.0,
    maxZ: -15.0,
    axis: 'x',
    bottomCoord: -130.0,
    topCoord: -137.8,
    topY: 4.45,
    steps: 16,
  },
  {
    id: 'cyber_stair',
    roofId: 'cyber_roof',
    label: 'সাইবার আড্ডার সিঁড়ি',
    minX: -141.5,
    maxX: -130.0,
    minZ: 15.0,
    maxZ: 18.0,
    axis: 'x',
    bottomCoord: -130.0,
    topCoord: -137.8,
    topY: 5.05,
    steps: 18,
  },
  {
    id: 'dorji_stair',
    roofId: 'dorji_roof',
    label: 'দর্জি বাড়ির সিঁড়ি',
    minX: 130.0,
    maxX: 141.5,
    minZ: -18.0,
    maxZ: -15.0,
    axis: 'x',
    bottomCoord: 130.0,
    topCoord: 137.8,
    topY: 4.45,
    steps: 16,
  },
  {
    id: 'gym_stair',
    roofId: 'gym_roof',
    label: 'টাইগার জিমের সিঁড়ি',
    minX: 130.0,
    maxX: 141.5,
    minZ: 15.0,
    maxZ: 18.0,
    axis: 'x',
    bottomCoord: 130.0,
    topCoord: 137.8,
    topY: 5.45,
    steps: 20,
  },
  {
    id: 'colony_stair',
    roofId: 'colony_roof',
    label: 'রেল কলোনির সিঁড়ি',
    minX: -41.0,
    maxX: -38.0,
    minZ: 121.0,
    maxZ: 132.5,
    axis: 'z',
    bottomCoord: 121.0,
    topCoord: 128.8,
    topY: 5.05,
    steps: 18,
  },
  {
    id: 'fufu_stair',
    roofId: 'fufu_roof',
    label: 'ফুফুর বাড়ির সিঁড়ি',
    minX: 78.0,
    maxX: 81.0,
    minZ: 121.0,
    maxZ: 132.5,
    axis: 'z',
    bottomCoord: 121.0,
    topCoord: 128.8,
    topY: 4.45,
    steps: 16,
  },
];

export const TASK_STATIONS: TaskStation[] = [
  {
    id: 'task_cha',
    kind: 'cha_mix',
    title: 'দুধ-চা বানানো',
    banglaTitle: 'দুধ-চা বানানো',
    zoneName: 'চায়ের দোকান',
    x: -35.5,
    z: -32.2,
    radius: 2.8,
    category: 'common',
    medium: 'physical',
    holdDurationSec: 4,
    isVisual: true,
  },
  {
    id: 'task_rickshaw',
    kind: 'rickshaw_pump',
    title: 'রিকশার চাকা পাম্প',
    banglaTitle: 'রিকশার চাকা পাম্প',
    zoneName: 'রিকশা গ্যারেজ',
    x: 32.5,
    z: -29.5,
    radius: 2.8,
    category: 'short',
    medium: 'physical',
    holdDurationSec: 3,
  },
  {
    id: 'task_desco',
    kind: 'fuse_fix',
    title: 'ডেসকো ফিউজ ঠিক করা',
    banglaTitle: 'ফিউজ ঠিক করা',
    zoneName: 'লোডশেডিং ঘর',
    x: -31.2,
    z: 32.5,
    radius: 2.8,
    category: 'long',
    medium: 'digital',
    holdDurationSec: 5,
  },
  {
    id: 'task_dish',
    kind: 'dish_tune',
    title: 'ডিশ অ্যান্টেনা সেট করা',
    banglaTitle: 'ডিশ সিগন্যাল সেট',
    zoneName: 'ডিশ কন্ট্রোল',
    x: 34.5,
    z: 29.0,
    radius: 2.8,
    category: 'long',
    medium: 'digital',
    holdDurationSec: 6,
  },
  {
    id: 'task_pukur',
    kind: 'pukur_check',
    title: 'পুকুর পানি ও স্ক্যান',
    banglaTitle: 'পুকুর পানি ও স্ক্যান',
    zoneName: 'পুকুর ঘাট',
    x: -37.5,
    z: 0,
    radius: 2.9,
    category: 'common',
    medium: 'physical',
    holdDurationSec: 4,
    isVisual: true,
  },
  {
    id: 'task_bazar',
    kind: 'bazar_hisab',
    title: 'বাজারের হিসাব মেলানো',
    banglaTitle: 'বাজারের হিসাব',
    zoneName: 'মহল্লা বাজার',
    x: 38.5,
    z: 0,
    radius: 2.8,
    category: 'common',
    medium: 'digital',
    holdDurationSec: 3,
  },
  {
    id: 'task_eidgah',
    kind: 'fuse_fix',
    title: 'ঈদগাহর বাতি জ্বালানো',
    banglaTitle: 'ঈদগাহর বাতি জ্বালানো',
    zoneName: 'ঈদগাহ মাঠ',
    x: 0,
    z: -37.0,
    radius: 2.8,
    category: 'short',
    medium: 'physical',
    holdDurationSec: 3,
  },
  {
    id: 'task_wasa',
    kind: 'rickshaw_pump',
    title: 'পানির ট্যাংক পাম্প',
    banglaTitle: 'পানির ট্যাংক পাম্প',
    zoneName: 'পানির ট্যাংক',
    x: 0,
    z: 32.5,
    radius: 2.8,
    category: 'short',
    medium: 'physical',
    holdDurationSec: 4,
  },
  // Mid-Ring Moholla Locations
  {
    id: 'task_fuchka',
    kind: 'fuchka_serve',
    title: 'ঝাল ফুচকা পরিবেশন',
    banglaTitle: 'ঝাল ফুচকা বানানো',
    zoneName: 'ফুচকা চত্বর',
    x: 0,
    z: -63.8,
    radius: 3.1,
    category: 'short',
    medium: 'physical',
    holdDurationSec: 3,
  },
  {
    id: 'task_saloon',
    kind: 'saloon_trim',
    title: 'হিরো চুল কাটা ও পারফিউম',
    banglaTitle: 'হিরো চুল কাটা',
    zoneName: 'হিরো সেলুন',
    x: -65.5,
    z: -26.0,
    radius: 3.1,
    category: 'long',
    medium: 'physical',
    holdDurationSec: 5,
  },
  {
    id: 'task_cricket',
    kind: 'cricket_tape',
    title: 'টেপ টেনিস বল তৈরি',
    banglaTitle: 'টেপ টেনিস বল রেডি',
    zoneName: 'ক্রিকেট মাঠ',
    x: 65.5,
    z: -26.0,
    radius: 3.2,
    category: 'short',
    medium: 'physical',
    holdDurationSec: 3,
  },
  {
    id: 'task_pharmacy',
    kind: 'pharmacy_mix',
    title: 'ওরাল স্যালাইন ও নাপা মিক্স',
    banglaTitle: 'ওরাল স্যালাইন ও নাপা',
    zoneName: 'দাদু ফার্মেসি',
    x: -65.5,
    z: 26.0,
    radius: 3.1,
    category: 'short',
    medium: 'physical',
    holdDurationSec: 4,
  },
  {
    id: 'task_pandal',
    kind: 'pandal_dj',
    title: 'বিয়ে বাড়ির ডিজে বাজানো',
    banglaTitle: 'বিয়ে বাড়ির ডিজে বাজাও',
    zoneName: 'বিয়ে বাড়ি প্যান্ডেল',
    x: 64.0,
    z: 26.0,
    radius: 3.2,
    category: 'long',
    medium: 'digital',
    holdDurationSec: 6,
    isVisual: true,
  },
  // Outer Para Houses & Rail Station Tasks
  {
    id: 'task_kaka_bari',
    kind: 'cha_mix',
    title: 'কাকার লাল চা বানানো',
    banglaTitle: 'কাকার লাল চা বানানো',
    zoneName: 'কাকার বাড়ি',
    x: -74.0,
    z: -86.5,
    radius: 3.0,
    category: 'short',
    medium: 'physical',
    holdDurationSec: 3,
  },
  {
    id: 'task_rail',
    kind: 'bazar_hisab',
    title: 'রেল টিকিট পাঞ্চ করা',
    banglaTitle: 'রেল টিকিট পাঞ্চ করা',
    zoneName: 'মোহল্লা রেল স্টেশন',
    x: -5.5,
    z: 74.0,
    radius: 3.1,
    category: 'short',
    medium: 'digital',
    holdDurationSec: 4,
  },
  // 11 New Expanded Outer Moholla & Opar Para Tasks
  {
    id: 'task_kacchi',
    kind: 'kacchi_cook',
    title: 'নবাবী কাচ্চি দম দেওয়া',
    banglaTitle: 'নবাবী কাচ্চি দম দেওয়া',
    zoneName: 'নবাব কাচ্চি ঘর',
    x: -136.0,
    z: -28.0,
    radius: 3.1,
    category: 'long',
    medium: 'physical',
    holdDurationSec: 5,
    isVisual: true,
  },
  {
    id: 'task_cyber',
    kind: 'cyber_pc',
    title: 'সাইবার পিসি ল্যাগ ফিক্স',
    banglaTitle: 'সাইবার পিসি ল্যাগ ফিক্স',
    zoneName: 'সাইবার গেমিং আড্ডা',
    x: -136.0,
    z: 28.0,
    radius: 3.1,
    category: 'short',
    medium: 'digital',
    holdDurationSec: 4,
  },
  {
    id: 'task_dorji',
    kind: 'dorji_stitch',
    title: 'ঈদ পাঞ্জাবি সেলাই',
    banglaTitle: 'ঈদ পাঞ্জাবি সেলাই',
    zoneName: 'শিল্পী দর্জি বাড়ি',
    x: 136.0,
    z: -28.0,
    radius: 3.1,
    category: 'short',
    medium: 'physical',
    holdDurationSec: 4,
  },
  {
    id: 'task_gym',
    kind: 'gym_lift',
    title: 'জিম বেঞ্চ প্রেস ওয়ার্কআউট',
    banglaTitle: 'জিম ডাম্বেল ওয়ার্কআউট',
    zoneName: 'টাইগার পাড়া জিম',
    x: 136.0,
    z: 28.0,
    radius: 3.1,
    category: 'long',
    medium: 'physical',
    holdDurationSec: 5,
    isVisual: true,
  },
  {
    id: 'task_coaching',
    kind: 'book_sort',
    title: 'কোচিং খাতা ও বই সাজানো',
    banglaTitle: 'কোচিং খাতা ও বই সাজানো',
    zoneName: 'জিপিএ-৫ কোচিং',
    x: 28.0,
    z: -133.5,
    radius: 3.1,
    category: 'short',
    medium: 'physical',
    holdDurationSec: 4,
  },
  {
    id: 'task_signal',
    kind: 'rail_signal',
    title: 'রেল সিগন্যাল সবুজ করা',
    banglaTitle: 'রেল সিগন্যাল গ্রিন করা',
    zoneName: 'সিগন্যাল টাওয়ার',
    x: 26.5,
    z: 128.0,
    radius: 3.2,
    category: 'long',
    medium: 'digital',
    holdDurationSec: 5,
    isVisual: true,
  },
  {
    id: 'task_jheel',
    kind: 'pukur_check',
    title: 'ঝিলের পানি পরীক্ষা',
    banglaTitle: 'ঝিলের পানি পরীক্ষা',
    zoneName: 'ঝিল পাড় লেক',
    x: -127.5,
    z: -82.0,
    radius: 3.1,
    category: 'common',
    medium: 'physical',
    holdDurationSec: 4,
  },
  {
    id: 'task_park',
    kind: 'gym_lift',
    title: 'পার্কের নাগরদোলা চেক',
    banglaTitle: 'পার্কের নাগরদোলা চেক',
    zoneName: 'শিশু পার্ক ও নাগরদোলা',
    x: 133.0,
    z: -82.0,
    radius: 3.2,
    category: 'short',
    medium: 'physical',
    holdDurationSec: 3,
  },
  {
    id: 'task_cinema',
    kind: 'dish_tune',
    title: 'সিনেমা প্রজেক্টর সেট',
    banglaTitle: 'সিনেমা প্রজেক্টর সেট',
    zoneName: 'বলাকা সিনেমা হল',
    x: -69.0,
    z: -133.5,
    radius: 3.1,
    category: 'short',
    medium: 'digital',
    holdDurationSec: 4,
  },
  {
    id: 'task_mach',
    kind: 'bazar_hisab',
    title: 'ইলিশ মাছের ওজন হিসাব',
    banglaTitle: 'ইলিশ মাছের ওজন হিসাব',
    zoneName: 'ওপার মাছ বাজার',
    x: -69.0,
    z: 128.0,
    radius: 3.2,
    category: 'common',
    medium: 'digital',
    holdDurationSec: 3,
  },
  {
    id: 'task_nana',
    kind: 'kacchi_cook',
    title: 'নানার তেহারি গরম করা',
    banglaTitle: 'নানার তেহারি গরম করা',
    zoneName: 'নানার বাড়ি',
    x: -136.5,
    z: -133.5,
    radius: 3.0,
    category: 'short',
    medium: 'physical',
    holdDurationSec: 4,
  },
  // 7 Additional Outer & Residential Moholla Tasks so tasks spread across ALL zones
  {
    id: 'task_master',
    kind: 'book_sort',
    title: 'মাস্টারের খাতা গোছানো',
    banglaTitle: 'মাস্টারের খাতা গোছানো',
    zoneName: 'মাস্টার বাড়ি',
    x: -30.5,
    z: -89.5,
    radius: 3.0,
    category: 'short',
    medium: 'physical',
    holdDurationSec: 4,
  },
  {
    id: 'task_chacha',
    kind: 'cha_mix',
    title: 'চাচার বাড়ির রঙ-চা বানানো',
    banglaTitle: 'চাচার রঙ-চা বানানো',
    zoneName: 'চাচার বাড়ি',
    x: 30.0,
    z: -88.5,
    radius: 3.0,
    category: 'common',
    medium: 'physical',
    holdDurationSec: 4,
  },
  {
    id: 'task_khala',
    kind: 'kacchi_cook',
    title: 'খালার পোলাও রান্না দেখা',
    banglaTitle: 'খালার পোলাও চেক',
    zoneName: 'খালার বাড়ি',
    x: 72.0,
    z: -89.0,
    radius: 3.0,
    category: 'long',
    medium: 'physical',
    holdDurationSec: 5,
  },
  {
    id: 'task_bhai_duplex',
    kind: 'cyber_pc',
    title: 'বড় ভাই ডুপ্লেক্স সার্ভার সেট',
    banglaTitle: 'ডুপ্লেক্স সার্ভার সেট',
    zoneName: 'বড় ভাই ডুপ্লেক্স',
    x: -26.5,
    z: -135.0,
    radius: 3.1,
    category: 'long',
    medium: 'digital',
    holdDurationSec: 5,
    isVisual: true,
  },
  {
    id: 'task_khalu',
    kind: 'dish_tune',
    title: 'খালুর টিভি ডিশ সেট করা',
    banglaTitle: 'খালুর ডিশ টিউনিং',
    zoneName: 'খালুর বাড়ি',
    x: 67.5,
    z: -134.5,
    radius: 3.0,
    category: 'short',
    medium: 'digital',
    holdDurationSec: 4,
  },
  {
    id: 'task_rail_colony',
    kind: 'fuse_fix',
    title: 'রেল কলোনির মিটার বক্স ঠিক',
    banglaTitle: 'কলোনি মিটার বক্স ঠিক',
    zoneName: 'রেল কলোনি কোয়ার্টার',
    x: -26.5,
    z: 128.0,
    radius: 3.1,
    category: 'short',
    medium: 'digital',
    holdDurationSec: 4,
  },
  {
    id: 'task_fufu',
    kind: 'dorji_stitch',
    title: 'ফুফুর শাড়ি ভাঁজ ও সেলাই',
    banglaTitle: 'ফুফুর শাড়ি সেলাই',
    zoneName: 'ফুফুর বাড়ি',
    x: 67.5,
    z: 128.0,
    radius: 3.0,
    category: 'long',
    medium: 'physical',
    holdDurationSec: 5,
  },
];

// Official Utility Stations: Security Cams, Admin Radar Table, Vitals ECG Monitor
export const SECURITY_CAMS_POS = { x: 35.0, z: 38.0, radius: 2.8, label: 'নিরাপত্তা সিসিটিভি [E]' };
export const ADMIN_TABLE_POS = { x: 36.5, z: -6.5, radius: 2.8, label: 'অ্যাডমিন পাড়া ম্যাপ [E]' };
export const VITALS_POS = { x: -36.5, z: 6.5, radius: 2.8, label: 'পাড়া ভাইটালস ইসিজি [E]' };

export const SECURITY_CAMERAS: SecurityCamDef[] = [
  {
    id: 'cam_adda',
    label: 'ক্যামেরা ০১ · আড্ডা চক',
    zoneId: 'adda_chowk',
    camX: -9.2,
    camZ: -9.2,
    viewCenterX: 0,
    viewCenterZ: 0,
    viewRadius: 13.5,
  },
  {
    id: 'cam_cha',
    label: 'ক্যামেরা ০২ · চায়ের দোকান ও গলি',
    zoneId: 'cha_dokan',
    camX: -20.5,
    camZ: -20.5,
    viewCenterX: -29,
    viewCenterZ: -24,
    viewRadius: 13.0,
  },
  {
    id: 'cam_rickshaw',
    label: 'ক্যামেরা ০৩ · রিকশা গলি',
    zoneId: 'rickshaw_garage',
    camX: 20.5,
    camZ: -20.5,
    viewCenterX: 29,
    viewCenterZ: -24,
    viewRadius: 13.0,
  },
  {
    id: 'cam_desco',
    label: 'ক্যামেরা ০৪ · ডেসকো গেট',
    zoneId: 'desco_power',
    camX: -20.5,
    camZ: 20.5,
    viewCenterX: -29,
    viewCenterZ: 24,
    viewRadius: 13.0,
  },
  {
    id: 'cam_dish',
    label: 'ক্যামেরা ০৫ · ডিশ অফিস রোড',
    zoneId: 'dish_roof',
    camX: 20.5,
    camZ: 20.5,
    viewCenterX: 29,
    viewCenterZ: 24,
    viewRadius: 13.0,
  },
  {
    id: 'cam_bazar',
    label: 'ক্যামেরা ০৬ · বাজার মোড়',
    zoneId: 'bazar_stall',
    camX: 24.0,
    camZ: -6.0,
    viewCenterX: 35,
    viewCenterZ: 0,
    viewRadius: 13.0,
  },
  {
    id: 'cam_fuchka',
    label: 'ক্যামেরা ০৭ · উত্তর পাড়া ও ফুচকা চত্বর',
    zoneId: 'fuchka_corner',
    camX: 11.5,
    camZ: -55.0,
    viewCenterX: 0,
    viewCenterZ: -70,
    viewRadius: 16.0,
  },
  {
    id: 'cam_south_rail',
    label: 'ক্যামেরা ০৮ · মোহল্লা রেল স্টেশন',
    zoneId: 'rail_station',
    camX: -12.5,
    camZ: 66.0,
    viewCenterX: 0,
    viewCenterZ: 82,
    viewRadius: 18.0,
  },
  {
    id: 'cam_north_colony',
    label: 'ক্যামেরা ০৯ · উত্তর কলোনি বাইপাস',
    zoneId: 'coaching_center',
    camX: 0,
    camZ: -112.0,
    viewCenterX: 0,
    viewCenterZ: -128,
    viewRadius: 20.0,
  },
  {
    id: 'cam_jheel_west',
    label: 'ক্যামেরা ১০ · ঝিল পাড় প্রমেনেড',
    zoneId: 'jheel_par',
    camX: -115.0,
    camZ: -68.0,
    viewCenterX: -128,
    viewCenterZ: -80,
    viewRadius: 18.0,
  },
  {
    id: 'cam_west_plaza',
    label: 'ক্যামেরা ১১ · কাচ্চি ও সাইবার রোড',
    zoneId: 'kacchi_house',
    camX: -115.0,
    camZ: 0.0,
    viewCenterX: -128,
    viewCenterZ: 0,
    viewRadius: 20.0,
  },
  {
    id: 'cam_east_plaza',
    label: 'ক্যামেরা ১২ · দর্জি ও টাইগার জিম',
    zoneId: 'dorji_bari',
    camX: 115.0,
    camZ: 0.0,
    viewCenterX: 128,
    viewCenterZ: 0,
    viewRadius: 20.0,
  },
  {
    id: 'cam_south_west',
    label: 'ক্যামেরা ১৩ · ওপার মাছ বাজার',
    zoneId: 'mach_bazar',
    camX: -52.0,
    camZ: 112.0,
    viewCenterX: -62,
    viewCenterZ: 126,
    viewRadius: 18.0,
  },
  {
    id: 'cam_south_east',
    label: 'ক্যামেরা ১৪ · সিগন্যাল টাওয়ার ও ফুফু বাড়ি',
    zoneId: 'signal_yard',
    camX: 52.0,
    camZ: 112.0,
    viewCenterX: 60,
    viewCenterZ: 126,
    viewRadius: 18.0,
  },
];

export const VENTS: VentNode[] = [
  {
    id: 'vent_cha',
    label: 'চা দোকানের ড্রেন',
    x: -28.0,
    z: -38.5,
    targetIds: ['vent_pukur', 'vent_eidgah', 'vent_saloon', 'vent_rickshaw', 'vent_north_para'],
  },
  {
    id: 'vent_rickshaw',
    label: 'গ্যারেজ ম্যানহোল',
    x: 28.0,
    z: -38.5,
    targetIds: ['vent_cha', 'vent_eidgah', 'vent_bazar', 'vent_cricket', 'vent_north_para'],
  },
  {
    id: 'vent_desco',
    label: 'ডেসকো ড্রেন',
    x: -28.0,
    z: 38.5,
    targetIds: ['vent_pukur', 'vent_wasa', 'vent_pharmacy', 'vent_rail'],
  },
  {
    id: 'vent_dish',
    label: 'ডিশ কালভার্ট',
    x: 28.0,
    z: 38.5,
    targetIds: ['vent_bazar', 'vent_wasa', 'vent_pandal', 'vent_rail'],
  },
  {
    id: 'vent_pukur',
    label: 'ঘাটের পাইপ',
    x: -33.0,
    z: -7.5,
    targetIds: ['vent_cha', 'vent_desco', 'vent_saloon'],
  },
  {
    id: 'vent_bazar',
    label: 'বাজার গলির ড্রেন',
    x: 33.0,
    z: 7.5,
    targetIds: ['vent_rickshaw', 'vent_dish', 'vent_pandal'],
  },
  {
    id: 'vent_eidgah',
    label: 'ঈদগাহ উত্তর ড্রেন',
    x: -10.5,
    z: -39.0,
    targetIds: ['vent_cha', 'vent_rickshaw', 'vent_fuchka'],
  },
  {
    id: 'vent_wasa',
    label: 'ওয়াসা দক্ষিণ ড্রেন',
    x: 10.5,
    z: 39.0,
    targetIds: ['vent_desco', 'vent_dish', 'vent_pharmacy', 'vent_pandal', 'vent_rail'],
  },
  // Mid & Outer Sector Drains
  {
    id: 'vent_fuchka',
    label: 'ফুচকা চত্বর ড্রেন',
    x: 9.0,
    z: -62.5,
    targetIds: ['vent_eidgah', 'vent_saloon', 'vent_cricket', 'vent_north_para', 'vent_coaching'],
  },
  {
    id: 'vent_saloon',
    label: 'সেলুন ড্রেন',
    x: -60.5,
    z: -32.5,
    targetIds: ['vent_fuchka', 'vent_cha', 'vent_pukur', 'vent_pharmacy', 'vent_kacchi'],
  },
  {
    id: 'vent_cricket',
    label: 'ক্রিকেট মাঠ কালভার্ট',
    x: 60.5,
    z: -32.5,
    targetIds: ['vent_fuchka', 'vent_rickshaw', 'vent_pandal', 'vent_dorji'],
  },
  {
    id: 'vent_pharmacy',
    label: 'ফার্মেসি ড্রেন',
    x: -60.5,
    z: 32.5,
    targetIds: ['vent_saloon', 'vent_desco', 'vent_wasa', 'vent_cyber'],
  },
  {
    id: 'vent_pandal',
    label: 'প্যান্ডেল সুয়ারেজ',
    x: 60.5,
    z: 32.5,
    targetIds: ['vent_cricket', 'vent_dish', 'vent_bazar', 'vent_wasa', 'vent_gym'],
  },
  {
    id: 'vent_north_para',
    label: 'উত্তর পাড়া কালভার্ট',
    x: -14.0,
    z: -86.0,
    targetIds: ['vent_fuchka', 'vent_cha', 'vent_rickshaw', 'vent_nana', 'vent_coaching'],
  },
  {
    id: 'vent_rail',
    label: 'রেল স্টেশন কালভার্ট',
    x: -20.0,
    z: 74.5,
    targetIds: ['vent_wasa', 'vent_desco', 'vent_dish', 'vent_colony', 'vent_mach'],
  },
  // 8 New Far-Moholla & South Colony Vents (100% Symmetric Bidirectional Graph)
  {
    id: 'vent_nana',
    label: 'নানার উঠোন ড্রেন',
    x: -124.0,
    z: -122.0,
    targetIds: ['vent_north_para', 'vent_kacchi', 'vent_coaching'],
  },
  {
    id: 'vent_coaching',
    label: 'কোচিং বাইপাস ড্রেন',
    x: 12.0,
    z: -122.0,
    targetIds: ['vent_fuchka', 'vent_north_para', 'vent_nana', 'vent_dorji'],
  },
  {
    id: 'vent_kacchi',
    label: 'কাচ্চি কিচেন ড্রেন',
    x: -124.0,
    z: -35.0,
    targetIds: ['vent_nana', 'vent_saloon', 'vent_cyber'],
  },
  {
    id: 'vent_cyber',
    label: 'সাইবার গলি ম্যানহোল',
    x: -124.0,
    z: 35.0,
    targetIds: ['vent_kacchi', 'vent_pharmacy', 'vent_mach'],
  },
  {
    id: 'vent_dorji',
    label: 'দর্জি গলির ড্রেন',
    x: 124.0,
    z: -35.0,
    targetIds: ['vent_coaching', 'vent_cricket', 'vent_gym'],
  },
  {
    id: 'vent_gym',
    label: 'টাইগার জিম কালভার্ট',
    x: 124.0,
    z: 35.0,
    targetIds: ['vent_dorji', 'vent_pandal', 'vent_colony'],
  },
  {
    id: 'vent_mach',
    label: 'মাছ বাজার ড্রেন',
    x: -82.0,
    z: 124.0,
    targetIds: ['vent_cyber', 'vent_rail', 'vent_colony'],
  },
  {
    id: 'vent_colony',
    label: 'রেল কলোনি ম্যানহোল',
    x: -12.0,
    z: 124.0,
    targetIds: ['vent_rail', 'vent_mach', 'vent_gym'],
  },
];

export const EMERGENCY_BELL_POS = { x: 0, z: 0, interactRadius: 4.8 };

export const GAS_LEAK_VALVES: Array<Omit<GasValveState, 'holderId'>> = [
  {
    id: 'valve_cha',
    label: 'চায়ের দোকান গ্যাস ভালভ',
    zoneName: 'চায়ের দোকান',
    x: -29.0,
    z: -32.0,
  },
  {
    id: 'valve_rickshaw',
    label: 'রিকশা গ্যারেজ গ্যাস ভালভ',
    zoneName: 'রিকশা গ্যারেজ',
    x: 38.0,
    z: -29.5,
  },
];

export const SABOTAGE_TARGETS: Record<
  SabotageType,
  {
    x: number;
    z: number;
    label: string;
    banglaLabel: string;
    severity: SabotageSeverity;
    durationSec: number;
  }
> = {
  loadshedding: {
    x: -31.2,
    z: 32.5,
    label: 'ডেসকো মেইন সুইচ',
    banglaLabel: 'লোডশেডিং মেইন সুইচ',
    severity: 'non_critical',
    durationSec: 90,
  },
  wifi_down: {
    x: 34.5,
    z: 29.0,
    label: 'ডিশ রাউটার রিসেট',
    banglaLabel: 'ওয়াইফাই রাউটার রিসেট',
    severity: 'non_critical',
    durationSec: 90,
  },
  gas_leak: {
    x: -29.0,
    z: -32.0,
    label: 'গ্যাস পাইপ ভালভ (চা + গ্যারেজ)',
    banglaLabel: 'গ্যাস পাইপ ফেটে গেছে!',
    severity: 'critical',
    durationSec: 75,
  },
};

export const SPAWN_RING: Array<{ x: number; z: number; yaw: number }> = Array.from(
  { length: 20 },
  (_, idx) => {
    const theta = (idx * Math.PI * 2) / 20;
    const radius = 5.8;
    const x = Number((Math.sin(theta) * radius).toFixed(2));
    const z = Number((Math.cos(theta) * radius).toFixed(2));
    const yaw = Number(Math.atan2(-x, -z).toFixed(3));
    return { x, z, yaw };
  },
);

export const BOT_WAYPOINTS: Array<{ x: number; z: number }> = [
  { x: 0, z: 7.2 },
  { x: 7.5, z: 0 },
  { x: 0, z: -7.5 },
  { x: -7.5, z: 0 },
  { x: 0, z: -26.0 },
  { x: 0, z: -37.0 },
  { x: 0, z: 26.0 },
  { x: 0, z: 32.5 },
  { x: -31.0, z: -15.0 },
  { x: -35.5, z: -32.2 },
  { x: 31.0, z: -15.0 },
  { x: 32.5, z: -29.5 },
  { x: -31.0, z: 15.0 },
  { x: -31.2, z: 32.5 },
  { x: 31.0, z: 15.0 },
  { x: 34.5, z: 29.0 },
  { x: -37.5, z: 0 },
  { x: 38.5, z: 0 },
  // Outer Boulevard, 4 Residential Para Houses & Rail Station
  { x: 0, z: -52.0 },
  { x: 0, z: -63.5 },
  { x: -52.0, z: -26.0 },
  { x: -64.5, z: -26.0 },
  { x: 52.0, z: -26.0 },
  { x: 64.5, z: -26.0 },
  { x: -52.0, z: 26.0 },
  { x: -64.5, z: 26.0 },
  { x: 52.0, z: 26.0 },
  { x: 64.0, z: 26.0 },
  { x: -52.0, z: 0 },
  { x: 52.0, z: 0 },
  { x: 0, z: 52.0 },
  { x: -5.5, z: 74.0 },
  { x: 0, z: 74.0 },
  { x: -74.0, z: -72.0 },
  { x: -74.0, z: -86.5 },
  { x: -32.0, z: -72.0 },
  { x: -32.0, z: -86.5 },
  { x: 32.0, z: -72.0 },
  { x: 32.0, z: -86.5 },
  { x: 74.0, z: -72.0 },
  { x: 74.0, z: -86.5 },
  { x: -86.0, z: 0 },
  { x: 86.0, z: 0 },
  { x: -52.0, z: 96.0 },
  { x: 0, z: 96.0 },
  { x: 52.0, z: 96.0 },
  // Expanded 320m Far-Moholla Boulevards, Crossings & House/Shop Entrances
  { x: -118.0, z: -114.0 },
  { x: -86.0, z: -114.0 },
  { x: -52.0, z: -114.0 },
  { x: -28.0, z: -114.0 },
  { x: 0, z: -114.0 },
  { x: 28.0, z: -114.0 },
  { x: 52.0, z: -114.0 },
  { x: 86.0, z: -114.0 },
  { x: 118.0, z: -114.0 },
  { x: -138.0, z: -114.0 },
  { x: -138.0, z: -124.0 },
  { x: -136.5, z: -133.5 },
  { x: -69.0, z: -114.0 },
  { x: -69.0, z: -124.0 },
  { x: -69.0, z: -133.5 },
  { x: -28.0, z: -124.0 },
  { x: -28.0, z: -133.5 },
  { x: 28.0, z: -124.0 },
  { x: 28.0, z: -133.5 },
  { x: 69.0, z: -114.0 },
  { x: 69.0, z: -124.0 },
  { x: 69.0, z: -133.5 },
  { x: -118.0, z: -82.0 },
  { x: -127.5, z: -82.0 },
  { x: 118.0, z: -82.0 },
  { x: 133.0, z: -82.0 },
  { x: -118.0, z: -52.0 },
  { x: -118.0, z: -28.0 },
  { x: -127.0, z: -28.0 },
  { x: -136.0, z: -28.0 },
  { x: -118.0, z: 0 },
  { x: -118.0, z: 28.0 },
  { x: -127.0, z: 28.0 },
  { x: -136.0, z: 28.0 },
  { x: -118.0, z: 52.0 },
  { x: 118.0, z: -52.0 },
  { x: 118.0, z: -28.0 },
  { x: 127.0, z: -28.0 },
  { x: 136.0, z: -28.0 },
  { x: 118.0, z: 0 },
  { x: 118.0, z: 28.0 },
  { x: 127.0, z: 28.0 },
  { x: 136.0, z: 28.0 },
  { x: 118.0, z: 52.0 },
  { x: -118.0, z: 72.0 },
  { x: -118.0, z: 96.0 },
  { x: -118.0, z: 112.0 },
  { x: -86.0, z: 112.0 },
  { x: -69.0, z: 112.0 },
  { x: -69.0, z: 128.0 },
  { x: -52.0, z: 112.0 },
  { x: -28.0, z: 112.0 },
  { x: -28.0, z: 126.5 },
  { x: 0, z: 112.0 },
  { x: 26.5, z: 112.0 },
  { x: 26.5, z: 128.0 },
  { x: 52.0, z: 112.0 },
  { x: 69.0, z: 112.0 },
  { x: 69.0, z: 126.5 },
  { x: 86.0, z: 112.0 },
  { x: 118.0, z: 72.0 },
  { x: 118.0, z: 96.0 },
  { x: 118.0, z: 112.0 },
  { x: -52.0, z: 144.0 },
  { x: 0, z: 144.0 },
  { x: 52.0, z: 144.0 },
  // 7 Additional Task Station Interior Anchors
  { x: -30.5, z: -89.5 },
  { x: 30.0, z: -88.5 },
  { x: 72.0, z: -89.0 },
  { x: -26.5, z: -135.0 },
  { x: 67.5, z: -134.5 },
  { x: -26.5, z: 128.0 },
  { x: 67.5, z: 128.0 },
];

export function resolveCircleWallCollision(
  x: number,
  z: number,
  radius: number = PLAYER_RADIUS,
  walls: WallAABB[] = WALLS,
  doorLocks?: DoorLockState,
): { x: number; z: number } {
  let nx = Math.max(-MAP_HALF_SIZE + radius, Math.min(MAP_HALF_SIZE - radius, x));
  let nz = Math.max(-MAP_HALF_SIZE + radius, Math.min(MAP_HALF_SIZE - radius, z));

  const rSq = radius * radius;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      if (nx + radius <= w.minX || nx - radius >= w.maxX || nz + radius <= w.minZ || nz - radius >= w.maxZ) {
        continue;
      }
      const closestX = Math.max(w.minX, Math.min(w.maxX, nx));
      const closestZ = Math.max(w.minZ, Math.min(w.maxZ, nz));
      const dx = nx - closestX;
      const dz = nz - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < rSq) {
        if (distSq > 1e-8) {
          const dist = Math.sqrt(distSq);
          const push = radius - dist;
          nx += (dx / dist) * push;
          nz += (dz / dist) * push;
        } else {
          const penLeft = nx - w.minX;
          const penRight = w.maxX - nx;
          const penTop = nz - w.minZ;
          const penBottom = w.maxZ - nz;
          const minPen = Math.min(penLeft, penRight, penTop, penBottom);
          if (minPen === penLeft) nx = w.minX - radius;
          else if (minPen === penRight) nx = w.maxX + radius;
          else if (minPen === penTop) nz = w.minZ - radius;
          else nz = w.maxZ + radius;
        }
      }
    }
    if (doorLocks) {
      for (let i = 0; i < DOORS.length; i++) {
        const w = DOORS[i];
        if (doorLocks[w.zoneId] <= 0) continue;
        if (nx + radius <= w.minX || nx - radius >= w.maxX || nz + radius <= w.minZ || nz - radius >= w.maxZ) {
          continue;
        }
        const closestX = Math.max(w.minX, Math.min(w.maxX, nx));
        const closestZ = Math.max(w.minZ, Math.min(w.maxZ, nz));
        const dx = nx - closestX;
        const dz = nz - closestZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < rSq) {
          if (distSq > 1e-8) {
            const dist = Math.sqrt(distSq);
            const push = radius - dist;
            nx += (dx / dist) * push;
            nz += (dz / dist) * push;
          } else {
            const penLeft = nx - w.minX;
            const penRight = w.maxX - nx;
            const penTop = nz - w.minZ;
            const penBottom = w.maxZ - nz;
            const minPen = Math.min(penLeft, penRight, penTop, penBottom);
            if (minPen === penLeft) nx = w.minX - radius;
            else if (minPen === penRight) nx = w.maxX + radius;
            else if (minPen === penTop) nz = w.minZ - radius;
            else nz = w.maxZ + radius;
          }
        }
      }
    }
  }

  return { x: nx, z: nz };
}

function getRampHeightAt(r: StairRampDef, x: number, z: number): number {
  const coord = r.axis === 'x' ? x : z;
  const span = r.topCoord - r.bottomCoord;
  if (Math.abs(span) < 1e-5) return r.topY;
  const t = Math.max(0, Math.min(1, (coord - r.bottomCoord) / span));
  return t * r.topY;
}

export function getWalkableFloorY(x: number, z: number, currentY = 0): number {
  // Check roof decks first when already high up so transitions onto/off decks never flicker
  if (currentY >= 1.75) {
    for (let i = 0; i < ROOFTOPS.length; i++) {
      const d = ROOFTOPS[i];
      if (x >= d.minX - 0.3 && x <= d.maxX + 0.3 && z >= d.minZ - 0.3 && z <= d.maxZ + 0.3) {
        if (Math.abs(d.elevationY - currentY) <= 1.65) {
          return d.elevationY;
        }
      }
    }
  }
  for (let i = 0; i < STAIR_RAMPS.length; i++) {
    const r = STAIR_RAMPS[i];
    if (x >= r.minX - 0.25 && x <= r.maxX + 0.25 && z >= r.minZ - 0.25 && z <= r.maxZ + 0.25) {
      const rampY = getRampHeightAt(r, x, z);
      if (Math.abs(rampY - currentY) <= 1.55) {
        return rampY;
      }
    }
  }
  if (currentY >= 1.55) {
    for (let i = 0; i < ROOFTOPS.length; i++) {
      const d = ROOFTOPS[i];
      if (x >= d.minX - 0.3 && x <= d.maxX + 0.3 && z >= d.minZ - 0.3 && z <= d.maxZ + 0.3) {
        if (Math.abs(d.elevationY - currentY) <= 1.65) {
          return d.elevationY;
        }
      }
    }
  }
  return 0;
}

export function resolvePlayerMoveWithElevation(
  prevX: number,
  prevZ: number,
  prevY: number,
  targetX: number,
  targetZ: number,
  radius: number = PLAYER_RADIUS,
  walls: WallAABB[] = WALLS,
  doorLocks?: DoorLockState,
): { x: number; z: number; y: number } {
  const safePrevY = Math.max(0, prevY);
  let nx = Math.max(-MAP_HALF_SIZE + radius, Math.min(MAP_HALF_SIZE - radius, targetX));
  let nz = Math.max(-MAP_HALF_SIZE + radius, Math.min(MAP_HALF_SIZE - radius, targetZ));

  // Detect active rooftop deck and/or exterior staircase for seamless climb & parapet containment
  const activeDeck =
    safePrevY >= 1.9
      ? ROOFTOPS.find(
          (d) =>
            prevX >= d.minX - 0.35 &&
            prevX <= d.maxX + 0.35 &&
            prevZ >= d.minZ - 0.35 &&
            prevZ <= d.maxZ + 0.35 &&
            Math.abs(d.elevationY - safePrevY) <= 1.4,
        )
      : undefined;

  const activeStair = STAIR_RAMPS.find((r) => {
    if (
      prevX < r.minX - 0.25 ||
      prevX > r.maxX + 0.25 ||
      prevZ < r.minZ - 0.25 ||
      prevZ > r.maxZ + 0.25
    ) {
      return false;
    }
    const ry = getRampHeightAt(r, prevX, prevZ);
    return Math.abs(ry - safePrevY) <= 1.55;
  });

  if (safePrevY >= 2.0 && activeDeck) {
    const steppingThroughOpening = activeDeck.stairOpenings.some(
      (op) =>
        nx >= op.minX - 0.45 &&
        nx <= op.maxX + 0.45 &&
        nz >= op.minZ - 0.45 &&
        nz <= op.maxZ + 0.45,
    );
    if (!steppingThroughOpening && !activeStair) {
      nx = Math.max(activeDeck.minX + radius, Math.min(activeDeck.maxX - radius, nx));
      nz = Math.max(activeDeck.minZ + radius, Math.min(activeDeck.maxZ - radius, nz));
    }
  }

  if (activeStair) {
    const rampY = getRampHeightAt(activeStair, prevX, prevZ);
    const linkedDeck = ROOFTOPS.find((d) => d.id === activeStair.roofId);
    const nearTopLanding = linkedDeck ? rampY >= linkedDeck.elevationY - 0.72 : rampY >= activeStair.topY - 0.72;
    const insideLinkedDeck = Boolean(
      linkedDeck &&
        nx >= linkedDeck.minX - 0.25 &&
        nx <= linkedDeck.maxX + 0.25 &&
        nz >= linkedDeck.minZ - 0.25 &&
        nz <= linkedDeck.maxZ + 0.25,
    );
    if (rampY >= 0.65 && !insideLinkedDeck) {
      if (nearTopLanding && linkedDeck) {
        // On upper landing: keep inside union of stair and roof opening so stepping onto the Chhad is effortless
        const unionMinX = Math.min(activeStair.minX + 0.28, linkedDeck.minX + radius);
        const unionMaxX = Math.max(activeStair.maxX - 0.28, linkedDeck.maxX - radius);
        const unionMinZ = Math.min(activeStair.minZ + 0.28, linkedDeck.minZ + radius);
        const unionMaxZ = Math.max(activeStair.maxZ - 0.28, linkedDeck.maxZ - radius);
        nx = Math.max(unionMinX, Math.min(unionMaxX, nx));
        nz = Math.max(unionMinZ, Math.min(unionMaxZ, nz));
      } else {
        // Mid-flight: keep safely inside stair side rails
        if (activeStair.axis === 'z') {
          nx = Math.max(activeStair.minX + 0.35, Math.min(activeStair.maxX - 0.35, nx));
        } else {
          nz = Math.max(activeStair.minZ + 0.35, Math.min(activeStair.maxZ - 0.35, nz));
        }
      }
    }
  }

  // While on upper stairs or rooftop, ignore ground-level interior/building walls (keep only map compound outer boundaries)
  let effectiveWalls =
    safePrevY >= 1.75
      ? walls.filter((w) => w.id === 'outer_n' || w.id === 'outer_s' || w.id === 'outer_w' || w.id === 'outer_e')
      : walls;

  // On ground floor, prevent clipping sideways into the tall concrete back/under-side of exterior stairs
  if (safePrevY < 1.1) {
    const stairAbutments: WallAABB[] = [];
    for (let i = 0; i < STAIR_RAMPS.length; i++) {
      const r = STAIR_RAMPS[i];
      if (activeStair && activeStair.id === r.id) continue;
      // Block only the high elevated half (rampY > 1.35) so bottom steps stay 100% open to enter
      const highStart = r.bottomCoord + (r.topCoord - r.bottomCoord) * 0.45;
      if (r.axis === 'z') {
        const zLo = r.topCoord < r.bottomCoord ? r.minZ : Math.min(highStart, r.maxZ);
        const zHi = r.topCoord < r.bottomCoord ? Math.max(highStart, r.minZ) : r.maxZ;
        if (zHi - zLo > 0.4) {
          stairAbutments.push({
            id: `abut_${r.id}`,
            minX: r.minX + 0.05,
            maxX: r.maxX - 0.05,
            minZ: zLo,
            maxZ: zHi,
            height: r.topY,
          });
        }
      } else {
        const xLo = r.topCoord < r.bottomCoord ? r.minX : Math.min(highStart, r.maxX);
        const xHi = r.topCoord < r.bottomCoord ? Math.max(highStart, r.minX) : r.maxX;
        if (xHi - xLo > 0.4) {
          stairAbutments.push({
            id: `abut_${r.id}`,
            minX: xLo,
            maxX: xHi,
            minZ: r.minZ + 0.05,
            maxZ: r.maxZ - 0.05,
            height: r.topY,
          });
        }
      }
    }
    if (stairAbutments.length > 0) {
      effectiveWalls = [...effectiveWalls, ...stairAbutments];
    }
  }

  const activeDoors = safePrevY >= 2.0 ? undefined : doorLocks;
  const res = resolveCircleWallCollision(nx, nz, radius, effectiveWalls, activeDoors);
  const nextY = getWalkableFloorY(res.x, res.z, safePrevY);
  return { x: res.x, z: res.z, y: nextY };
}

export function distance2D(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

export function getZoneNameAt(x: number, z: number): string {
  for (const zone of ZONES) {
    const hw = zone.width / 2;
    const hd = zone.depth / 2;
    if (x >= zone.x - hw && x <= zone.x + hw && z >= zone.z - hd && z <= zone.z + hd) {
      return zone.name;
    }
  }
  return 'Moholla Boulevard';
}

export function getBanglaZoneNameAt(x: number, z: number): string {
  for (const zone of ZONES) {
    const hw = zone.width / 2;
    const hd = zone.depth / 2;
    if (x >= zone.x - hw && x <= zone.x + hw && z >= zone.z - hd && z <= zone.z + hd) {
      return zone.banglaName;
    }
  }
  return 'মহল্লা বড় রাস্তা';
}

export function getZoneIdAt(x: number, z: number): string | null {
  for (const zone of ZONES) {
    const hw = zone.width / 2;
    const hd = zone.depth / 2;
    if (x >= zone.x - hw && x <= zone.x + hw && z >= zone.z - hd && z <= zone.z + hd) {
      return zone.id;
    }
  }
  return null;
}

function segmentIntersectsAABB(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dz = bz - az;

  // Slab X min
  if (Math.abs(dx) < 1e-8) {
    if (ax - minX < 0 || maxX - ax < 0) return false;
  } else {
    const invDx = 1 / dx;
    let r = (minX - ax) * invDx;
    let r2 = (maxX - ax) * invDx;
    if (r > r2) {
      const tmp = r;
      r = r2;
      r2 = tmp;
    }
    if (r > t0) t0 = r;
    if (r2 < t1) t1 = r2;
    if (t0 > t1) return false;
  }

  // Slab Z
  if (Math.abs(dz) < 1e-8) {
    if (az - minZ < 0 || maxZ - az < 0) return false;
  } else {
    const invDz = 1 / dz;
    let r = (minZ - az) * invDz;
    let r2 = (maxZ - az) * invDz;
    if (r > r2) {
      const tmp = r;
      r = r2;
      r2 = tmp;
    }
    if (r > t0) t0 = r;
    if (r2 < t1) t1 = r2;
    if (t0 > t1) return false;
  }

  return t0 <= t1;
}

/**
 * Returns true if there is an unobstructed line of sight between (ax, az) and (bx, bz)
 * past tall walls (>= 1.8m) and currently locked doors.
 */
export function hasLineOfSight(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  walls: WallAABB[] = WALLS,
  doorLocks?: DoorLockState,
): boolean {
  const segMinX = ax < bx ? ax : bx;
  const segMaxX = ax > bx ? ax : bx;
  const segMinZ = az < bz ? az : bz;
  const segMaxZ = az > bz ? az : bz;
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    if (w.height < 1.8) continue;
    if (w.maxX < segMinX || w.minX > segMaxX || w.maxZ < segMinZ || w.minZ > segMaxZ) continue;
    if (segmentIntersectsAABB(ax, az, bx, bz, w.minX, w.maxX, w.minZ, w.maxZ)) {
      return false;
    }
  }
  if (doorLocks) {
    for (let i = 0; i < DOORS.length; i++) {
      const d = DOORS[i];
      if (doorLocks[d.zoneId] <= 0) continue;
      if (d.maxX < segMinX || d.minX > segMaxX || d.maxZ < segMinZ || d.minZ > segMaxZ) continue;
      if (segmentIntersectsAABB(ax, az, bx, bz, d.minX, d.maxX, d.minZ, d.maxZ)) {
        return false;
      }
    }
  }
  return true;
}

export const VEHICLE_SPECS: Record<VehicleKind, VehicleSpec> = {
  motorbike: {
    kind: 'motorbike',
    label: 'Hero Bike',
    banglaName: 'হিরো মোটরবাইক',
    maxSpeed: 23.0,
    reverseSpeed: 7.5,
    accel: 24.0,
    turnRate: 3.15,
    collisionRadius: 1.0,
    seatOffsetX: 0,
    seatOffsetY: 0.72,
    seatOffsetZ: -0.22,
    seatTiltX: 0.22,
  },
  rickshaw: {
    kind: 'rickshaw',
    label: 'Deshi Rickshaw',
    banglaName: 'দেশি রিকশা',
    maxSpeed: 13.5,
    reverseSpeed: 5.0,
    accel: 14.0,
    turnRate: 2.85,
    collisionRadius: 1.25,
    seatOffsetX: 0,
    seatOffsetY: 0.85,
    seatOffsetZ: 0.35,
    seatTiltX: 0.14,
  },
  cng: {
    kind: 'cng',
    label: 'CNG Auto',
    banglaName: 'সিএনজি অটো',
    maxSpeed: 17.5,
    reverseSpeed: 6.5,
    accel: 16.5,
    turnRate: 2.95,
    collisionRadius: 1.35,
    seatOffsetX: 0,
    seatOffsetY: 0.65,
    seatOffsetZ: 0.42,
    seatTiltX: 0.08,
  },
  car: {
    kind: 'car',
    label: 'Sports Sedan',
    banglaName: 'স্পোর্টস সেডান',
    maxSpeed: 22.0,
    reverseSpeed: 8.5,
    accel: 19.5,
    turnRate: 2.55,
    collisionRadius: 1.75,
    seatOffsetX: -0.35,
    seatOffsetY: 0.46,
    seatOffsetZ: -0.15,
    seatTiltX: 0.05,
  },
  taxi: {
    kind: 'taxi',
    label: 'Moholla Taxi',
    banglaName: 'হলুদ ট্যাক্সি',
    maxSpeed: 22.5,
    reverseSpeed: 8.5,
    accel: 20.0,
    turnRate: 2.6,
    collisionRadius: 1.75,
    seatOffsetX: -0.35,
    seatOffsetY: 0.46,
    seatOffsetZ: -0.15,
    seatTiltX: 0.05,
  },
  pickup: {
    kind: 'pickup',
    label: '4x4 Pickup',
    banglaName: '৪×৪ পিকআপ ট্রাক',
    maxSpeed: 19.5,
    reverseSpeed: 8.0,
    accel: 16.0,
    turnRate: 2.2,
    collisionRadius: 1.9,
    seatOffsetX: -0.38,
    seatOffsetY: 0.85,
    seatOffsetZ: 0.28,
    seatTiltX: 0.04,
  },
  minibus: {
    kind: 'minibus',
    label: 'Dhaka Mini-Bus',
    banglaName: 'ঢাকা মিনিবাস',
    maxSpeed: 16.5,
    reverseSpeed: 6.5,
    accel: 12.5,
    turnRate: 1.9,
    collisionRadius: 2.2,
    seatOffsetX: -0.45,
    seatOffsetY: 1.05,
    seatOffsetZ: 1.78,
    seatTiltX: 0.04,
  },
};

export interface VehicleSpawnDef {
  id: string;
  kind: VehicleKind;
  color: string;
  x: number;
  z: number;
  yaw: number;
}

export const VEHICLE_SPAWNS: VehicleSpawnDef[] = [
  // 5 Sedans / Taxis
  { id: 'veh_taxi_garage', kind: 'taxi', color: '#eab308', x: 21.3, z: -44.9, yaw: Math.PI / 2 },
  { id: 'veh_car_cinema', kind: 'car', color: '#dc2626', x: -77.5, z: -122.4, yaw: Math.PI / 2 },
  { id: 'veh_car_bhai', kind: 'car', color: '#cbd5e1', x: -13.2, z: -131.9, yaw: Math.PI / 2 },
  { id: 'veh_car_kacchi', kind: 'car', color: '#1e3a8a', x: -132.3, z: -44.7, yaw: Math.PI / 2 },
  { id: 'veh_car_gym', kind: 'car', color: '#e11d48', x: 133.3, z: 44.1, yaw: Math.PI * 1.5 },
  // 3 Pickup Trucks
  { id: 'veh_pickup_bazar', kind: 'pickup', color: '#0f766e', x: 61.9, z: 61.7, yaw: Math.PI / 2 },
  { id: 'veh_pickup_mach', kind: 'pickup', color: '#0284c7', x: -79.8, z: 128.4, yaw: Math.PI },
  { id: 'veh_pickup_rail', kind: 'pickup', color: '#d97706', x: -43.6, z: 103.0, yaw: Math.PI / 2 },
  // 4 Dhaka Mini-Buses
  { id: 'veh_bus_north', kind: 'minibus', color: '#047857', x: 134.75, z: -131.0, yaw: Math.PI / 2 },
  { id: 'veh_bus_sw', kind: 'minibus', color: '#dc2626', x: -95.25, z: 120.0, yaw: Math.PI * 1.5 },
  { id: 'veh_bus_se', kind: 'minibus', color: '#0284c7', x: 96.75, z: 103.7, yaw: Math.PI / 2 },
  { id: 'veh_bus_sw_far', kind: 'minibus', color: '#ca8a04', x: -134.0, z: 126.0, yaw: Math.PI / 2 },
  // 4 Motorbikes
  { id: 'veh_moto_nw', kind: 'motorbike', color: '#ef4444', x: -96.0, z: -34.0, yaw: 0.2 + Math.PI / 2 },
  { id: 'veh_moto_ne', kind: 'motorbike', color: '#2563eb', x: 96.0, z: 34.0, yaw: -2.9 + Math.PI / 2 },
  { id: 'veh_moto_cyber', kind: 'motorbike', color: '#10b981', x: -125.0, z: 39.0, yaw: 0.1 + Math.PI / 2 },
  { id: 'veh_moto_gym', kind: 'motorbike', color: '#f59e0b', x: 125.0, z: -39.0, yaw: 3.05 + Math.PI / 2 },
  // 7 Rickshaws
  { id: 'veh_rick_1', kind: 'rickshaw', color: '#047857', x: 36.5, z: -33.5, yaw: -0.55 },
  { id: 'veh_rick_2', kind: 'rickshaw', color: '#047857', x: 27.8, z: -32.2, yaw: 0.12 },
  { id: 'veh_rick_3', kind: 'rickshaw', color: '#047857', x: -10.5, z: -61.5, yaw: 1.45 },
  { id: 'veh_rick_4', kind: 'rickshaw', color: '#047857', x: -60.5, z: -57.5, yaw: 0.25 },
  { id: 'veh_rick_5', kind: 'rickshaw', color: '#047857', x: 60.5, z: -57.5, yaw: -0.35 },
  { id: 'veh_rick_6', kind: 'rickshaw', color: '#047857', x: -10.5, z: 61.5, yaw: -1.52 },
  { id: 'veh_rick_7', kind: 'rickshaw', color: '#047857', x: 45.0, z: 77.5, yaw: 0.1 },
  // 4 Green CNG Auto-Rickshaws
  { id: 'veh_cng_avenue', kind: 'cng', color: '#15803d', x: 11.0, z: 23.0, yaw: -0.38 },
  { id: 'veh_cng_west', kind: 'cng', color: '#15803d', x: -60.2, z: -44.2, yaw: 1.55 },
  { id: 'veh_cng_east', kind: 'cng', color: '#15803d', x: 60.2, z: -44.2, yaw: -1.55 },
  { id: 'veh_cng_nw', kind: 'cng', color: '#15803d', x: -110.5, z: -44.5, yaw: 0.15 },
];

export function createInitialVehicles(): VehicleState[] {
  return VEHICLE_SPAWNS.map((s) => ({
    id: s.id,
    kind: s.kind,
    x: s.x,
    z: s.z,
    yaw: s.yaw,
    vx: 0,
    vz: 0,
    speed: 0,
    steer: 0,
    driverId: null,
    color: s.color,
  }));
}

export function findNearestAvailableVehicle(
  x: number,
  z: number,
  vehicles: VehicleState[] | undefined,
  maxDist = 4.2,
): VehicleState | null {
  if (!vehicles || vehicles.length === 0) return null;
  let best: VehicleState | null = null;
  let bestDist = Infinity;
  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    if (v.driverId) continue;
    const spec = VEHICLE_SPECS[v.kind];
    const effectiveMax = maxDist + (spec.collisionRadius - 1.2) * 0.45;
    const d = distance2D(x, z, v.x, v.z);
    if (d <= Math.max(maxDist, effectiveMax) && d < bestDist) {
      bestDist = d;
      best = v;
    }
  }
  return best;
}

export function resolveVehicleCollision(
  x: number,
  z: number,
  radius: number,
  vehicles?: VehicleState[],
  ignoreVehicleId?: string,
  doorLocks?: DoorLockState,
): { x: number; z: number } {
  const res = resolveCircleWallCollision(x, z, radius, WALLS, doorLocks);
  let nx = res.x;
  let nz = res.z;
  if (vehicles && vehicles.length > 0) {
    for (let i = 0; i < vehicles.length; i++) {
      const other = vehicles[i];
      if (other.id === ignoreVehicleId) continue;
      const otherRadius = VEHICLE_SPECS[other.kind].collisionRadius;
      const minSep = radius + otherRadius * 0.85;
      const dx = nx - other.x;
      const dz = nz - other.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < minSep * minSep) {
        if (dSq > 1e-6) {
          const d = Math.sqrt(dSq);
          const push = minSep - d;
          nx += (dx / d) * push;
          nz += (dz / d) * push;
        } else {
          nx += minSep;
        }
      }
    }
  }
  return resolveCircleWallCollision(nx, nz, radius, WALLS, doorLocks);
}

export function resolvePedestrianVehicleCollision(
  x: number,
  z: number,
  radius: number = PLAYER_RADIUS,
  vehicles?: VehicleState[],
  ignoreVehicleId?: string | null,
): { x: number; z: number } {
  let nx = x;
  let nz = z;
  if (!vehicles || vehicles.length === 0) return { x: nx, z: nz };
  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    if (v.id === ignoreVehicleId) continue;
    const vRad = VEHICLE_SPECS[v.kind].collisionRadius * 0.78;
    const minSep = radius + vRad;
    const dx = nx - v.x;
    const dz = nz - v.z;
    const dSq = dx * dx + dz * dz;
    if (dSq < minSep * minSep) {
      if (dSq > 1e-6) {
        const d = Math.sqrt(dSq);
        const push = minSep - d;
        nx += (dx / d) * push;
        nz += (dz / d) * push;
      } else {
        nx += minSep;
      }
    }
  }
  return { x: nx, z: nz };
}

