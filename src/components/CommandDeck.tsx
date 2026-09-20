import React, { useState, useEffect } from 'react';
import { SimulationEngine } from '../simulation/engine';
import { ShipEntity, NavalUnitRole, StructureType, CombatStance } from '../types';
import { STRUCTURE_CATALOG } from '../simulation/structures';
import { placementController } from '../simulation/placementController';
import {
  CommandTooltipCard,
  ActiveTooltipState,
} from './CommandTooltipCard';
import { CommandSlotButton } from './CommandSlotButton';
import { useSettingsStore } from '../state/settingsStore';
import {
  Shield,
  ShieldOff,
  Crosshair,
  Target,
  Zap,
  Square,
  Radio,
  Orbit,
  Hammer,
  RotateCcw,
  Navigation,
  AlertTriangle,
  Factory,
  Boxes,
  Wrench,
  Cpu,
  Layers,
  ChevronLeft,
  Anchor,
  Flame,
  Swords,
  Activity,
  ShieldCheck,
  Eye,
  Users,
  FlaskConical,
  Fuel,
  Package,
  Trash2,
  Crown,
  X,
} from 'lucide-react';

export type CommandPage =
  | 'ROOT'
  | 'HQ_TACTICAL'
  | 'HQ_BUILDINGS'
  | 'HQ_SHIPYARD'
  | 'HQ_DOMESTIC_STRUCTURES'
  | 'HQ_MILITARY_STRUCTURES'
  | 'HQ_SHIPYARD_QUEUE'
  | 'WARSHIP_TACTICAL'
  | 'WARSHIP_SYSTEMS'
  | 'WARSHIP_ORDERS'
  | 'WARSHIP_FLEET_ASSIGN'
  | 'FLEET_ROOT'
  | 'BUILDER_ROOT'
  | 'BUILDER_INFRASTRUCTURE'
  | 'BUILDER_DEFENSES';

export interface DeckNavigationState {
  currentPage: CommandPage;
  history: CommandPage[];
}

interface CommandDeckProps {
  engine: SimulationEngine;
  onSelectShip: (id: string) => void;
  selectedShipIds?: string[];
  moveModeActive: boolean;
  onToggleMoveMode: () => void;
  jumpModeActive?: boolean;
  onToggleJumpMode?: () => void;
  buildStructureType?: StructureType | null;
  onSelectBuildStructure?: (type: StructureType | null) => void;
  onOpenResearchModal?: () => void;
}

export const CommandDeck: React.FC<CommandDeckProps> = ({
  engine,
  onSelectShip,
  selectedShipIds = [],
  moveModeActive,
  onToggleMoveMode,
  jumpModeActive = false,
  onToggleJumpMode,
  buildStructureType = null,
  onSelectBuildStructure,
  onOpenResearchModal,
}) => {
  const { settings } = useSettingsStore();
  const uiScale = settings?.uiScale ?? 1.0;

  const isMultiSelect = selectedShipIds && selectedShipIds.length > 1;
  const selectedShips = isMultiSelect
    ? (engine.ships ?? []).filter((s) => selectedShipIds.includes(s.id) && s.faction === 'FRIENDLY' && s.hullState !== 'DESTROYED')
    : [];
  const flagship = isMultiSelect ? engine.getDesignatedFlagship() : null;
  const selectedShip = isMultiSelect ? (flagship ?? engine.getSelectedShip()) : engine.getSelectedShip();
  const isShipyard = Boolean(
    selectedShip &&
      (selectedShip.role === 'SY_LIGHT' ||
        selectedShip.role === 'SY_MEDIUM' ||
        selectedShip.role === 'SY_HEAVY' ||
        (selectedShip as any).structureType === 'SY_LIGHT' ||
        (selectedShip as any).structureType === 'SY_MEDIUM' ||
        (selectedShip as any).structureType === 'SY_HEAVY') &&
      !isMultiSelect
  );
  const isWarship = Boolean(
    selectedShip &&
      selectedShip.role !== 'HQ' &&
      selectedShip.role !== 'BUILDER' &&
      !isShipyard &&
      !isMultiSelect
  );
  const hqResources = engine.getHQResources();

  // Navigation page state machine
  const [navState, setNavState] = useState<DeckNavigationState>({
    currentPage: 'ROOT',
    history: [],
  });

  // Persistent hover tooltip card state across all 14 tactile slots
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltipState>({
    visible: false,
    slotIndex: -1,
    actionType: 'ORDER',
    payload: null,
    anchorRect: null,
    anchorX: 0,
    anchorY: 0,
  });

  // Automatically reset or adjust page context when selection shifts
  useEffect(() => {
    if (isMultiSelect) {
      setNavState({ currentPage: 'FLEET_ROOT', history: [] });
    } else if (selectedShip?.role === 'HQ') {
      setNavState((prev) => {
        const isHqPage = [
          'ROOT',
          'HQ_TACTICAL',
          'HQ_BUILDINGS',
          'HQ_SHIPYARD',
          'HQ_DOMESTIC_STRUCTURES',
          'HQ_MILITARY_STRUCTURES',
          'HQ_SHIPYARD_QUEUE',
        ].includes(prev.currentPage);
        return isHqPage ? prev : { currentPage: 'ROOT', history: [] };
      });
    } else if (selectedShip?.role === 'BUILDER') {
      setNavState((prev) => {
        const isBuilderPage = ['BUILDER_ROOT', 'BUILDER_INFRASTRUCTURE', 'BUILDER_DEFENSES'].includes(prev.currentPage);
        return isBuilderPage ? prev : { currentPage: 'BUILDER_ROOT', history: [] };
      });
    } else if (isShipyard) {
      setNavState((prev) => {
        const isYardPage = ['HQ_SHIPYARD_QUEUE', 'HQ_SHIPYARD'].includes(prev.currentPage);
        return isYardPage ? prev : { currentPage: 'HQ_SHIPYARD_QUEUE', history: [] };
      });
    } else if (selectedShip) {
      setNavState((prev) => {
        const isWarshipPage = ['ROOT', 'WARSHIP_TACTICAL', 'WARSHIP_SYSTEMS', 'WARSHIP_ORDERS', 'WARSHIP_FLEET_ASSIGN'].includes(prev.currentPage);
        return isWarshipPage ? prev : { currentPage: 'ROOT', history: [] };
      });
    } else {
      setNavState({ currentPage: 'ROOT', history: [] });
    }
  }, [selectedShip?.id, selectedShip?.role, isShipyard, isMultiSelect]);

  const navigateTo = (page: CommandPage) => {
    setNavState((prev) => ({
      currentPage: page,
      history: [...prev.history, prev.currentPage],
    }));
    handleSlotLeave();
  };

  const navigateBack = () => {
    setNavState((prev) => {
      if (prev.history.length === 0) {
        return { currentPage: 'ROOT', history: [] };
      }
      const newHistory = [...prev.history];
      const previousPage = newHistory.pop() || 'ROOT';
      return {
        currentPage: previousPage,
        history: newHistory,
      };
    });
    handleSlotLeave();
  };

  const handleSlotHover = (
    slotIdx: number,
    actionType: 'BUILD_SHIP' | 'BUILD_STRUCTURE' | 'ORDER' | 'STANCE',
    payload: any,
    anchorOrEvent?: DOMRect | React.MouseEvent | HTMLElement
  ) => {
    let rect: DOMRect | null = null;
    if (anchorOrEvent) {
      if ('getBoundingClientRect' in (anchorOrEvent as any)) {
        rect = ((anchorOrEvent as any).currentTarget || (anchorOrEvent as any)).getBoundingClientRect();
      } else if ('left' in (anchorOrEvent as any) && 'top' in (anchorOrEvent as any)) {
        rect = anchorOrEvent as DOMRect;
      }
    }
    setActiveTooltip({
      visible: true,
      slotIndex: slotIdx,
      actionType,
      payload,
      anchorRect: rect,
      anchorX: rect ? rect.left + rect.width / 2 : 0,
      anchorY: rect ? rect.top : 0,
    });
  };

  const handleSlotLeave = () => {
    setActiveTooltip((prev) => ({ ...prev, visible: false, slotIndex: -1 }));
  };

  // Naval hull construction specs for shipyard forge
  const navalTiers: {
    role: NavalUnitRole;
    code: string;
    name: string;
    metallic: number;
    organic: number;
    buildTime: number;
    requiresShipyard: boolean;
  }[] = [
    { role: 'FRIGATE', code: 'FG', name: 'Frigate', metallic: 200, organic: 45, buildTime: 10, requiresShipyard: false },
    { role: 'DESTROYER', code: 'DD', name: 'Destroyer', metallic: 800, organic: 230, buildTime: 18, requiresShipyard: false },
    { role: 'LIGHT_CRUISER', code: 'CL', name: 'Light Cruiser', metallic: 2500, organic: 650, buildTime: 25, requiresShipyard: true },
    { role: 'HEAVY_CRUISER', code: 'CH', name: 'Heavy Cruiser', metallic: 5000, organic: 1200, buildTime: 35, requiresShipyard: true },
    { role: 'BATTLECRUISER', code: 'BC', name: 'Battlecruiser', metallic: 8500, organic: 1800, buildTime: 45, requiresShipyard: true },
    { role: 'BATTLESHIP', code: 'BB', name: 'Battleship', metallic: 14000, organic: 3000, buildTime: 60, requiresShipyard: true },
    { role: 'DREADNOUGHT', code: 'DN', name: 'Dreadnought', metallic: 25000, organic: 5000, buildTime: 90, requiresShipyard: true },
    { role: 'MINER', code: 'MN', name: 'Miner', metallic: 1500, organic: 400, buildTime: 25, requiresShipyard: false },
  ];

  // Helper to clone icon to 36px-42px range (38px standard)
  const renderIcon = (icon: React.ReactNode) => {
    if (React.isValidElement(icon)) {
      const existingClass = (icon.props as any)?.className || '';
      const cleanedClass = existingClass.replace(/w-[0-9.]+\s*h-[0-9.]+/, '').trim();
      return React.cloneElement(icon as React.ReactElement<any>, {
        className: `${cleanedClass} w-[38px] h-[38px] transition-transform duration-100 group-hover:scale-105`,
        size: 38,
      });
    }
    return icon;
  };

  // Helper to resolve hotkey shortcut tag for tactile slots
  const resolveShortcut = (
    id: string,
    label: string,
    subLabel: string,
    explicitShortcut?: string
  ): string | null => {
    if (explicitShortcut) {
      return explicitShortcut.startsWith('[') ? explicitShortcut : `[${explicitShortcut}]`;
    }

    const lid = id.toLowerCase();
    const lLabel = label.toUpperCase();
    const lSub = subLabel.toUpperCase();

    if (lLabel === 'BACK' || lid.includes('back') || lid.includes('clear') || lid.includes('cancel')) return '[ESC]';
    if (lLabel === 'SPLINE' || lSub === 'MOVE' || lid.includes('move')) return '[M]';
    if (lLabel === 'STOP' || lSub === 'HALT' || lid.includes('stop')) return '[S]';
    if (lLabel === 'SALVO' || lid.includes('salvo')) return '[F]';
    if (lLabel === 'STANCE' || lid.includes('stance')) return '[A]';
    if (lLabel.includes('JUMP') || lSub.includes('JUMP') || lid.includes('jump')) return '[J]';
    if (lLabel.includes('TOT') || lid.includes('tot')) return '[T]';
    if (lLabel.includes('PD MODE') || lid.includes('pdmode')) return '[O]';
    if (lLabel.includes('CHAFF') || lLabel.includes('JAM') || lLabel.includes('CRUISE') || lid.includes('cruise') || lid.includes('fms')) return '[C]';
    if (lLabel.includes('RTB') || lLabel.includes('RETURN') || lid.includes('return')) return '[R]';
    if (lLabel.includes('GATE') || lid.includes('gate')) return '[G]';
    if (lLabel === 'AUTO-FIRE' || lid.includes('autofire')) return '[T]';
    if (lid.includes('subnav-tac') || (lLabel === 'TACTICAL' && lid.includes('subnav'))) return '[1]';
    if (lid.includes('subnav-sys') || lid.includes('subnav-bld') || ((lLabel === 'SYSTEMS' || lLabel === 'BUILDINGS') && lid.includes('subnav'))) return '[2]';
    if (lid.includes('subnav-ord') || lid.includes('subnav-shipyard') || ((lLabel === 'ORDERS' || lLabel === 'SHIPYARD') && lid.includes('subnav'))) return '[3]';

    // Naval tier shortcuts in forge
    if (lid.includes('forge-fg')) return '[1]';
    if (lid.includes('forge-dd')) return '[2]';
    if (lid.includes('forge-cl')) return '[3]';
    if (lid.includes('forge-ch')) return '[4]';
    if (lid.includes('forge-bc')) return '[5]';
    if (lid.includes('forge-bb')) return '[6]';
    if (lid.includes('forge-dn')) return '[7]';
    if (lid.includes('forge-mn')) return '[8]';

    return null;
  };

  // Helper to render empty slot placeholders uniformly
  const renderEmptySlot = (index: number) => {
    return (
      <div
        key={`empty-${index}`}
        className="flex items-center justify-center rounded-[4px] border border-slate-800/40 bg-slate-950/25 text-slate-800 select-none pointer-events-none w-full h-full min-w-0 min-h-0 aspect-square"
      >
        <span className="text-[12px] font-mono text-slate-800/60">--</span>
      </div>
    );
  };

  // Helper to render tactile slot buttons uniformly
  const renderSlot = (
    index: number,
    id: string,
    label: string,
    subLabel: string,
    icon: React.ReactNode,
    onClick: () => void,
    onRightClick?: (e: React.MouseEvent) => void,
    hoverData?: { type: 'ORDER' | 'BUILD_SHIP' | 'BUILD_STRUCTURE' | 'STANCE'; payload: any },
    options?: {
      active?: boolean;
      disabled?: boolean;
      badge?: string | number;
      shortcut?: string;
      accentColor?: string;
      pulse?: boolean;
      lockType?: 'RESEARCH' | 'SLIPWAY' | 'RESOURCE' | 'NONE';
      costText?: string;
      hasResourceDeficit?: boolean;
    }
  ) => {
    const shortcut = resolveShortcut(id, label, subLabel, options?.shortcut);

    return (
      <CommandSlotButton
        key={`${index}-${id}`}
        id={id}
        index={index}
        label={label}
        subLabel={subLabel}
        icon={renderIcon(icon)}
        onClick={onClick}
        onRightClick={onRightClick}
        hoverData={hoverData}
        onSlotHover={(idx, type, payload, rect) => handleSlotHover(idx, type, payload, rect)}
        onSlotLeave={handleSlotLeave}
        shortcut={shortcut}
        options={options}
      />
    );
  };

  // Back Button for Sub-Pages
  const renderBackButton = (slotIndex: number = 0) => {
    return renderSlot(
      slotIndex,
      'cmd-slot-back',
      'BACK',
      'ROOT',
      <ChevronLeft className="w-3.5 h-3.5 text-amber-400" />,
      navigateBack,
      undefined,
      {
        type: 'ORDER',
        payload: {
          code: 'ESC-ROOT',
          title: 'Return to Root Page [ESC]',
          description: 'Navigates back to the primary entity command deck.',
        },
      },
      { accentColor: '#fbbf24' }
    );
  };

  // -------------------------------------------------------------
  // PAGE RENDERERS: 14 SLOTS EACH (2x7 MATRIX)
  // -------------------------------------------------------------

  const renderHQRoot = () => {
    const slots = [];

    // Slot 1: Combat Stance Toggle ([STANCE])
    // Defaults to: AGGRESSIVE (unlike warships which default to defend/passive).
    // Single-click radio cycle: AGGRESSIVE -> NEUTRAL (Defensive return-fire) -> PASSIVE (Hold fire).
    // Dynamic label/badge displays current active posture.
    const curStance = selectedShip?.combatStance || 'AGGRESSIVE';
    const stanceDisplay =
      curStance === 'AGGRESSIVE'
        ? 'AGGRESSIVE'
        : curStance === 'DEFENSIVE'
        ? 'NEUTRAL'
        : 'PASSIVE';

    const stanceIcon =
      curStance === 'AGGRESSIVE' ? (
        <Swords className="w-3.5 h-3.5 text-rose-400" />
      ) : curStance === 'DEFENSIVE' ? (
        <Shield className="w-3.5 h-3.5 text-cyan-300" />
      ) : (
        <ShieldOff className="w-3.5 h-3.5 text-slate-400" />
      );

    slots.push(
      renderSlot(
        0,
        'cmd-hq-slot-stance',
        'STANCE',
        stanceDisplay,
        stanceIcon,
        () => {
          const nextStance: CombatStance =
            curStance === 'AGGRESSIVE'
              ? 'DEFENSIVE'
              : curStance === 'DEFENSIVE'
              ? 'PASSIVE'
              : 'AGGRESSIVE';
          if (selectedShip) {
            selectedShip.combatStance = nextStance;
            engine.setCombatStance(selectedShip.id, nextStance);
            engine.addLog('STANCE', `HQ Station combat stance updated to [${nextStance}].`, 'info');
          }
        },
        undefined,
        {
          type: 'STANCE',
          payload: {
            code: 'HQ-STC',
            title: `Station Combat Doctrine [${stanceDisplay}]`,
            description:
              'Cycle station operational postures: 1. AGGRESSIVE (Auto-target and engage all hostiles in engagement envelope) -> 2. NEUTRAL (Defensive return-fire against attackers only) -> 3. PASSIVE (Hold fire; batteries and PD stand down).',
          },
        },
        {
          badge: stanceDisplay,
          accentColor: curStance === 'AGGRESSIVE' ? '#f43f5e' : curStance === 'DEFENSIVE' ? '#38bdf8' : '#64748b',
        }
      )
    );

    // Slot 2: Domestic Structures ([DOMESTIC])
    // Glyph/Icon: Industrial Dome / Factory / Beaker symbol.
    // Action: Transitions the 2x7 grid to HQ_DOMESTIC_STRUCTURES.
    // Tooltip: DOMESTIC INFRASTRUCTURE: Deploy orbital shipyards, refineries, and specialized research facilities across captured gravity wells.
    slots.push(
      renderSlot(
        1,
        'cmd-hq-subnav-domestic',
        'DOMESTIC',
        'INFRA',
        <Factory className="w-4 h-4 text-amber-400" />,
        () => navigateTo('HQ_DOMESTIC_STRUCTURES'),
        undefined,
        {
          type: 'ORDER',
          payload: {
            code: 'NAV-DOM',
            title: 'Domestic Infrastructure Grid',
            description:
              'DOMESTIC INFRASTRUCTURE: Deploy orbital shipyards, refineries, and specialized research facilities across captured gravity wells.',
          },
        },
        { accentColor: '#fbbf24' }
      )
    );

    // Slot 3: Military Structures ([MILITARY DEFENSES])
    // Glyph/Icon: Shield / Turret / Wrench symbol.
    // Action: Transitions the 2x7 grid to HQ_MILITARY_STRUCTURES.
    // Tooltip: TACTICAL INSTALLATIONS: Deploy defensive missile batteries, point-defense platforms, and fleet repair bays.
    slots.push(
      renderSlot(
        2,
        'cmd-hq-subnav-military',
        'MILITARY',
        'DEFENSES',
        <Shield className="w-4 h-4 text-rose-400" />,
        () => navigateTo('HQ_MILITARY_STRUCTURES'),
        undefined,
        {
          type: 'ORDER',
          payload: {
            code: 'NAV-MIL',
            title: 'Military Defenses & Tactical Installations',
            description:
              'TACTICAL INSTALLATIONS: Deploy defensive missile batteries, point-defense platforms, and fleet repair bays.',
          },
        },
        { accentColor: '#f43f5e' }
      )
    );

    // Slot 4: Shipyard Access ([SHIPYARD])
    // Glyph/Icon: Drydock / Hull Silhouette symbol.
    // Action: Transitions the 2x7 grid to HQ_SHIPYARD_QUEUE.
    // Tooltip: CONSTRUCTION SLIPWAYS: Manage integrated light vessel queues and coordinate production with orbital shipyards.
    slots.push(
      renderSlot(
        3,
        'cmd-hq-subnav-shipyard',
        'SHIPYARD',
        'QUEUES',
        <Anchor className="w-4 h-4 text-cyan-400" />,
        () => navigateTo('HQ_SHIPYARD_QUEUE'),
        undefined,
        {
          type: 'ORDER',
          payload: {
            code: 'NAV-SYD',
            title: 'Naval Shipyard Slipways',
            description:
              'CONSTRUCTION SLIPWAYS: Manage integrated light vessel queues and coordinate production with orbital shipyards.',
          },
        },
        { accentColor: '#00f0ff' }
      )
    );

    // Slots 5 through 14: Blank/inactive dark-glass frames (Slot 14 is reserved for [BACK] on sub-pages)
    for (let i = 4; i < 14; i++) {
      slots.push(renderEmptySlot(i));
    }

    return slots;
  };

  const renderHQTactical = () => {
    const slots = [];
    slots.push(renderBackButton());

    const tacticalActions = [
      { id: 'alert', label: 'ALERT', sub: 'RED COND', icon: <Flame className="w-3.5 h-3.5 text-rose-400" />, desc: 'Raise battlestations alert, arming all point-defense platforms.' },
      { id: 'pd-overdrive', label: 'PD OVERDRIVE', sub: '5.0s BURST', icon: <Zap className="w-3.5 h-3.5 text-amber-400" />, desc: 'Overclock point-defense beam capacitors for maximum rate of fire.' },
      { id: 'counter-wall', label: 'SCREEN', sub: 'CM BARRAGE', icon: <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />, desc: 'Launch perimeter counter-missile umbrella to intercept incoming salvos.' },
      { id: 'interdict', label: 'JAM FIELD', sub: 'INTERDICT', icon: <Radio className="w-3.5 h-3.5 text-purple-400" />, desc: 'Activate local gravity disturbance inhibiting pirate micro-jumps.' },
      { id: 'scramble', label: 'SCRAMBLE', sub: 'ESCORT', icon: <Swords className="w-3.5 h-3.5 text-rose-400" />, desc: 'Order all docked warships to undock and form perimeter defense.' },
      { id: 'doctrine', label: 'DOCTRINE', sub: selectedShip?.aggressiveDoctrine || 'KILL', icon: <Target className="w-3.5 h-3.5 text-cyan-400" />, desc: 'Toggle station firing doctrine between KILL and DISABLE.' },
      { id: 'sensors', label: 'TACHYON', sub: 'DEEP PING', icon: <Eye className="w-3.5 h-3.5 text-sky-400" />, desc: 'Transmit ultra-wide radar pulse clearing local fog of war.' },
      { id: 'shield-pulse', label: 'PULSE', sub: 'DEFLECTOR', icon: <Shield className="w-3.5 h-3.5 text-emerald-400" />, desc: 'Discharge outer shield harmonic wave pushing debris away.' },
      { id: 'battery-sync', label: 'SYNC', sub: 'BATTERIES', icon: <Crosshair className="w-3.5 h-3.5 text-amber-400" />, desc: 'Link orbital missile batteries to HQ fire-control computer.' },
      { id: 'repair-bay-pwr', label: 'REPAIR BAY', sub: 'POWER ON', icon: <Wrench className="w-3.5 h-3.5 text-emerald-300" />, desc: 'Overcharge orbital repair bay welding beams.' },
      { id: 'moored-prot', label: 'MOORING', sub: 'TETHER', icon: <Anchor className="w-3.5 h-3.5 text-cyan-400" />, desc: 'Lock allied ships in gravity well reference frame.' },
      { id: 'cease-fire', label: 'HOLD FIRE', sub: 'CEASE', icon: <Square className="w-3.5 h-3.5 text-slate-400" />, desc: 'Order all station turrets to immediately cease fire.' },
      { id: 'status-report', label: 'LOGS', sub: 'TELEMETRY', icon: <Activity className="w-3.5 h-3.5 text-emerald-400" />, desc: 'Dump station tactical telemetry to command stream.' },
    ];

    tacticalActions.forEach((act, idx) => {
      slots.push(
        renderSlot(
          idx + 1,
          `cmd-hq-tac-${act.id}`,
          act.label,
          act.sub,
          act.icon,
          () => engine.addLog('TACTICAL', `Station command issued: ${act.label}`, 'info'),
          undefined,
          {
            type: 'ORDER',
            payload: {
              code: `TAC-${act.id.toUpperCase()}`,
              title: act.label,
              description: act.desc,
            },
          }
        )
      );
    });

    return slots;
  };

  // -------------------------------------------------------------
  // SUB-PAGE: DOMESTIC STRUCTURES (HQ_DOMESTIC_STRUCTURES)
  // -------------------------------------------------------------
  const renderHQDomesticStructures = () => {
    const slots: React.ReactNode[] = [];

    const handleStructureSelect = (sType: StructureType) => {
      const def = STRUCTURE_CATALOG[sType];
      if (!def) return;
      const isSelected = buildStructureType === sType || placementController.getActiveBlueprint()?.type === sType;
      if (isSelected) {
        placementController.clear();
        onSelectBuildStructure?.(null);
        engine.addLog('LOGISTICS', 'Placement mode canceled.', 'info');
      } else {
        placementController.setActiveBlueprint(def);
        onSelectBuildStructure?.(sType);
        engine.addLog(
          'LOGISTICS',
          `Blueprint active: [${def.name}]. Left-click inside any captured/allied planetary or asteroid gravity well to drop scaffold.`,
          'info'
        );
      }
    };

    // Row 1 & 2: Economic, Scientific, and Shipyard Slipway Blueprints
    // Slot 1: Light Orbital Shipyard ([SY-L])
    // Slot 2: Medium Orbital Shipyard ([SY-M])
    // Slot 3: Heavy Orbital Shipyard ([SY-H])
    // Slot 4: Automated Refinery ([REF])
    // Slot 5: Military Research Station ([MRS])
    // Slot 6: Civic Research Outpost ([CRO])
    // Slot 7: Expansion Citadel ([EXC])
    // Slot 8: Forward Sensor Outpost ([OUT])
    const domesticSpecs: {
      type: StructureType;
      code: string;
      label: string;
      sub: string;
      icon: React.ReactNode;
      accent: string;
      reqTechName?: string;
    }[] = [
      {
        type: 'SY_LIGHT',
        code: 'SY-L',
        label: 'SY-L',
        sub: 'LT YARD',
        icon: <Factory className="w-3.5 h-3.5 text-cyan-400" />,
        accent: '#00f0ff',
      },
      {
        type: 'SY_MEDIUM',
        code: 'SY-M',
        label: 'SY-M',
        sub: 'MED YARD',
        icon: <Factory className="w-3.5 h-3.5 text-blue-400" />,
        accent: '#3b82f6',
        reqTechName: 'Civic Tier 3 / Military Tier 4',
      },
      {
        type: 'SY_HEAVY',
        code: 'SY-H',
        label: 'SY-H',
        sub: 'HVY YARD',
        icon: <Factory className="w-3.5 h-3.5 text-purple-400" />,
        accent: '#a855f7',
        reqTechName: 'Military Tier 7: Apex Capital Gantry',
      },
      {
        type: 'ORBITAL_REFINERY',
        code: 'REF',
        label: 'REF',
        sub: 'REFINERY',
        icon: <Boxes className="w-3.5 h-3.5 text-amber-400" />,
        accent: '#fbbf24',
        reqTechName: 'Civic Tier 2: Automated Ore Refining & Hydrocarbon Cracking',
      },
      {
        type: 'MILITARY_RESEARCH',
        code: 'MRS',
        label: 'MRS',
        sub: 'MIL LAB',
        icon: <Target className="w-3.5 h-3.5 text-rose-400" />,
        accent: '#f43f5e',
      },
      {
        type: 'CIVIC_RESEARCH',
        code: 'CRO',
        label: 'CRO',
        sub: 'CIV LAB',
        icon: <Cpu className="w-3.5 h-3.5 text-sky-400" />,
        accent: '#38bdf8',
      },
      {
        type: 'EXPANSION_CITADEL',
        code: 'EXC',
        label: 'EXC',
        sub: 'EXP LAB',
        icon: <Anchor className="w-3.5 h-3.5 text-emerald-400" />,
        accent: '#10b981',
      },
      {
        type: 'POST_SENSOR_SM',
        code: 'POST-S',
        label: 'POST-S',
        sub: 'SM SENSOR',
        icon: <Radio className="w-3.5 h-3.5 text-purple-400" />,
        accent: '#c084fc',
      },
      {
        type: 'POST_SENSOR_MD',
        code: 'POST-M',
        label: 'POST-M',
        sub: 'MD SENSOR',
        icon: <Radio className="w-3.5 h-3.5 text-purple-400" />,
        accent: '#c084fc',
      },
      {
        type: 'POST_SENSOR_LG',
        code: 'POST-L',
        label: 'POST-L',
        sub: 'LG SENSOR',
        icon: <Radio className="w-3.5 h-3.5 text-purple-400" />,
        accent: '#c084fc',
      },
    ];

    domesticSpecs.forEach((spec, idx) => {
      const def = STRUCTURE_CATALOG[spec.type];
      if (!def) return;
      const isSelected = buildStructureType === spec.type || placementController.getActiveBlueprint()?.type === spec.type;
      const isUnlocked = engine.isStructureUnlocked(spec.type);
      const canAfford = hqResources.metallic >= def.costMetallic && hqResources.organic >= def.costOrganic;
      const isLocked = !isUnlocked;

      const deficitM = Math.max(0, def.costMetallic - hqResources.metallic);
      const deficitO = Math.max(0, def.costOrganic - hqResources.organic);
      const hasResourceDeficit = !canAfford;

      const lockType: 'RESEARCH' | 'SLIPWAY' | 'RESOURCE' | 'NONE' = isLocked
        ? 'RESEARCH'
        : hasResourceDeficit
        ? 'RESOURCE'
        : 'NONE';

      let costText = '';
      if (hasResourceDeficit) {
        costText = `-${deficitM > 0 ? `${deficitM.toLocaleString()}M` : ''}${deficitO > 0 ? ` ${deficitO.toLocaleString()}O` : ''}`.trim();
      } else if (spec.code === 'MRS' || spec.code === 'CRO') {
        costText = 'M: 2,000 | O: 500';
      } else if (spec.code === 'EXC') {
        costText = 'M: 2,400 | O: 600';
      } else {
        costText = `M: ${def.costMetallic.toLocaleString()} | O: ${def.costOrganic.toLocaleString()}`;
      }

      slots.push(
        renderSlot(
          idx,
          `cmd-hq-dom-${spec.code.toLowerCase()}`,
          spec.label,
          spec.sub,
          spec.icon,
          () => {
            if (!isLocked) handleStructureSelect(spec.type);
          },
          undefined,
          {
            type: 'BUILD_STRUCTURE',
            payload: {
              structureType: spec.type,
              name: def.name,
              code: def.code,
              metallic: def.costMetallic,
              organic: def.costOrganic,
              description: def.description,
              trait: def.trait,
              mooring: def.mooring,
              capacity: def.capacity,
              isLocked,
              lockType,
              costText,
              hasResourceDeficit,
              lockReason: isLocked ? `Requires ${spec.reqTechName || 'Research Authorization'}` : undefined,
              rejectionReason: !canAfford
                ? `Deficit: ${deficitM > 0 ? `${Math.round(deficitM)} Met ` : ''}${deficitO > 0 ? `${Math.round(deficitO)} Org` : ''}`
                : undefined,
            },
          },
          {
            active: isSelected,
            disabled: isLocked || (!canAfford && !isSelected),
            badge: isLocked ? 'LOCK' : undefined,
            accentColor: spec.accent,
            lockType,
            costText,
            hasResourceDeficit,
          }
        )
      );
    });

    // Slots 8-12 (idx 8-12): Inactive empty slots
    for (let i = domesticSpecs.length; i < 13; i++) {
      slots.push(renderEmptySlot(i));
    }

    // Slot 14 (idx 13): [BACK] (Returns to HQ ROOT)
    slots.push(renderBackButton(13));

    return slots;
  };

  // -------------------------------------------------------------
  // SUB-PAGE: MILITARY STRUCTURES (HQ_MILITARY_STRUCTURES)
  // -------------------------------------------------------------
  const renderHQMilitaryStructures = () => {
    const slots: React.ReactNode[] = [];

    const handleStructureSelect = (sType: StructureType) => {
      const def = STRUCTURE_CATALOG[sType];
      if (!def) return;
      const isSelected = buildStructureType === sType || placementController.getActiveBlueprint()?.type === sType;
      if (isSelected) {
        placementController.clear();
        onSelectBuildStructure?.(null);
        engine.addLog('LOGISTICS', 'Placement mode canceled.', 'info');
      } else {
        placementController.setActiveBlueprint(def);
        onSelectBuildStructure?.(sType);
        engine.addLog(
          'LOGISTICS',
          `Blueprint active: [${def.name}]. Left-click inside any captured/allied planetary or asteroid gravity well to drop scaffold.`,
          'info'
        );
      }
    };

    // Row 1: Defensive Installations
    // Slot 1: Heavy Missile Battery ([MSL BAT]) - Moored orbital strike battery firing long-range salvos.
    // Slot 2: Point-Defense Platform ([PD PLAT]) - Dedicated screening platform firing intercept lasers and counter-missiles.
    // Slot 3: Fleet Repair Bay ([REP BAY]) - Moored logistics dock offering passive automated hull/armor repair to allied ships in the gravity well.
    const milSpecs: {
      type: StructureType;
      code: string;
      label: string;
      sub: string;
      icon: React.ReactNode;
      accent: string;
      reqTechName?: string;
    }[] = [
      {
        type: 'MISSILE_BATTERY',
        code: 'MSL_BAT',
        label: 'MSL BAT',
        sub: 'BATTERY',
        icon: <Crosshair className="w-3.5 h-3.5 text-rose-400" />,
        accent: '#f43f5e',
        reqTechName: 'Military Research: Tier 1 Point Defense & Defense Grid',
      },
      {
        type: 'PD_PLATFORM',
        code: 'PD_PLAT',
        label: 'PD PLAT',
        sub: 'SCREEN',
        icon: <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />,
        accent: '#38bdf8',
        reqTechName: 'Military Research: Tier 1 Point Defense & Defense Grid',
      },
      {
        type: 'REPAIR_BAY',
        code: 'REP_BAY',
        label: 'REP BAY',
        sub: 'LOGISTICS',
        icon: <Wrench className="w-3.5 h-3.5 text-emerald-300" />,
        accent: '#10b981',
      },
    ];

    milSpecs.forEach((spec, idx) => {
      const def = STRUCTURE_CATALOG[spec.type];
      if (!def) return;
      const isSelected = buildStructureType === spec.type || placementController.getActiveBlueprint()?.type === spec.type;
      const isUnlocked = engine.isStructureUnlocked(spec.type);
      const canAfford = hqResources.metallic >= def.costMetallic && hqResources.organic >= def.costOrganic;
      const isLocked = !isUnlocked;

      const deficitM = Math.max(0, def.costMetallic - hqResources.metallic);
      const deficitO = Math.max(0, def.costOrganic - hqResources.organic);

      slots.push(
        renderSlot(
          idx,
          `cmd-hq-mil-${spec.code.toLowerCase()}`,
          spec.label,
          spec.sub,
          spec.icon,
          () => {
            if (!isLocked) handleStructureSelect(spec.type);
          },
          undefined,
          {
            type: 'BUILD_STRUCTURE',
            payload: {
              structureType: spec.type,
              name: def.name,
              code: def.code,
              metallic: def.costMetallic,
              organic: def.costOrganic,
              description: def.description,
              trait: def.trait,
              mooring: def.mooring,
              capacity: def.capacity,
              isLocked,
              lockReason: isLocked ? `Requires ${spec.reqTechName || 'Military Research'}` : undefined,
              rejectionReason: !canAfford
                ? `Deficit: ${deficitM > 0 ? `${Math.round(deficitM)} Met ` : ''}${deficitO > 0 ? `${Math.round(deficitO)} Org` : ''}`
                : undefined,
            },
          },
          {
            active: isSelected,
            disabled: isLocked || (!canAfford && !isSelected),
            badge: isLocked ? 'LOCK' : undefined,
            accentColor: spec.accent,
          }
        )
      );
    });

    // Slots 4-7 (idx 3-6): Inactive empty slots
    for (let i = 3; i < 7; i++) {
      slots.push(renderEmptySlot(i));
    }

    // Row 2: Slots 8-13 (idx 7-12): Inactive empty slots
    for (let i = 7; i < 13; i++) {
      slots.push(renderEmptySlot(i));
    }

    // Slot 14 (idx 13): [BACK] (Returns to HQ ROOT)
    slots.push(renderBackButton(13));

    return slots;
  };

  // Backwards compatibility alias
  const renderHQBuildings = () => renderHQDomesticStructures();

  // -------------------------------------------------------------
  // SUB-PAGE: EXPANDED SHIPYARD INDEX (HQ_SHIPYARD_QUEUE)
  // -------------------------------------------------------------
  const renderHQShipyardQueue = () => {
    const slots: React.ReactNode[] = [];

    // Check if the currently selected ship is itself an orbital shipyard
    const isYardSelected = Boolean(
      selectedShip &&
        (selectedShip.role === 'SY_LIGHT' ||
          selectedShip.role === 'SY_MEDIUM' ||
          selectedShip.role === 'SY_HEAVY' ||
          (selectedShip as any).structureType === 'SY_LIGHT' ||
          (selectedShip as any).structureType === 'SY_MEDIUM' ||
          (selectedShip as any).structureType === 'SY_HEAVY')
    );

    // Identify yard tier if shipyard is selected
    const selectedYardRole = selectedShip?.role || (selectedShip as any)?.structureType || '';
    const isLightYard = isYardSelected && selectedYardRole === 'SY_LIGHT';
    const isMediumYard = isYardSelected && selectedYardRole === 'SY_MEDIUM';
    const isHeavyYard = isYardSelected && selectedYardRole === 'SY_HEAVY';

    // Local gravity well orbital shipyards lookup helper
    const getLocalShipyards = (): ShipEntity[] => {
      if (!selectedShip) return [];
      const hqWell = selectedShip.gravityWellBody;
      const hqPlanet = engine.findHostPlanetForPosition(selectedShip.pos);
      const hqPlanetName = hqWell || hqPlanet?.name;

      return (engine.ships ?? []).filter((s) => {
        if (s.faction !== 'FRIENDLY' || s.hullState === 'DESTROYED' || s.isUnderConstruction) return false;
        const role = s.role || (s as any).structureType || '';
        const isYard = role === 'SY_LIGHT' || role === 'SY_MEDIUM' || role === 'SY_HEAVY';
        if (!isYard) return false;

        if (hqPlanetName && (s.gravityWellBody === hqPlanetName || engine.findHostPlanetForPosition(s.pos)?.name === hqPlanetName)) {
          return true;
        }
        const dist = Math.hypot(s.pos.x - selectedShip.pos.x, s.pos.y - selectedShip.pos.y);
        return dist < 1800;
      });
    };

    const localYards = getLocalShipyards();

    // Helper to find best capable local yard for medium / heavy hulls
    const findCapableYard = (tierRequired: 'LIGHT' | 'MEDIUM' | 'HEAVY'): ShipEntity | null => {
      if (isYardSelected && selectedShip) return selectedShip;
      if (tierRequired === 'HEAVY') {
        return (
          localYards.find((s) => {
            const r = s.role || (s as any).structureType || '';
            return r === 'SY_HEAVY';
          }) || null
        );
      }
      if (tierRequired === 'MEDIUM') {
        return (
          localYards.find((s) => {
            const r = s.role || (s as any).structureType || '';
            return r === 'SY_HEAVY' || r === 'SY_MEDIUM';
          }) || null
        );
      }
      return localYards[0] || null;
    };

    interface CraftSpec {
      role: NavalUnitRole;
      code: string;
      name: string;
      tierCategory: 'LIGHT' | 'MEDIUM' | 'HEAVY';
      metallic: number;
      organic: number;
      buildTime: number;
      requiresTech: boolean;
      techCode?: string;
      techName?: string;
      icon: React.ReactNode;
      accent: string;
    }

    // Row 1: Light Screeners & Fleet Logistics (Slots 0-6)
    const row1Crafts: CraftSpec[] = [
      {
        role: 'FRIGATE',
        code: 'FG',
        name: 'Frigate',
        tierCategory: 'LIGHT',
        metallic: 200,
        organic: 45,
        buildTime: 10,
        requiresTech: false,
        icon: <Navigation className="w-3.5 h-3.5 text-cyan-300" />,
        accent: '#00f0ff',
      },
      {
        role: 'DESTROYER',
        code: 'DD',
        name: 'Destroyer',
        tierCategory: 'LIGHT',
        metallic: 800,
        organic: 230,
        buildTime: 18,
        requiresTech: true,
        techCode: 'DD',
        techName: 'Tier 1 Military Research: [Destroyer Hull Authorization]',
        icon: <Crosshair className="w-3.5 h-3.5 text-cyan-400" />,
        accent: '#22d3ee',
      },
      {
        role: 'MINER',
        code: 'MINER',
        name: 'Autonomous Miner',
        tierCategory: 'LIGHT',
        metallic: 1500,
        organic: 400,
        buildTime: 25,
        requiresTech: false,
        icon: <Boxes className="w-3.5 h-3.5 text-amber-400" />,
        accent: '#f59e0b',
      },
      {
        role: 'COLLIER',
        code: 'COL',
        name: 'Fleet Collier',
        tierCategory: 'MEDIUM',
        metallic: 3000,
        organic: 800,
        buildTime: 22,
        requiresTech: true,
        techCode: 'COL',
        techName: 'Civic Tier 3 / Military Tier 4 [Fleet Logistics Collier]',
        icon: <Package className="w-3.5 h-3.5 text-amber-300" />,
        accent: '#fbbf24',
      },
      {
        role: 'TANKER',
        code: 'TNK',
        name: 'Fuel Tanker',
        tierCategory: 'MEDIUM',
        metallic: 3200,
        organic: 900,
        buildTime: 22,
        requiresTech: true,
        techCode: 'TNK',
        techName: 'Civic Tier 3 / Military Tier 4 [Fleet Fuel Tanker]',
        icon: <Fuel className="w-3.5 h-3.5 text-orange-400" />,
        accent: '#fb923c',
      },
      {
        role: 'REPAIR',
        code: 'REP',
        name: 'Fleet Repair Ship',
        tierCategory: 'MEDIUM',
        metallic: 4000,
        organic: 1200,
        buildTime: 28,
        requiresTech: true,
        techCode: 'REP',
        techName: 'Civic Tier 3 / Military Tier 4 [Fleet Auxiliary Repair Ship]',
        icon: <Wrench className="w-3.5 h-3.5 text-emerald-400" />,
        accent: '#34d399',
      },
      {
        role: 'SCRAP',
        code: 'SCP',
        name: 'Salvager',
        tierCategory: 'MEDIUM',
        metallic: 2500,
        organic: 700,
        buildTime: 20,
        requiresTech: true,
        techCode: 'SCP',
        techName: 'Civic Tier 3 / Military Tier 4 [Autonomous Salvage Tender]',
        icon: <Trash2 className="w-3.5 h-3.5 text-lime-400" />,
        accent: '#a3e635',
      },
    ];

    // Row 2: Cruisers, Battleships, & Carriers (Slots 7-13)
    const row2Crafts: CraftSpec[] = [
      {
        role: 'LIGHT_CRUISER',
        code: 'CL',
        name: 'Light Cruiser',
        tierCategory: 'LIGHT',
        metallic: 2500,
        organic: 650,
        buildTime: 25,
        requiresTech: true,
        techCode: 'CL',
        techName: 'Tier 2 Military Research: [Light Cruiser Frame Certification]',
        icon: <Anchor className="w-3.5 h-3.5 text-blue-300" />,
        accent: '#60a5fa',
      },
      {
        role: 'HEAVY_CRUISER',
        code: 'CH',
        name: 'Heavy Cruiser',
        tierCategory: 'MEDIUM',
        metallic: 5000,
        organic: 1200,
        buildTime: 35,
        requiresTech: true,
        techCode: 'CH',
        techName: 'Tier 4 Military Research: [Heavy Cruiser Structural Validation]',
        icon: <Anchor className="w-3.5 h-3.5 text-blue-400" />,
        accent: '#3b82f6',
      },
      {
        role: 'BATTLECRUISER',
        code: 'BC',
        name: 'Battlecruiser',
        tierCategory: 'MEDIUM',
        metallic: 8500,
        organic: 1800,
        buildTime: 45,
        requiresTech: true,
        techCode: 'BC',
        techName: 'Tier 6 Military Research: [Battlecruiser Line Clearance]',
        icon: <Shield className="w-3.5 h-3.5 text-indigo-400" />,
        accent: '#818cf8',
      },
      {
        role: 'BATTLESHIP',
        code: 'BB',
        name: 'Battleship',
        tierCategory: 'HEAVY',
        metallic: 14000,
        organic: 3000,
        buildTime: 60,
        requiresTech: true,
        techCode: 'BB',
        techName: 'Tier 8 Military Research: [Battleship Armor Citadel Blueprint]',
        icon: <Target className="w-3.5 h-3.5 text-purple-400" />,
        accent: '#a855f7',
      },
      {
        role: 'DREADNOUGHT',
        code: 'DN',
        name: 'Dreadnought',
        tierCategory: 'HEAVY',
        metallic: 25000,
        organic: 5000,
        buildTime: 90,
        requiresTech: true,
        techCode: 'DN',
        techName: 'Tier 10 Military Research: [Dreadnought Strategic Protocol]',
        icon: <Zap className="w-3.5 h-3.5 text-rose-400" />,
        accent: '#f43f5e',
      },
      {
        role: 'CARRIER',
        code: 'CV',
        name: 'Fleet Carrier',
        tierCategory: 'HEAVY',
        metallic: 28000,
        organic: 6500,
        buildTime: 80,
        requiresTech: true,
        techCode: 'CV',
        techName: 'Tier 7 Military Research: [Fleet Carrier Aerospace Gantry]',
        icon: <Layers className="w-3.5 h-3.5 text-violet-400" />,
        accent: '#c084fc',
      },
    ];

    const superCarrierSpec: CraftSpec = {
      role: 'SUPER_CARRIER',
      code: 'CVF',
      name: 'Super-Carrier',
      tierCategory: 'HEAVY',
      metallic: 38000,
      organic: 9000,
      buildTime: 110,
      requiresTech: true,
      techCode: 'CVF',
      techName: 'Tier 9 Military Research: [Apex Super-Carrier Strategic Protocol]',
      icon: <Crown className="w-3.5 h-3.5 text-amber-400" />,
      accent: '#fbbf24',
    };

    const renderCraftSlot = (craft: CraftSpec, slotIdx: number) => {
      const isTechUnlocked = craft.requiresTech
        ? engine.isHullUnlocked(craft.techCode || craft.code)
        : true;

      let activeStation: ShipEntity | null = null;
      let isBuildable = false;
      let federationState: 'BUILDABLE' | 'NO_LOCAL_SHIPYARD' | 'TECH_LOCKED' = 'BUILDABLE';
      let federationStatusText = '';
      let lockReason = '';

      if (!isTechUnlocked) {
        federationState = 'TECH_LOCKED';
        federationStatusText = 'UNBUILDABLE: RESEARCH PREREQUISITE UNMET';
        lockReason = `UNBUILDABLE: RESEARCH PREREQUISITE UNMET (${craft.techName || craft.name})`;
        isBuildable = false;
        activeStation = isYardSelected ? selectedShip : null;
      } else if (isYardSelected && selectedShip) {
        activeStation = selectedShip;
        // Direct shipyard selection capability check
        if (craft.tierCategory === 'MEDIUM' && isLightYard) {
          federationState = 'NO_LOCAL_SHIPYARD';
          federationStatusText = 'UNBUILDABLE: REQUIRES MEDIUM OR HEAVY SHIPYARD SLIPWAY';
          lockReason = 'UNBUILDABLE: REQUIRES MEDIUM OR HEAVY SHIPYARD SLIPWAY';
          isBuildable = false;
        } else if (craft.tierCategory === 'HEAVY' && (isLightYard || isMediumYard)) {
          federationState = 'NO_LOCAL_SHIPYARD';
          federationStatusText = 'UNBUILDABLE: REQUIRES HEAVY SHIPYARD SLIPWAY';
          lockReason = 'UNBUILDABLE: REQUIRES HEAVY SHIPYARD SLIPWAY';
          isBuildable = false;
        } else {
          federationState = 'BUILDABLE';
          federationStatusText = `BUILDABLE AT ${selectedShip.name.toUpperCase()}`;
          lockReason = '';
          isBuildable = true;
        }
      } else {
        // At HQ Integrated Command
        if (craft.role === 'FRIGATE' || craft.role === 'DESTROYER' || craft.role === 'MINER') {
          activeStation = selectedShip;
          federationState = 'BUILDABLE';
          federationStatusText = 'BUILDABLE (HQ INTEGRATED SLIPWAY)';
          lockReason = '';
          isBuildable = true;
        } else if (craft.tierCategory === 'LIGHT') {
          const yard = findCapableYard('LIGHT');
          if (yard) {
            activeStation = yard;
            federationState = 'BUILDABLE';
            federationStatusText = `BUILDABLE (DISPATCH VIA ${yard.name.toUpperCase()})`;
            isBuildable = true;
          } else {
            federationState = 'NO_LOCAL_SHIPYARD';
            federationStatusText = 'UNBUILDABLE: REQUIRES DEDICATED SHIPYARD IN LOCAL WELL';
            lockReason = 'UNBUILDABLE: REQUIRES DEDICATED SHIPYARD IN LOCAL WELL';
            isBuildable = false;
          }
        } else if (craft.tierCategory === 'MEDIUM') {
          const yard = findCapableYard('MEDIUM');
          if (yard) {
            activeStation = yard;
            federationState = 'BUILDABLE';
            federationStatusText = `BUILDABLE (DISPATCH VIA ${yard.name.toUpperCase()})`;
            isBuildable = true;
          } else if (localYards.length > 0) {
            federationState = 'NO_LOCAL_SHIPYARD';
            federationStatusText = 'UNBUILDABLE: REQUIRES MEDIUM OR HEAVY SHIPYARD SLIPWAY';
            lockReason = 'UNBUILDABLE: REQUIRES MEDIUM OR HEAVY SHIPYARD SLIPWAY';
            isBuildable = false;
          } else {
            federationState = 'NO_LOCAL_SHIPYARD';
            federationStatusText = 'UNBUILDABLE: REQUIRES DEDICATED SHIPYARD IN LOCAL WELL';
            lockReason = 'UNBUILDABLE: REQUIRES DEDICATED SHIPYARD IN LOCAL WELL';
            isBuildable = false;
          }
        } else if (craft.tierCategory === 'HEAVY') {
          const yard = findCapableYard('HEAVY');
          if (yard) {
            activeStation = yard;
            federationState = 'BUILDABLE';
            federationStatusText = `BUILDABLE (DISPATCH VIA ${yard.name.toUpperCase()})`;
            isBuildable = true;
          } else if (localYards.length > 0) {
            federationState = 'NO_LOCAL_SHIPYARD';
            federationStatusText = 'UNBUILDABLE: REQUIRES HEAVY SHIPYARD SLIPWAY';
            lockReason = 'UNBUILDABLE: REQUIRES HEAVY SHIPYARD SLIPWAY';
            isBuildable = false;
          } else {
            federationState = 'NO_LOCAL_SHIPYARD';
            federationStatusText = 'UNBUILDABLE: REQUIRES DEDICATED SHIPYARD IN LOCAL WELL';
            lockReason = 'UNBUILDABLE: REQUIRES DEDICATED SHIPYARD IN LOCAL WELL';
            isBuildable = false;
          }
        }
      }

      const canAfford = hqResources.metallic >= craft.metallic && hqResources.organic >= craft.organic;
      const deficitM = Math.max(0, craft.metallic - hqResources.metallic);
      const deficitO = Math.max(0, craft.organic - hqResources.organic);
      const hasResourceDeficit = !canAfford;

      const lockType: 'RESEARCH' | 'SLIPWAY' | 'RESOURCE' | 'NONE' = !isTechUnlocked
        ? 'RESEARCH'
        : (!isBuildable || federationState === 'NO_LOCAL_SHIPYARD')
        ? 'SLIPWAY'
        : hasResourceDeficit
        ? 'RESOURCE'
        : 'NONE';

      const costText = hasResourceDeficit
        ? `-${deficitM > 0 ? `${deficitM}M` : ''}${deficitO > 0 ? ` ${deficitO}O` : ''}`.trim()
        : `${craft.metallic}M`;

      const targetStation = activeStation ?? (localYards[0] || selectedShip);
      const queueItems = targetStation
        ? (targetStation.productionQueue ?? []).filter((q) => q.unitRole === craft.role)
        : [];
      const queueCount = queueItems.length;

      const badge = !isTechUnlocked
        ? 'LOCK'
        : federationStatusText.includes('REQUIRES')
        ? (federationStatusText.includes('SLIPWAY') ? 'SLIPWAY' : 'REQ SY')
        : queueCount > 0
        ? `x${queueCount}`
        : undefined;

      return renderSlot(
        slotIdx,
        `cmd-hq-ship-${craft.code.toLowerCase()}`,
        craft.code,
        craft.name.toUpperCase().slice(0, 8),
        craft.icon,
        () => {
          if (isBuildable && activeStation) {
            engine.queueBuildOrder(activeStation.id, craft.role);
            if (activeStation.id !== selectedShip?.id) {
              engine.addLog(
                'LOGISTICS',
                `Dispatched ${craft.name} [${craft.code}] order to local orbital shipyard ${activeStation.name}.`,
                'info'
              );
            }
          } else if (!isBuildable) {
            engine.addLog('LOGISTICS', `Fabrication Order Rejected: ${lockReason || federationStatusText}`, 'warn');
          }
        },
        (e) => {
          if (isBuildable && activeStation && queueCount > 0) {
            const last = queueItems[queueItems.length - 1];
            if (last) engine.cancelBuildOrder(activeStation.id, last.id);
          }
        },
        {
          type: 'BUILD_SHIP',
          payload: {
            role: craft.role,
            code: craft.code,
            name: craft.name,
            metallic: craft.metallic,
            organic: craft.organic,
            deficitM,
            deficitO,
            hasResourceDeficit,
            lockType,
            buildTime: craft.buildTime,
            requiresShipyard: craft.tierCategory !== 'LIGHT' || craft.role === 'LIGHT_CRUISER',
            isLocked: !isBuildable,
            lockReason,
            federationState,
            federationStatusText,
            selectedStation: targetStation,
            queueCount,
            description: `${craft.name} [${craft.code}]. ${federationStatusText}. Left-click to queue fabrication, right-click to cancel order.`,
          },
        },
        {
          badge,
          active: queueCount > 0,
          disabled: !isBuildable || (!canAfford && queueCount === 0),
          accentColor: isBuildable ? craft.accent : '#f43f5e',
          lockType,
          costText,
          hasResourceDeficit,
        }
      );
    };

    // Render Row 1: Light Screeners & Fleet Logistics (slots 0-6)
    row1Crafts.forEach((craft, idx) => {
      slots.push(renderCraftSlot(craft, idx));
    });

    // Render Row 2: Cruisers, Battleships, Carriers (slots 7-12)
    row2Crafts.forEach((craft, idx) => {
      slots.push(renderCraftSlot(craft, 7 + idx));
    });

    // Slot 14 (idx 13):
    // If a shipyard is directly selected, expose Super-Carrier (CVF).
    // If at HQ, provide [BACK] button to return to HQ Root.
    if (isYardSelected) {
      slots.push(renderCraftSlot(superCarrierSpec, 13));
    } else {
      slots.push(renderBackButton(13));
    }

    return slots;
  };

  // Backwards compatibility alias
  const renderHQShipyard = () => renderHQShipyardQueue();

  // Warship Command Deck: Unified 4 core slots in ROOT, remaining 10 slots inactive
  const renderWarshipRoot = () => {
    const slots = [];
    if (!selectedShip) return slots;

    // Slot 1: Movement ([MOVE]) - Shortcut [M]
    slots.push(
      renderSlot(
        0,
        'cmd-warship-slot-move',
        'MOVE',
        moveModeActive ? 'TARGET' : 'PLOT',
        <Navigation className="w-3.5 h-3.5 text-cyan-300" />,
        onToggleMoveMode,
        undefined,
        {
          type: 'ORDER',
          payload: {
            code: 'ORD-MOV',
            title: "Tactical Movement Spline ('M')",
            description: 'Activates canvas waypoint selection mode. Left-clicking empty space or targets plots a kinematic waypoint spline.',
          },
        },
        { active: moveModeActive, shortcut: '[M]' }
      )
    );

    // Slot 2: Tactical Stance ([STANCE]) - Single-click radio cycle: PASSIVE -> DEFEND -> FIGHT
    const currentStance = selectedShip.combatStance || 'DEFENSIVE';
    const stanceDisplay =
      currentStance === 'PASSIVE'
        ? 'PASSIVE'
        : currentStance === 'DEFENSIVE'
        ? 'DEFEND'
        : 'FIGHT';

    const stanceIcon =
      currentStance === 'PASSIVE' ? (
        <ShieldOff className="w-3.5 h-3.5 text-emerald-400" />
      ) : currentStance === 'DEFENSIVE' ? (
        <Shield className="w-3.5 h-3.5 text-cyan-300" />
      ) : (
        <Swords className="w-3.5 h-3.5 text-rose-400" />
      );

    slots.push(
      renderSlot(
        1,
        'cmd-warship-slot-stance',
        'STANCE',
        stanceDisplay,
        stanceIcon,
        () => {
          const nextStance: CombatStance =
            currentStance === 'PASSIVE'
              ? 'DEFENSIVE'
              : currentStance === 'DEFENSIVE'
              ? 'AGGRESSIVE'
              : 'PASSIVE';
          engine.setCombatStance(selectedShip.id, nextStance);
        },
        undefined,
        {
          type: 'ORDER',
          payload: {
            code: 'ORD-STC',
            title: `Tactical Stance: ${stanceDisplay}`,
            description:
              'Cycle operational postures: 1. PASSIVE (Hold fire; batteries and PD stand down) -> 2. DEFEND (Return fire only against attackers) -> 3. FIGHT (Auto-target all hostiles in missile or laser envelope).',
          },
        },
        { badge: stanceDisplay, shortcut: '[A]' }
      )
    );

    // Slot 3: Jump Drive ([JUMP]) - Shortcut [J]
    slots.push(
      renderSlot(
        2,
        'cmd-warship-slot-jump',
        'JUMP',
        jumpModeActive ? 'TARGET' : 'FTL DRIVE',
        <Zap className="w-3.5 h-3.5 text-purple-400" />,
        () => {
          if (onToggleJumpMode) {
            onToggleJumpMode();
          }
        },
        undefined,
        {
          type: 'ORDER',
          payload: {
            code: 'ORD-JMP',
            title: "Micro-Jump Drive ('J')",
            description:
              'Engages the micro-jump spooling targeting reticle. Left-clicking valid coordinates executes the spool-up charge sequence and tactical FTL displacement.',
          },
        },
        { active: jumpModeActive, shortcut: '[J]' }
      )
    );

    // Slot 4: Fleet Assignment Menu ([JOIN FLEET])
    const currentFleetId = engine.getShipFleetId(selectedShip.id);
    slots.push(
      renderSlot(
        3,
        'cmd-warship-slot-join-fleet',
        'JOIN FLEET',
        currentFleetId > 0 ? `FLEET ${currentFleetId}` : 'NONE',
        <Users className="w-3.5 h-3.5 text-amber-400" />,
        () => {
          navigateTo('WARSHIP_FLEET_ASSIGN');
        },
        undefined,
        {
          type: 'ORDER',
          payload: {
            code: 'NAV-FLT',
            title: 'Fleet Assignment Menu',
            description:
              'Transitions console into fleet assignment sub-page. Assign vessel to Fleet Groups 1-12 or detach to independent unit status.',
          },
        },
        { badge: currentFleetId > 0 ? `FLT ${currentFleetId}` : undefined }
      )
    );

    // Slots 5 through 14: Inactive empty slots
    for (let i = 4; i < 14; i++) {
      slots.push(renderEmptySlot(i));
    }

    return slots;
  };

  // Fleet Assignment Sub-page: 14-slot 2x7 layout
  const renderWarshipFleetAssign = () => {
    const slots = [];
    if (!selectedShip) return slots;

    const currentFleetId = engine.getShipFleetId(selectedShip.id);

    // Slot 1 (index 0): [FLEET 0: NONE] (Detaches ship from any fleet group, resetting it to independent unit status)
    slots.push(
      renderSlot(
        0,
        'cmd-warship-fleet-none',
        'FLEET 0',
        'NONE',
        <Anchor className="w-3.5 h-3.5 text-slate-300" />,
        () => {
          engine.assignShipToFleet(selectedShip.id, 0);
        },
        undefined,
        {
          type: 'ORDER',
          payload: {
            code: 'FLT-0',
            title: 'Detach from Fleet (Independent)',
            description: 'Detaches ship from all fleet groups, resetting vessel to independent unit status.',
          },
        },
        {
          active: currentFleetId === 0,
          badge: currentFleetId === 0 ? 'ACTIVE' : undefined,
          shortcut: '[0]',
        }
      )
    );

    // Slots 2 through 13 (indices 1 through 12): [FLEET 1] through [FLEET 12]
    for (let fId = 1; fId <= 12; fId++) {
      const group = engine.fleetGroups.get(fId);
      const memberCount = group?.shipIds.length ?? 0;
      const isAssigned = currentFleetId === fId;

      slots.push(
        renderSlot(
          fId,
          `cmd-warship-fleet-${fId}`,
          `FLEET ${fId}`,
          memberCount > 0 ? `${memberCount} SHIPS` : 'EMPTY',
          <Users
            className={`w-3.5 h-3.5 ${
              isAssigned ? 'text-emerald-400' : memberCount > 0 ? 'text-cyan-300' : 'text-slate-500'
            }`}
          />,
          () => {
            engine.assignShipToFleet(selectedShip.id, fId);
          },
          undefined,
          {
            type: 'ORDER',
            payload: {
              code: `FLT-${fId}`,
              title: `Assign to Fleet Group [${fId}]`,
              description: `Assigns vessel to Fleet Group [${fId}]. The ship automatically adopts the fleet's current formation spacing, stance, and speed mode.`,
            },
          },
          {
            active: isAssigned,
            badge: isAssigned ? 'JOINED' : memberCount > 0 ? `${memberCount}` : undefined,
            shortcut: fId <= 9 ? `[${fId}]` : undefined,
          }
        )
      );
    }

    // Slot 14 (index 13): [BACK] (Returns to the primary 4-button warship deck)
    slots.push(
      renderSlot(
        13,
        'cmd-warship-fleet-back',
        'BACK',
        'RETURN',
        <ChevronLeft className="w-3.5 h-3.5 text-rose-400" />,
        navigateBack,
        undefined,
        {
          type: 'ORDER',
          payload: {
            code: 'NAV-BCK',
            title: "Back ('ESC')",
            description: 'Returns to the primary 4-button warship command deck.',
          },
        },
        { shortcut: '[ESC]' }
      )
    );

    return slots;
  };

  const renderFleetRoot = () => {
    const slots = [];
    const fltStance = flagship?.combatStance || 'DEFENSIVE';

    // 1. Slot 1 (Fleet Stance): Radio cycle PASSIVE, DEFENSIVE, AGGRESSIVE
    slots.push(
      renderSlot(
        0,
        'cmd-flt-slot-stance',
        'FLT STANCE',
        fltStance.slice(0, 4),
        <Shield className="w-4 h-4 text-cyan-300" />,
        () => {
          const next = fltStance === 'PASSIVE' ? 'DEFENSIVE' : fltStance === 'DEFENSIVE' ? 'AGGRESSIVE' : 'PASSIVE';
          engine.setFleetCombatStance(next);
        },
        undefined,
        {
          type: 'STANCE',
          payload: { code: 'FLT-STANCE', title: `Fleet Stance [${fltStance}]`, description: 'Radio cycle between PASSIVE, DEFENSIVE, AGGRESSIVE. Propagates instantly to all selected vessels.' },
        },
        { accentColor: '#38bdf8' }
      )
    );

    // 2. Slot 2 (Fleet Move - 'M'): Activates formation right-click navigation
    slots.push(
      renderSlot(
        1,
        'cmd-flt-slot-move',
        'FLEET MOVE',
        moveModeActive ? 'TARGETING' : 'READY',
        <Navigation className="w-3.5 h-3.5 text-cyan-400" />,
        onToggleMoveMode,
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'FLT-MOV', title: "Fleet Move ('M')", description: 'Activates formation right-click navigation and Hermite spline coordinates.' },
        },
        { active: moveModeActive }
      )
    );

    // 3. Slot 3 (Formation Spacing): Cycles through [FORMATION: TIGHT], [FORMATION: CLOSE], and [FORMATION: LOOSE]
    const density = engine.formationDensity;
    slots.push(
      renderSlot(
        2,
        'cmd-flt-slot-density',
        'SPACING',
        density,
        <Layers className="w-3.5 h-3.5 text-amber-400" />,
        () => engine.cycleFleetFormationDensity(),
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'FLT-SPC', title: `Formation Spacing [FORMATION: ${density}]`, description: 'Cycles through [FORMATION: TIGHT], [FORMATION: CLOSE], and [FORMATION: LOOSE] offset buffers.' },
        }
      )
    );

    // 4. Slot 4 (Speed Cohesion): Toggles between [MOVE: UNIT COHESION] and [MOVE: MAX SPEED]
    const cohesion = engine.movementCohesion;
    slots.push(
      renderSlot(
        3,
        'cmd-flt-slot-cohesion',
        'SPEED MODE',
        cohesion === 'UNIT' ? 'UNIT' : 'MAX SPD',
        <Boxes className="w-3.5 h-3.5 text-emerald-400" />,
        () => engine.toggleFleetMovementCohesion(),
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'FLT-SPD', title: `Speed Cohesion [${cohesion === 'UNIT' ? 'MOVE: UNIT COHESION' : 'MOVE: MAX SPEED'}]`, description: 'Toggles between [MOVE: UNIT COHESION] (throttling to slowest vessel) and [MOVE: MAX SPEED].' },
        }
      )
    );

    // 5. Slot 5 (Fleet PD Setting): Cycles Point-Defense posture for all ships (AUTO-ENGAGE, CONSERVE/STANDBY, FOCUS INBOUND TSUNAMI)
    const pdPosture = engine.fleetPdPosture;
    const pdLabel = pdPosture === 'AUTO' ? 'AUTO' : pdPosture === 'CONSERVE' ? 'CONSERVE' : 'FOCUS';
    slots.push(
      renderSlot(
        4,
        'cmd-flt-slot-pd',
        'FLEET PD',
        pdLabel,
        <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />,
        () => engine.cycleFleetPdPosture(),
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'FLT-PD', title: `Fleet Point-Defense Setting [${pdPosture}]`, description: 'Cycles Point-Defense posture for all ships (AUTO-ENGAGE, CONSERVE/STANDBY, FOCUS INBOUND TSUNAMI).' },
        }
      )
    );

    // 6. Slot 6 (Synchronized Volley): Fires staggered or simultaneous missile ripples from all armed ships
    slots.push(
      renderSlot(
        5,
        'cmd-flt-slot-volley',
        'SYNC VOLLEY',
        'FIRE',
        <Crosshair className="w-3.5 h-3.5 text-rose-400" />,
        () => engine.fireFleetSynchronizedSalvo(),
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'FLT-VLY', title: 'Synchronized Volley', description: 'Fires staggered or simultaneous missile ripples from all armed ships in the formation.' },
        }
      )
    );

    // 7. Slot 7 (Screen Reposition): Swaps carrier/parasite screens between forward vanguard and rearguard
    const isVanguard = engine.fleetScreenVanguard;
    slots.push(
      renderSlot(
        6,
        'cmd-flt-slot-screen',
        'SCREEN POS',
        isVanguard ? 'VANGUARD' : 'REARGUARD',
        <Swords className="w-3.5 h-3.5 text-rose-400" />,
        () => engine.toggleFleetScreenPosition(),
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'FLT-SCR', title: 'Screen Reposition', description: 'Swaps carrier/parasite screens between forward vanguard and defensive rearguard.' },
        }
      )
    );

    // 8. Slot 8 (Form Fleet Action): Commits the current multi-ship selection to a permanent quick-select numbered Fleet Group
    slots.push(
      renderSlot(
        7,
        'cmd-flt-slot-form-fleet',
        'FORM FLEET',
        'BIND (1-9)',
        <Users className="w-3.5 h-3.5 text-cyan-300" />,
        () => engine.formFleetGroup(selectedShips.map((s) => s.id)),
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'FLT-FORM', title: 'Form Fleet Action', description: 'Commits the current multi-ship selection to a permanent quick-select numbered Fleet Group (Slots 1–9).' },
        },
        { accentColor: '#00f0ff' }
      )
    );

    // ROW 2: Complementary Fleet Actions (Slots 9-14)
    // Slot 9: Focus Fire
    slots.push(
      renderSlot(
        8,
        'cmd-flt-slot-focus',
        'FOCUS FIRE',
        'PRIMARY',
        <Target className="w-3.5 h-3.5 text-rose-400" />,
        () => engine.addLog('COMBAT', 'Fleet focus-fire synchronized on designated contact.', 'info'),
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'FLT-FOC', title: 'Synchronized Focus Fire', description: 'Directs all available tube salvos to converge on the flagship primary target.' },
        }
      )
    );

    // Slot 10: Auto-Fire All
    slots.push(
      renderSlot(
        9,
        'cmd-flt-slot-autofire',
        'AUTO-FIRE',
        'ALL HULLS',
        <Flame className="w-3.5 h-3.5 text-emerald-400" />,
        () => {
          const anyAuto = selectedShips.some((s) => s.autoFire);
          selectedShips.forEach((s) => {
            s.autoFire = !anyAuto;
          });
        },
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'FLT-ATF', title: 'Fleet Auto-Fire Toggle', description: 'Enables or disables autonomous fire-control computers for the entire fleet.' },
        }
      )
    );

    // Slot 11: Fleet All Stop
    slots.push(
      renderSlot(
        10,
        'cmd-flt-slot-stop',
        'ALL STOP',
        'HALT',
        <Square className="w-3.5 h-3.5 text-rose-400" />,
        () => {
          selectedShips.forEach((s) => {
            s.splineActive = false;
            s.velocity = { x: 0, y: 0 };
          });
          engine.addLog('NAV', 'Fleet executed simultaneous all-stop order.', 'info');
        },
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'FLT-STP', title: 'Battlegroup All-Stop', description: 'Cancels all active splines across all selected vessels.' },
        }
      )
    );

    // Slot 12: Synchronized Jump Spool
    slots.push(
      renderSlot(
        11,
        'cmd-flt-slot-jump',
        'SYNC JUMP',
        'FTL',
        <Zap className="w-3.5 h-3.5 text-purple-400" />,
        () => onToggleJumpMode?.(),
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'FLT-JMP', title: 'Fleet Synchronized Jump', description: 'Spools jump drives simultaneously across all battlegroup ships.' },
        }
      )
    );

    // Slot 13: Select Flagship Solo
    slots.push(
      renderSlot(
        12,
        'cmd-flt-slot-flagship',
        'FLAGSHIP',
        'SOLO',
        <Anchor className="w-3.5 h-3.5 text-amber-400" />,
        () => {
          if (flagship) onSelectShip(flagship.id);
        },
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'FLT-FLG', title: 'Isolate Flagship', description: 'Drops multi-selection to focus solely on the designated command ship.' },
        }
      )
    );

    // Slot 14: Disband Selection
    slots.push(
      renderSlot(
        13,
        'cmd-flt-slot-disband',
        'DESELECT',
        'CLEAR',
        <RotateCcw className="w-3.5 h-3.5 text-slate-400" />,
        () => {
          if (selectedShips[0]) onSelectShip(selectedShips[0].id);
        },
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'FLT-CLR', title: 'Deselect Battlegroup', description: 'Reverts selection to a single vessel.' },
        }
      )
    );

    return slots;
  };

  // -------------------------------------------------------------
  // Builder Craft Pages: ROOT, INFRASTRUCTURE, DEFENSES
  // -------------------------------------------------------------
  const renderBuilderRoot = () => {
    const slots = [];
    const builder = selectedShip;
    const metallicStored = builder?.cargoMetallic ?? 5000;
    const organicStored = builder?.cargoOrganic ?? 5000;

    // ROW 1: Navigation, Categories & Primary Controls
    // Slot 0: Move Waypoint Toggle
    slots.push(
      renderSlot(
        0,
        'cmd-bld-move',
        'WAYPOINT',
        'MOVE',
        <Navigation className="w-4 h-4 text-cyan-300" />,
        () => onToggleMoveMode(),
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'NAV-MOVE', title: 'Tactical Waypoint Navigation', description: 'Plot a precise navigation waypoint for the fabrication craft.' },
        },
        { active: moveModeActive, accentColor: '#38bdf8' }
      )
    );

    // Slot 1: Infrastructure Subnav
    slots.push(
      renderSlot(
        1,
        'cmd-bld-subnav-infra',
        'INFRA',
        'FACILITIES',
        <Factory className="w-4 h-4 text-amber-400" />,
        () => navigateTo('BUILDER_INFRASTRUCTURE'),
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'FAB-INF', title: 'Orbital Infrastructure', description: 'Access shipyards, refineries, and repair bay fabrication blueprints.' },
        },
        { accentColor: '#f59e0b' }
      )
    );

    // Slot 2: Defenses Subnav
    slots.push(
      renderSlot(
        2,
        'cmd-bld-subnav-def',
        'DEFENSE',
        'PLATFORMS',
        <Shield className="w-4 h-4 text-emerald-400" />,
        () => navigateTo('BUILDER_DEFENSES'),
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'FAB-DEF', title: 'Defensive Platforms', description: 'Deploy automated missile batteries and point defense sentinels.' },
        },
        { accentColor: '#10b981' }
      )
    );

    // Slot 3: Hold Position / Stop Spline
    slots.push(
      renderSlot(
        3,
        'cmd-bld-stop',
        'HOLD',
        'STOP',
        <Square className="w-4 h-4 text-rose-400" />,
        () => {
          if (builder) {
            builder.splineActive = false;
            builder.velocity = { x: 0, y: 0 };
            engine.addLog('BUILDER', `${builder.name}: Propulsion cut, station-keeping hold engaged.`, 'info');
          }
        },
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'HLD-POS', title: 'Station-Keeping Hold', description: 'Cancel active spline burns and bring the builder to a full relative halt.' },
        },
        { accentColor: '#f43f5e' }
      )
    );

    // Slot 4: Return to HQ
    slots.push(
      renderSlot(
        4,
        'cmd-bld-return-hq',
        'RETURN',
        'HQ DOCK',
        <Anchor className="w-4 h-4 text-cyan-400" />,
        () => {
          const hq = engine.getHQ();
          if (builder && hq) {
            engine.launchBuilderTransitSpline(builder, hq.pos);
            engine.addLog('BUILDER', `${builder.name}: Commencing return transit to Aegis-IV HQ Citadel mooring.`, 'info');
          }
        },
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'RTN-HQ', title: 'Return to HQ', description: 'Plot autonomous Hermite transit vector to Aegis-IV Citadel mooring slip.' },
        },
        { accentColor: '#00f0ff' }
      )
    );

    // Slot 5: Resupply at HQ
    const hq = engine.getHQ();
    const distToHq = (builder && hq) ? Math.hypot(builder.pos.x - hq.pos.x, builder.pos.y - hq.pos.y) : Infinity;
    const canResupply = distToHq <= 260.0;
    slots.push(
      renderSlot(
        5,
        'cmd-bld-resupply',
        'RESUPPLY',
        'CARGO',
        <Boxes className="w-4 h-4 text-amber-300" />,
        () => {
          if (builder) {
            if (canResupply) {
              builder.cargoMetallic = 5000;
              builder.cargoOrganic = 5000;
              engine.addLog('BUILDER', `${builder.name}: Cargo hoppers replenished to maximum (5,000 M / 5,000 O).`, 'info');
            } else {
              engine.addLog('BUILDER', `${builder.name}: Unable to resupply. Vessel must be within 260km of HQ Citadel.`, 'warn');
            }
          }
        },
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'RESUPPLY', title: 'Replenish Fabrication Stock', description: canResupply ? 'Transfer raw metals and polymers from HQ reserves.' : 'OutOfRange: Return within 260km of HQ.' },
        },
        { disabled: !canResupply, accentColor: '#fbbf24' }
      )
    );

    // Slot 6: Clear Active Ghost Placement
    const hasGhost = buildStructureType !== null;
    slots.push(
      renderSlot(
        6,
        'cmd-bld-clear-ghost',
        'CLEAR',
        'GHOST',
        <RotateCcw className="w-4 h-4 text-slate-400" />,
        () => {
          onSelectBuildStructure?.(null);
          engine.addLog('BUILDER', 'Ghost placement cancelled. Target vector cleared.', 'info');
        },
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'CLR-GHOST', title: 'Cancel Placement Ghost', description: 'Dismiss current blueprint projection from the tactical overlay.' },
        },
        { disabled: !hasGhost, accentColor: '#94a3b8' }
      )
    );

    // ROW 2: Telemetry & Fabrication Diagnostics
    // Slot 7: Metallic Stored
    slots.push(
      renderSlot(
        7,
        'cmd-bld-stat-met',
        `${Math.round(metallicStored)}`,
        'METALS',
        <Boxes className="w-4 h-4 text-amber-400" />,
        undefined,
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'CARGO-M', title: 'Alloy Stores', description: `Stored metallic alloys: ${Math.round(metallicStored)} / 5,000. Used for hull frames and platforms.` },
        },
        { accentColor: '#f59e0b' }
      )
    );

    // Slot 8: Organic Stored
    slots.push(
      renderSlot(
        8,
        'cmd-bld-stat-org',
        `${Math.round(organicStored)}`,
        'ORGANIC',
        <Boxes className="w-4 h-4 text-emerald-400" />,
        undefined,
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'CARGO-O', title: 'Polymer Stores', description: `Stored organic polymers: ${Math.round(organicStored)} / 5,000. Used for electronics and life support.` },
        },
        { accentColor: '#10b981' }
      )
    );

    // Slot 9: Drones Status
    slots.push(
      renderSlot(
        9,
        'cmd-bld-drones',
        'DRONES',
        'ACTIVE',
        <Cpu className="w-4 h-4 text-cyan-300" />,
        () => engine.addLog('BUILDER', 'Assembly drones on standby in internal bays.', 'info'),
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'DRONES', title: 'Welding Drone Swarm', description: 'Automated micro-welding drones operating at peak efficiency.' },
        },
        { accentColor: '#38bdf8' }
      )
    );

    const handleBuilderStructureSelect = (sType: StructureType) => {
      const def = STRUCTURE_CATALOG[sType];
      if (!def) return;
      const isSelected = buildStructureType === sType || placementController.getActiveBlueprint()?.type === sType;
      if (isSelected) {
        placementController.clear();
        onSelectBuildStructure?.(null);
        engine.addLog('LOGISTICS', 'Placement mode canceled.', 'info');
      } else {
        placementController.setActiveBlueprint(def);
        onSelectBuildStructure?.(sType);
        engine.addLog(
          'LOGISTICS',
          `Blueprint active: [${def.name}]. Left-click inside any active planetary, lunar, or asteroid gravity well to drop scaffold.`,
          'info'
        );
      }
    };

    // Slot 10: Military Research Station [MRS]
    const mrsDef = STRUCTURE_CATALOG['MILITARY_RESEARCH'];
    const isMrsSelected = buildStructureType === 'MILITARY_RESEARCH' || placementController.getActiveBlueprint()?.type === 'MILITARY_RESEARCH';
    const isMrsUnlocked = engine.isStructureUnlocked('MILITARY_RESEARCH');
    const canAffordMrs = hqResources.metallic >= mrsDef.costMetallic && hqResources.organic >= mrsDef.costOrganic;
    const deficitMrsM = Math.max(0, mrsDef.costMetallic - hqResources.metallic);
    const deficitMrsO = Math.max(0, mrsDef.costOrganic - hqResources.organic);
    const hasMrsDeficit = !canAffordMrs;
    const lockTypeMrs: 'RESEARCH' | 'SLIPWAY' | 'RESOURCE' | 'NONE' = !isMrsUnlocked
      ? 'RESEARCH'
      : hasMrsDeficit
      ? 'RESOURCE'
      : 'NONE';
    const costTextMrs = hasMrsDeficit
      ? `-${deficitMrsM > 0 ? `${deficitMrsM}M` : ''}${deficitMrsO > 0 ? ` ${deficitMrsO}O` : ''}`.trim()
      : 'M: 2,000 | O: 500';

    slots.push(
      renderSlot(
        10,
        'cmd-bld-mrs',
        'MRS',
        'MILITARY',
        <Target className="w-4 h-4 text-rose-400" />,
        () => handleBuilderStructureSelect('MILITARY_RESEARCH'),
        undefined,
        {
          type: 'BUILD_STRUCTURE',
          payload: {
            structureType: 'MILITARY_RESEARCH',
            name: mrsDef.name,
            code: mrsDef.code,
            metallic: mrsDef.costMetallic,
            organic: mrsDef.costOrganic,
            description: mrsDef.description,
            trait: mrsDef.trait,
            mooring: mrsDef.mooring || 'Requires placement inside an active planetary, lunar, or tight asteroid cluster gravity well.',
            capacity: mrsDef.capacity || '+1 Military Lab tier capacity.',
            isLocked: !isMrsUnlocked,
            lockType: lockTypeMrs,
            costText: costTextMrs,
            hasResourceDeficit: hasMrsDeficit,
            specs: {
              hull: mrsDef.hullMax,
              shield: mrsDef.shieldHpMax,
              capacity: '+1 Military Lab tier capacity.',
            },
            rejectionReason: !canAffordMrs
              ? `Deficit: ${deficitMrsM > 0 ? `${Math.round(deficitMrsM)} Met ` : ''}${deficitMrsO > 0 ? `${Math.round(deficitMrsO)} Org` : ''}`
              : undefined,
          },
        },
        {
          active: isMrsSelected,
          disabled: !isMrsUnlocked || (!canAffordMrs && !isMrsSelected),
          badge: !isMrsUnlocked ? 'LOCK' : undefined,
          accentColor: isMrsSelected ? '#38bdf8' : '#f43f5e',
          lockType: lockTypeMrs,
          costText: costTextMrs,
          hasResourceDeficit: hasMrsDeficit,
        }
      )
    );

    // Slot 11: Civic Research Outpost [CRO]
    const croDef = STRUCTURE_CATALOG['CIVIC_RESEARCH'];
    const isCroSelected = buildStructureType === 'CIVIC_RESEARCH' || placementController.getActiveBlueprint()?.type === 'CIVIC_RESEARCH';
    const isCroUnlocked = engine.isStructureUnlocked('CIVIC_RESEARCH');
    const canAffordCro = hqResources.metallic >= croDef.costMetallic && hqResources.organic >= croDef.costOrganic;
    const deficitCroM = Math.max(0, croDef.costMetallic - hqResources.metallic);
    const deficitCroO = Math.max(0, croDef.costOrganic - hqResources.organic);
    const hasCroDeficit = !canAffordCro;
    const lockTypeCro: 'RESEARCH' | 'SLIPWAY' | 'RESOURCE' | 'NONE' = !isCroUnlocked
      ? 'RESEARCH'
      : hasCroDeficit
      ? 'RESOURCE'
      : 'NONE';
    const costTextCro = hasCroDeficit
      ? `-${deficitCroM > 0 ? `${deficitCroM}M` : ''}${deficitCroO > 0 ? ` ${deficitCroO}O` : ''}`.trim()
      : 'M: 2,000 | O: 500';

    slots.push(
      renderSlot(
        11,
        'cmd-bld-cro',
        'CRO',
        'CIVIC',
        <Cpu className="w-4 h-4 text-sky-400" />,
        () => handleBuilderStructureSelect('CIVIC_RESEARCH'),
        undefined,
        {
          type: 'BUILD_STRUCTURE',
          payload: {
            structureType: 'CIVIC_RESEARCH',
            name: croDef.name,
            code: croDef.code,
            metallic: croDef.costMetallic,
            organic: croDef.costOrganic,
            description: croDef.description,
            trait: croDef.trait,
            mooring: croDef.mooring || 'Requires placement inside an active gravity well.',
            capacity: croDef.capacity || '+1 Civic Lab tier capacity.',
            isLocked: !isCroUnlocked,
            lockType: lockTypeCro,
            costText: costTextCro,
            hasResourceDeficit: hasCroDeficit,
            specs: {
              hull: croDef.hullMax,
              shield: croDef.shieldHpMax,
              capacity: '+1 Civic Lab tier capacity.',
            },
            rejectionReason: !canAffordCro
              ? `Deficit: ${deficitCroM > 0 ? `${Math.round(deficitCroM)} Met ` : ''}${deficitCroO > 0 ? `${Math.round(deficitCroO)} Org` : ''}`
              : undefined,
          },
        },
        {
          active: isCroSelected,
          disabled: !isCroUnlocked || (!canAffordCro && !isCroSelected),
          badge: !isCroUnlocked ? 'LOCK' : undefined,
          accentColor: isCroSelected ? '#38bdf8' : '#0284c7',
          lockType: lockTypeCro,
          costText: costTextCro,
          hasResourceDeficit: hasCroDeficit,
        }
      )
    );

    // Slot 12: Expansion Citadel [EXC]
    const excDef = STRUCTURE_CATALOG['EXPANSION_CITADEL'];
    const isExcSelected = buildStructureType === 'EXPANSION_CITADEL' || placementController.getActiveBlueprint()?.type === 'EXPANSION_CITADEL';
    const isExcUnlocked = engine.isStructureUnlocked('EXPANSION_CITADEL');
    const canAffordExc = hqResources.metallic >= excDef.costMetallic && hqResources.organic >= excDef.costOrganic;
    const deficitExcM = Math.max(0, excDef.costMetallic - hqResources.metallic);
    const deficitExcO = Math.max(0, excDef.costOrganic - hqResources.organic);
    const hasExcDeficit = !canAffordExc;
    const lockTypeExc: 'RESEARCH' | 'SLIPWAY' | 'RESOURCE' | 'NONE' = !isExcUnlocked
      ? 'RESEARCH'
      : hasExcDeficit
      ? 'RESOURCE'
      : 'NONE';
    const costTextExc = hasExcDeficit
      ? `-${deficitExcM > 0 ? `${deficitExcM}M` : ''}${deficitExcO > 0 ? ` ${deficitExcO}O` : ''}`.trim()
      : 'M: 2,400 | O: 600';

    slots.push(
      renderSlot(
        12,
        'cmd-bld-exc',
        'EXC',
        'CITADEL',
        <Anchor className="w-4 h-4 text-emerald-400" />,
        () => handleBuilderStructureSelect('EXPANSION_CITADEL'),
        undefined,
        {
          type: 'BUILD_STRUCTURE',
          payload: {
            structureType: 'EXPANSION_CITADEL',
            name: excDef.name,
            code: excDef.code,
            metallic: excDef.costMetallic,
            organic: excDef.costOrganic,
            description: excDef.description,
            trait: excDef.trait,
            mooring: excDef.mooring || 'Requires placement inside an active gravity well.',
            capacity: excDef.capacity || '+1 Expansion Lab tier capacity.',
            isLocked: !isExcUnlocked,
            lockType: lockTypeExc,
            costText: costTextExc,
            hasResourceDeficit: hasExcDeficit,
            specs: {
              hull: excDef.hullMax,
              shield: excDef.shieldHpMax,
              capacity: '+1 Expansion Lab tier capacity.',
            },
            rejectionReason: !canAffordExc
              ? `Deficit: ${deficitExcM > 0 ? `${Math.round(deficitExcM)} Met ` : ''}${deficitExcO > 0 ? `${Math.round(deficitExcO)} Org` : ''}`
              : undefined,
          },
        },
        {
          active: isExcSelected,
          disabled: !isExcUnlocked || (!canAffordExc && !isExcSelected),
          badge: !isExcUnlocked ? 'LOCK' : undefined,
          accentColor: isExcSelected ? '#38bdf8' : '#10b981',
          lockType: lockTypeExc,
          costText: costTextExc,
          hasResourceDeficit: hasExcDeficit,
        }
      )
    );

    // Slot 13: Integrity & Diagnostics
    slots.push(
      renderSlot(
        13,
        'cmd-bld-diag',
        `${Math.round(builder?.hullHp ?? 100)}%`,
        'INTEGRITY',
        <Activity className="w-4 h-4 text-emerald-400" />,
        () => engine.addLog('BUILDER', `${builder?.name || 'Builder'}: All structural bulkheads and containment fields nominal.`, 'info'),
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'INTEGRITY', title: 'Vessel Hull Integrity', description: `Hull HP: ${Math.round(builder?.hullHp ?? 100)} / ${Math.round(builder?.hullMax ?? 100)}. Shields: ${Math.round(builder?.shieldHp ?? 100)}.` },
        },
        { accentColor: '#22c55e' }
      )
    );

    return slots;
  };

  const renderBuilderInfrastructure = () => {
    const slots = [];
    slots.push(renderBackButton());

    const infraKeys: {
      type: StructureType;
      code: string;
      label: string;
      sub: string;
      reqTechName?: string;
      accent: string;
    }[] = [
      {
        type: 'SY_LIGHT',
        code: 'SY-L',
        label: 'SY-L',
        sub: 'LT YARD',
        accent: '#00f0ff',
      },
      {
        type: 'SY_MEDIUM',
        code: 'SY-M',
        label: 'SY-M',
        sub: 'MED YARD',
        reqTechName: 'Civic Tier 3 / Military Tier 4',
        accent: '#3b82f6',
      },
      {
        type: 'SY_HEAVY',
        code: 'SY-H',
        label: 'SY-H',
        sub: 'HVY YARD',
        reqTechName: 'Military Tier 7: Apex Capital Gantry',
        accent: '#a855f7',
      },
      {
        type: 'ORBITAL_REFINERY',
        code: 'REF',
        label: 'REF',
        sub: 'REFINERY',
        reqTechName: 'Civic Tier 2: Automated Ore Refining & Hydrocarbon Cracking',
        accent: '#fbbf24',
      },
      {
        type: 'REPAIR_BAY',
        code: 'REP',
        label: 'REP',
        sub: 'REPAIR',
        accent: '#10b981',
      },
    ];

    infraKeys.forEach((item, sIdx) => {
      const def = STRUCTURE_CATALOG[item.type];
      if (!def) return;
      const isSelected = buildStructureType === item.type;
      const isUnlocked = engine.isStructureUnlocked(item.type);
      const isLocked = !isUnlocked;
      const canAfford =
        hqResources.metallic >= def.costMetallic &&
        hqResources.organic >= def.costOrganic;

      const deficitM = Math.max(0, def.costMetallic - hqResources.metallic);
      const deficitO = Math.max(0, def.costOrganic - hqResources.organic);

      slots.push(
        renderSlot(
          sIdx + 1,
          `cmd-bld-infra-${item.code.toLowerCase()}`,
          item.label,
          item.sub,
          <Factory className="w-3.5 h-3.5" style={{ color: item.accent }} />,
          () => {
            if (!isLocked) onSelectBuildStructure?.(isSelected ? null : item.type);
          },
          undefined,
          {
            type: 'BUILD_STRUCTURE',
            payload: {
              structureType: item.type,
              name: def.name,
              code: item.code,
              metallic: def.costMetallic,
              organic: def.costOrganic,
              description: def.description,
              trait: def.trait,
              mooring: def.mooring,
              capacity: def.capacity,
              isLocked,
              lockReason: isLocked ? `Requires ${item.reqTechName || 'Research Authorization'}` : undefined,
              rejectionReason: !canAfford
                ? `Deficit: ${deficitM > 0 ? `${Math.round(deficitM)} Met ` : ''}${deficitO > 0 ? `${Math.round(deficitO)} Org` : ''}`
                : undefined,
            },
          },
          {
            active: isSelected,
            disabled: isLocked || (!canAfford && !isSelected),
            badge: isLocked ? 'LOCK' : undefined,
            accentColor: item.accent,
          }
        )
      );
    });

    // Slot 6: Cancel Ghost
    slots.push(
      renderSlot(
        6,
        'cmd-bld-infra-clear',
        'CANCEL',
        'GHOST',
        <RotateCcw className="w-4 h-4 text-slate-400" />,
        () => onSelectBuildStructure?.(null),
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'CLR', title: 'Cancel Ghost Placement', description: 'Clear active infrastructure placement blueprint.' },
        },
        { disabled: buildStructureType === null, accentColor: '#94a3b8' }
      )
    );

    // Slots 7-13: Defenses switch and resources
    slots.push(
      renderSlot(
        7,
        'cmd-bld-infra-to-def',
        'DEFENSES',
        'SWITCH',
        <Shield className="w-4 h-4 text-emerald-400" />,
        () => navigateTo('BUILDER_DEFENSES'),
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'SW-DEF', title: 'Switch to Defenses', description: 'Switch to defensive platform blueprints.' },
        },
        { accentColor: '#10b981' }
      )
    );

    slots.push(
      renderSlot(
        8,
        'cmd-bld-infra-met',
        `${Math.round(hqResources.metallic)}`,
        'HQ METALS',
        <Boxes className="w-4 h-4 text-amber-400" />,
        undefined,
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'HQ-MET', title: 'Citadel Metallic Reserves', description: 'Total metallic alloy available at Aegis-IV Citadel.' },
        },
        { accentColor: '#f59e0b' }
      )
    );

    slots.push(
      renderSlot(
        9,
        'cmd-bld-infra-org',
        `${Math.round(hqResources.organic)}`,
        'HQ ORGANIC',
        <Boxes className="w-4 h-4 text-emerald-400" />,
        undefined,
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'HQ-ORG', title: 'Citadel Organic Reserves', description: 'Total organic polymers available at Aegis-IV Citadel.' },
        },
        { accentColor: '#10b981' }
      )
    );

    slots.push(
      renderSlot(
        10,
        'cmd-bld-infra-return',
        'RETURN',
        'HQ DOCK',
        <Anchor className="w-4 h-4 text-cyan-400" />,
        () => {
          const hq = engine.getHQ();
          if (selectedShip && hq) {
            engine.launchBuilderTransitSpline(selectedShip, hq.pos);
          }
        },
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'RTN-HQ', title: 'Return to HQ', description: 'Order Builder to return to Aegis-IV HQ mooring.' },
        },
        { accentColor: '#00f0ff' }
      )
    );

    for (let i = 11; i < 14; i++) {
      slots.push(renderEmptySlot(i));
    }

    return slots;
  };

  const renderBuilderDefenses = () => {
    const slots = [];
    slots.push(renderBackButton());

    const defKeys: StructureType[] = [
      'MISSILE_BATTERY',
      'PD_PLATFORM',
    ];

    defKeys.forEach((sType, sIdx) => {
      const def = STRUCTURE_CATALOG[sType];
      const isSelected = buildStructureType === sType;
      const canAfford =
        hqResources.metallic >= def.costMetallic &&
        hqResources.organic >= def.costOrganic;

      slots.push(
        renderSlot(
          sIdx + 1,
          `cmd-bld-def-${def.code.toLowerCase()}`,
          def.code,
          def.name.split(' ')[0],
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
          () => {
            onSelectBuildStructure?.(isSelected ? null : sType);
          },
          undefined,
          {
            type: 'BUILD_STRUCTURE',
            payload: {
              structureType: sType,
              name: def.name,
              code: def.code,
              metallic: def.costMetallic,
              organic: def.costOrganic,
              description: def.description,
            },
          },
          {
            active: isSelected,
            disabled: !canAfford && !isSelected,
            accentColor: '#10b981',
          }
        )
      );
    });

    slots.push(
      renderSlot(
        3,
        'cmd-bld-def-clear',
        'CANCEL',
        'GHOST',
        <RotateCcw className="w-4 h-4 text-slate-400" />,
        () => onSelectBuildStructure?.(null),
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'CLR', title: 'Cancel Ghost Placement', description: 'Clear active defensive platform placement blueprint.' },
        },
        { disabled: buildStructureType === null, accentColor: '#94a3b8' }
      )
    );

    slots.push(
      renderSlot(
        4,
        'cmd-bld-def-to-infra',
        'INFRA',
        'SWITCH',
        <Factory className="w-4 h-4 text-amber-400" />,
        () => navigateTo('BUILDER_INFRASTRUCTURE'),
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'SW-INF', title: 'Switch to Infrastructure', description: 'Switch to orbital infrastructure blueprints.' },
        },
        { accentColor: '#f59e0b' }
      )
    );

    for (let i = 5; i < 14; i++) {
      slots.push(renderEmptySlot(i));
    }

    return slots;
  };

  const renderScaffoldDeck = () => {
    const slots = [];
    const scaffold = selectedShip;
    if (!scaffold) return slots;

    const progress = Math.round((scaffold.constructionProgress ?? 0) * 100);
    const depM = Math.round(scaffold.depositedM ?? 0);
    const totM = Math.round(scaffold.totalM ?? 0);
    const depO = Math.round(scaffold.depositedO ?? 0);
    const totO = Math.round(scaffold.totalO ?? 0);

    // Slot 0: Scaffold Status
    slots.push(
      renderSlot(
        0,
        'cmd-scaffold-status',
        `${progress}%`,
        'PROGRESS',
        <Activity className="w-4 h-4 text-cyan-400" />,
        undefined,
        undefined,
        {
          type: 'ORDER',
          payload: {
            code: 'SCAF',
            title: `Scaffold: ${scaffold.name}`,
            description: `Construction: ${progress}%. Materials Deposited: ${depM.toLocaleString()}/${totM.toLocaleString()} Met, ${depO.toLocaleString()}/${totO.toLocaleString()} Org. State: ${scaffold.constructionState || 'PENDING'}.`,
          },
        },
        { accentColor: '#00f0ff' }
      )
    );

    // Slot 1: Cancel & 100% Refund
    const refundM = scaffold.costPaidM ?? scaffold.totalM ?? 0;
    const refundO = scaffold.costPaidO ?? scaffold.totalO ?? 0;
    slots.push(
      renderSlot(
        1,
        'cmd-scaffold-cancel',
        'CANCEL',
        '100% REFUND',
        <RotateCcw className="w-4 h-4 text-amber-400" />,
        () => {
          engine.cancelScaffold(scaffold.id);
        },
        undefined,
        {
          type: 'ORDER',
          payload: {
            code: 'REFUND',
            title: 'Cancel Scaffold Placement',
            description: `Cancel construction before completion. Returns 100% of materials (+${refundM.toLocaleString()} Met, +${refundO.toLocaleString()} Org) to HQ silos.`,
          },
        },
        {
          accentColor: '#f59e0b',
          costText: `+${refundM.toLocaleString()}M +${refundO.toLocaleString()}O`,
        }
      )
    );

    // Slot 2: Builder Assignment Status
    const builder = engine.ships.find((s) => s.id === scaffold.assignedBuilderId);
    slots.push(
      renderSlot(
        2,
        'cmd-scaffold-builder',
        builder ? 'DISPATCHED' : 'BACKLOG',
        builder ? 'BUILDER' : 'QUEUED',
        <Factory className="w-4 h-4 text-emerald-400" />,
        builder ? () => onSelectShip(builder.id) : undefined,
        undefined,
        {
          type: 'ORDER',
          payload: {
            code: 'BLD',
            title: builder ? `Assigned: ${builder.name}` : 'Scaffold Backlog',
            description: builder
              ? `Builder ${builder.name} status: ${builder.builderState}. Click to select builder.`
              : 'All builders currently occupied. Scaffold is queued in the global logistics backlog.',
          },
        },
        { accentColor: builder ? '#10b981' : '#64748b' }
      )
    );

    // Slots 3-12 empty
    for (let i = 3; i < 13; i++) {
      slots.push(renderEmptySlot(i));
    }

    // Slot 13: Deselect
    slots.push(
      renderSlot(
        13,
        'cmd-scaffold-back',
        'DESELECT',
        'RETURN',
        <X className="w-4 h-4 text-slate-400" />,
        () => onSelectShip(''),
        undefined,
        {
          type: 'ORDER',
          payload: { code: 'ESC', title: 'Deselect Scaffold', description: 'Clear selected scaffold focus.' },
        },
        { accentColor: '#94a3b8' }
      )
    );

    return slots;
  };

  // Determine which page to render
  const renderCurrentGridSlots = () => {
    if (isMultiSelect) {
      return renderFleetRoot();
    }

    if (selectedShip?.isUnderConstruction) {
      return renderScaffoldDeck();
    }

    const page = navState.currentPage;
    const isHQ = selectedShip?.role === 'HQ';
    const isBuilder = selectedShip?.role === 'BUILDER';

    if (isBuilder) {
      switch (page) {
        case 'BUILDER_INFRASTRUCTURE':
          return renderBuilderInfrastructure();
        case 'BUILDER_DEFENSES':
          return renderBuilderDefenses();
        case 'BUILDER_ROOT':
        default:
          return renderBuilderRoot();
      }
    }

    if (isShipyard) {
      return renderHQShipyardQueue();
    }

    if (isHQ) {
      switch (page) {
        case 'HQ_TACTICAL':
          return renderHQTactical();
        case 'HQ_DOMESTIC_STRUCTURES':
        case 'HQ_BUILDINGS':
          return renderHQDomesticStructures();
        case 'HQ_MILITARY_STRUCTURES':
          return renderHQMilitaryStructures();
        case 'HQ_SHIPYARD_QUEUE':
        case 'HQ_SHIPYARD':
          return renderHQShipyardQueue();
        case 'ROOT':
        default:
          return renderHQRoot();
      }
    }

    // Allied Warship / Other Roles
    if (isWarship) {
      if (page === 'WARSHIP_FLEET_ASSIGN') {
        return renderWarshipFleetAssign();
      }
      return renderWarshipRoot();
    }

    return renderWarshipRoot();
  };

  return (
    <>
      {/* 
        Unified Lower-Right Tactical Command Deck:
        - Scaled 2x7 footprint using dynamic clamp viewport scaling
        - Fluid tactical slots
        - 36px-42px responsive glyphs
        - Monospace command/role labels
        - [KEY] shortcut tags in upper-left
        - Queue count badges in upper-right
        - Dynamic hover tooltip anchored cleanly at bottom: calc(100% + 12px); right: 0;
      */}
      <div
        id="tactical-command-grid-container"
        className="command-deck-container transition-all duration-150"
        style={
          uiScale !== 1.0
            ? {
                transform: `scale(${uiScale})`,
                transformOrigin: 'bottom right',
              }
            : undefined
        }
      >
        {/* Header Breadcrumb Banner: Positioned directly above deck */}
        <div
          className="absolute -top-8 left-0 right-0 flex items-center justify-between px-1 text-[11px] font-mono pointer-events-none"
        >
          <div className="flex items-center gap-1.5 bg-[#0a0f18]/90 px-2.5 py-0.5 rounded border border-cyan-500/40 backdrop-blur-md shadow-md">
            <span className="text-cyan-400 font-bold tracking-wider">
              {isWarship
                ? navState.currentPage === 'WARSHIP_FLEET_ASSIGN'
                  ? 'FLEET ASSIGN'
                  : 'WARSHIP'
                : 'COMMAND MATRIX'}
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-200 font-semibold truncate max-w-[140px]">
              {isMultiSelect
                ? `FLEET [${selectedShips.length}]`
                : selectedShip?.name || 'STANDBY'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#0a0f18]/90 border border-slate-700/80 text-slate-300 font-mono backdrop-blur-md shadow-md">
              PAGE: <strong className="text-cyan-300">{navState.currentPage}</strong>
            </span>
            {navState.history.length > 0 && (
              <button
                onClick={navigateBack}
                className="pointer-events-auto text-[10px] px-2 py-0.5 rounded bg-amber-950/90 border border-amber-500/70 text-amber-300 hover:bg-amber-900 cursor-pointer font-mono font-bold shadow-md transition-colors"
              >
                [ESC] BACK
              </button>
            )}
          </div>
        </div>

        {/* 14-Slot 2x7 Tactile Grid Children */}
        {renderCurrentGridSlots()}

        {/* Dynamic Floating Tactical Command Tooltip Card */}
        <CommandTooltipCard
          tooltip={activeTooltip}
          engine={engine}
          selectedShip={selectedShip}
          hqResources={hqResources}
        />
      </div>
    </>
  );
};
