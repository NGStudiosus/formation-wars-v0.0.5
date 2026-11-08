import { FactionId, FactionMetadata } from '../../types';

export const FACTION_REGISTRY: Record<FactionId, FactionMetadata> = {
  NOVAN: {
    id: 'NOVAN',
    name: 'Novan Republic',
    tag: 'NR',
    primaryColor: '#00f0ff',
    accentColor: '#38bdf8',
    description: 'Disciplined naval doctrine emphasizing rapid hyper-velocity jump operations, cold shield cycling, and standardized baseline hulls.',
    doctrineBrief: 'FACTION BASELINE: Standardized hulls and weapons; rapid micro-jump drives and cold shield reboot protocols.'
  },
  GARN: {
    id: 'GARN',
    name: 'Garn Hegemony',
    tag: 'GH',
    primaryColor: '#22c55e',
    accentColor: '#4ade80',
    description: 'Impenetrable territorial bastions equipped with extreme-range defensive batteries, +65% armor HP, +35% shield HP, and +25% point-defense accuracy.',
    doctrineBrief: 'FORTRESS DOCTRINE: Heavy armor (+65%) and shields (+35%), 25% PD interception bonus, extreme-range defense batteries, 0.65x sublight speed.'
  },
  ALDONAH: {
    id: 'ALDONAH',
    name: 'Alondahan Monarchy',
    tag: 'AM',
    primaryColor: '#eab308',
    accentColor: '#fde047',
    description: 'Resilient industrial society deploying massive, slab-armored brawlers (+50% armor HP, 30% passive damage mitigation) with +50% refinery conversion.',
    doctrineBrief: 'BRAWLER DOCTRINE: Slab armor (+50% armor HP, +30% hull HP, 30% flat mitigation), overclocked smelting (+50% refinery conversion speed).'
  },
  YESTIRI: {
    id: 'YESTIRI',
    name: 'Yestiri Sodality',
    tag: 'YS',
    primaryColor: '#c084fc',
    accentColor: '#d8b4fe',
    description: 'Nomadic spacefarers operating annular ring ships (+40% shields, +20% beam range). Starts directly at Destroyer tier with mobile City-Ship flagships.',
    doctrineBrief: 'ANNULAR DOCTRINE: No frigates; immediate Destroyer unlock at baseline, +40% resonant shields, +20% beam range, mobile City-Ship flagship.'
  },
  LIAAL: {
    id: 'LIAAL',
    name: 'Liaal Consortium',
    tag: 'LAC',
    primaryColor: '#f97316',
    accentColor: '#fb923c',
    description: 'Economy & logistics powerhouse fielding 3 fragile missile warships (20/45/100 salvo) with PROXY BUY powers to build any allied faction hulls.',
    doctrineBrief: 'PROXY DOCTRINE: 200% cargo, 2.5x freighters, 3 fragile native missile warships (30% HP), and PROXY BUYING of all unlocked allied faction ships.'
  },
  KOVAK: {
    id: 'KOVAK',
    name: 'Kovak Enclave',
    tag: 'KE',
    primaryColor: '#ef4444',
    accentColor: '#f87171',
    description: 'Angular rhomboid swarms relying on volume over quality: 50% ship & strategic costs, 50% build time, 40% durability, and +10% swarm velocity.',
    doctrineBrief: 'SWARM DOCTRINE: 50% ship & research costs, 50% build time, 40% hull & shield capacity, +10% speed, -10% PD range.'
  }
};

export const ALL_FACTION_IDS: FactionId[] = [
  'NOVAN',
  'GARN',
  'ALDONAH',
  'YESTIRI',
  'LIAAL',
  'KOVAK'
];
