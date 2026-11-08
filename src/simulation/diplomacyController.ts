import { FactionId, DiplomacyPlayer, DiplomacyRelation, GameSetupConfig, ShipEntity } from '../types';
import { FACTION_REGISTRY } from './factions/factionRegistry';

export const TEAM_COLORS: Record<number, string> = {
  1: '#00f0ff', // Cyan
  2: '#ef4444', // Red
  3: '#22c55e', // Green
  4: '#f59e0b', // Amber / Gold
  5: '#a855f7', // Purple
  6: '#f97316', // Orange
  7: '#ec4899', // Pink / Rose
  8: '#14b8a6', // Teal
};

export const TEAM_NAMES: Record<number, string> = {
  1: 'Team 1 (Alpha)',
  2: 'Team 2 (Bravo)',
  3: 'Team 3 (Charlie)',
  4: 'Team 4 (Delta)',
  5: 'Team 5 (Echo)',
  6: 'Team 6 (Foxtrot)',
  7: 'Team 7 (Golf)',
  8: 'Team 8 (Hotel)',
};

export interface DiplomacyState {
  players: DiplomacyPlayer[];
  alliances: Set<string>; // 'player-1_player-2' or 'NOVAN_GARN'
}

/**
 * Initializes the 2-8 player diplomacy matrix
 */
export function initializeDiplomacyState(
  config?: GameSetupConfig,
  systems?: Array<{ id: string; name: string; assignedFaction?: FactionId }>,
  playerFaction: FactionId = 'NOVAN'
): DiplomacyState {
  const players: DiplomacyPlayer[] = [];
  const pTeam = config?.playerTeam ?? 1;

  // Player 1 (Human)
  const p0Sys = systems?.[0];
  players.push({
    id: 'player-1',
    name: `Player 1 (You - ${FACTION_REGISTRY[playerFaction]?.name || playerFaction})`,
    factionId: playerFaction,
    team: pTeam,
    isHuman: true,
    systemIndex: 0,
    systemId: p0Sys?.id,
    systemName: p0Sys?.name || 'Sector 1 (Homeworld)',
    relationship: 'ALLIED', // Self is allied
  });

  const opponents = config?.systemOpponents || [];
  const opponentTeams = config?.systemOpponentTeams || [];

  for (let i = 0; i < opponents.length; i++) {
    const oppFac = opponents[i];
    const sysIdx = i + 1;
    const sys = systems?.[sysIdx];
    const oppTeam = opponentTeams[i] !== undefined ? opponentTeams[i] : ((i + 1) % 8) + 1;
    const isSameTeam = oppTeam === pTeam;

    players.push({
      id: `player-${sysIdx + 1}`,
      name: `Sector ${sysIdx + 1} Commander (${FACTION_REGISTRY[oppFac]?.name || oppFac})`,
      factionId: oppFac,
      team: oppTeam,
      isHuman: false,
      systemIndex: sysIdx,
      systemId: sys?.id,
      systemName: sys?.name || `Sector ${sysIdx + 1}`,
      relationship: isSameTeam ? 'ALLIED' : 'ENEMY',
    });
  }

  const alliances = new Set<string>();
  // Form initial alliances for players on the same team
  for (let a = 0; a < players.length; a++) {
    for (let b = a + 1; b < players.length; b++) {
      if (players[a].team === players[b].team) {
        alliances.add(makePairKey(players[a].id, players[b].id));
        alliances.add(makeFactionPairKey(players[a].factionId, players[b].factionId));
      }
    }
  }

  return { players, alliances };
}

function makePairKey(idA: string, idB: string): string {
  return [idA, idB].sort().join('_');
}

function makeFactionPairKey(facA: string, facB: string): string {
  return [facA, facB].sort().join('_');
}

/**
 * Checks if two entities or factions are diplomatically allied
 */
export function areEntitiesAllied(
  a: ShipEntity | { factionId?: string; faction?: string; team?: number; id?: string },
  b: ShipEntity | { factionId?: string; faction?: string; team?: number; id?: string },
  diplomacy?: DiplomacyState
): boolean {
  if (!a || !b) return false;
  if (a.id === b.id) return true;

  // If both have explicit team IDs
  if (a.team !== undefined && b.team !== undefined && a.team === b.team) {
    return true;
  }

  const facA = a.factionId || a.faction;
  const facB = b.factionId || b.faction;

  if (facA && facB && facA === facB) {
    return true;
  }

  if (diplomacy && facA && facB) {
    const p1 = diplomacy.players.find(p => p.factionId === facA);
    const p2 = diplomacy.players.find(p => p.factionId === facB);
    if (p1 && p2) {
      if (p1.team === p2.team) return true;
      if (diplomacy.alliances.has(makePairKey(p1.id, p2.id))) return true;
      if (diplomacy.alliances.has(makeFactionPairKey(p1.factionId, p2.factionId))) return true;
    }
  }

  return false;
}

/**
 * Gets all factions allied with the specified faction
 */
export function getAlliedFactions(
  factionId: FactionId,
  diplomacy?: DiplomacyState
): FactionId[] {
  const allied = new Set<FactionId>();
  allied.add(factionId); // Self is always included

  if (!diplomacy || !diplomacy.players) return Array.from(allied);

  const selfPlayer = diplomacy.players.find(p => p.factionId === factionId);
  if (!selfPlayer) return Array.from(allied);

  for (const p of diplomacy.players) {
    if (p.id === selfPlayer.id) continue;
    if (
      p.team === selfPlayer.team ||
      diplomacy.alliances.has(makePairKey(selfPlayer.id, p.id)) ||
      diplomacy.alliances.has(makeFactionPairKey(selfPlayer.factionId, p.factionId)) ||
      p.relationship === 'ALLIED'
    ) {
      allied.add(p.factionId);
    }
  }

  return Array.from(allied);
}

/**
 * Handles offering an alliance between player 1 (human) and target player
 */
export function offerAlliance(
  targetPlayerId: string,
  diplomacy: DiplomacyState,
  addLog?: (cat: string, msg: string, sev?: any) => void
): { success: boolean; message: string } {
  const p1 = diplomacy.players.find(p => p.id === 'player-1');
  const target = diplomacy.players.find(p => p.id === targetPlayerId);

  if (!p1 || !target) {
    return { success: false, message: 'Invalid player designation.' };
  }

  if (target.relationship === 'ALLIED') {
    return { success: false, message: 'Already allied with this sovereign command.' };
  }

  // Set proposal to OFFER_SENT
  target.relationship = 'OFFER_SENT';
  addLog?.(
    'DIPLOMACY',
    `🕊️ Diplomatic Envoy Dispatched: Alliance proposal extended to ${target.name}.`,
    'info'
  );

  return { success: true, message: `Alliance proposal sent to ${target.name}.` };
}

/**
 * Accepts an alliance offer or formalizes mutual alliance
 */
export function acceptAlliance(
  targetPlayerId: string,
  diplomacy: DiplomacyState,
  addLog?: (cat: string, msg: string, sev?: any) => void
): { success: boolean; message: string } {
  const p1 = diplomacy.players.find(p => p.id === 'player-1');
  const target = diplomacy.players.find(p => p.id === targetPlayerId);

  if (!p1 || !target) {
    return { success: false, message: 'Invalid player designation.' };
  }

  target.relationship = 'ALLIED';
  target.team = p1.team; // Synchronize to same team

  diplomacy.alliances.add(makePairKey(p1.id, target.id));
  diplomacy.alliances.add(makeFactionPairKey(p1.factionId, target.factionId));

  const facName = FACTION_REGISTRY[target.factionId]?.name || target.factionId;
  addLog?.(
    'DIPLOMACY',
    `🤝 ALLIANCE RATIFIED // ${facName} is now an allied sovereign partner on Team ${p1.team}!`,
    'success'
  );

  return { success: true, message: `Alliance with ${facName} successfully ratified.` };
}

/**
 * Breaks an existing alliance
 */
export function breakAlliance(
  targetPlayerId: string,
  diplomacy: DiplomacyState,
  addLog?: (cat: string, msg: string, sev?: any) => void
): { success: boolean; message: string } {
  const p1 = diplomacy.players.find(p => p.id === 'player-1');
  const target = diplomacy.players.find(p => p.id === targetPlayerId);

  if (!p1 || !target) {
    return { success: false, message: 'Invalid player designation.' };
  }

  target.relationship = 'ENEMY';
  // Assign to different team (e.g. original systemIndex + 1)
  target.team = ((target.systemIndex % 7) + 2);

  diplomacy.alliances.delete(makePairKey(p1.id, target.id));
  diplomacy.alliances.delete(makeFactionPairKey(p1.factionId, target.factionId));

  const facName = FACTION_REGISTRY[target.factionId]?.name || target.factionId;
  addLog?.(
    'DIPLOMACY',
    `⚡ PACT SEVERED // Diplomatic alliance with ${facName} dissolved. Target designated HOSTILE.`,
    'warn'
  );

  return { success: true, message: `Alliance with ${facName} severed.` };
}

/**
 * Sets a player's team (1-8)
 */
export function setPlayerTeam(
  playerId: string,
  newTeam: number,
  diplomacy: DiplomacyState,
  addLog?: (cat: string, msg: string, sev?: any) => void
): void {
  const player = diplomacy.players.find(p => p.id === playerId);
  if (!player) return;

  const clampedTeam = Math.max(1, Math.min(8, newTeam));
  player.team = clampedTeam;

  const p1 = diplomacy.players.find(p => p.id === 'player-1');
  if (p1 && player.id !== p1.id) {
    if (player.team === p1.team) {
      player.relationship = 'ALLIED';
      diplomacy.alliances.add(makePairKey(p1.id, player.id));
      diplomacy.alliances.add(makeFactionPairKey(p1.factionId, player.factionId));
    } else {
      player.relationship = 'ENEMY';
      diplomacy.alliances.delete(makePairKey(p1.id, player.id));
      diplomacy.alliances.delete(makeFactionPairKey(p1.factionId, player.factionId));
    }
  }

  addLog?.(
    'DIPLOMACY',
    `🚩 Team Assignment Updated: ${player.name} reallocated to Team ${clampedTeam} (${TEAM_NAMES[clampedTeam]}).`,
    'info'
  );
}
