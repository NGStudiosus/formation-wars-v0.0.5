import React from 'react';
import { SimulationEngine } from '../simulation/engine';
import { ShipEntity, HQResources } from '../types';
import {
  Factory,
  CheckCircle2,
  Lock,
  Clock,
  AlertOctagon,
  Boxes,
  Orbit,
  XCircle,
} from 'lucide-react';
import { validateShipBuild } from '../simulation/shipyardController';
import { TechNodeDefinition, calculateResearchTokens } from '../simulation/researchManager';
import {
  resolveShipyardDiagnostics,
  resolveStructureDiagnostics,
  DiagnosticReport,
} from '../simulation/tooltipResolver';
import { ViewportTooltipPortal, TooltipProps } from './ViewportTooltipPortal';
import { MetalIcon, OrganicsIcon, NeridiumIcon } from './ResourceIcons';

export { ViewportTooltipPortal };
export type { TooltipProps };

export interface DiagnosticAlertBoxProps {
  diagnostics: DiagnosticReport;
}

export const DiagnosticAlertBox: React.FC<DiagnosticAlertBoxProps> = ({ diagnostics }) => {
  if (diagnostics.isAvailable) return null;
  return (
    <div
      className="tooltip-alert-box"
      style={{
        borderLeft: `4px solid ${diagnostics.statusColor}`,
        background: 'rgba(255, 40, 40, 0.12)',
        padding: '8px 10px',
        margin: '8px 0',
        borderRadius: '2px 4px 4px 2px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <div
        className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px]"
        style={{ color: diagnostics.statusColor }}
      >
        <AlertOctagon className="w-3.5 h-3.5 flex-shrink-0 animate-pulse" />
        <span>{diagnostics.statusTag}</span>
      </div>
      <div
        style={{
          color: diagnostics.statusColor,
          fontWeight: 'bold',
          fontSize: '11px',
          letterSpacing: '0.5px',
        }}
      >
        REASON: {diagnostics.failureReason}
      </div>
      {(diagnostics.deficitM > 0 || diagnostics.deficitO > 0) && (
        <div style={{ color: '#f87171', fontWeight: 600, fontSize: '11px' }}>
          SHORTAGE:{' '}
          {diagnostics.deficitM > 0
            ? `-${Math.round(diagnostics.deficitM).toLocaleString()} Metallic `
            : ''}
          {diagnostics.deficitO > 0
            ? `-${Math.round(diagnostics.deficitO).toLocaleString()} Organic`
            : ''}
        </div>
      )}
      <div style={{ color: '#ffffff', fontSize: '11px', lineHeight: '1.3' }}>
        TO UNLOCK: {diagnostics.unlockRequirement}
      </div>
    </div>
  );
};

export interface TooltipCostSectionProps {
  diagnostics: DiagnosticReport;
  costs: { metallic: number; organic: number; neridium?: number };
}

export const TooltipCostSection: React.FC<TooltipCostSectionProps> = ({ diagnostics, costs }) => (
  <div className="tooltip-cost-section mb-2.5">
    <div className="tooltip-cost-header">STOCKPILE COMMITMENT:</div>
    <div className="tooltip-cost-grid">
      <span className={`flex items-center gap-1.5 ${diagnostics.deficitM > 0 ? 'cost-deficit' : 'cost-satisfied'}`}>
        <MetalIcon className="w-3.5 h-3.5 flex-shrink-0" />
        <span>MET: {costs.metallic.toLocaleString()}</span>
        {diagnostics.deficitM > 0 && ` (-${Math.round(diagnostics.deficitM).toLocaleString()})`}
      </span>
      <span className={`flex items-center gap-1.5 ${diagnostics.deficitO > 0 ? 'cost-deficit' : 'cost-satisfied'}`}>
        <OrganicsIcon className="w-3.5 h-3.5 flex-shrink-0" />
        <span>ORG: {costs.organic.toLocaleString()}</span>
        {diagnostics.deficitO > 0 && ` (-${Math.round(diagnostics.deficitO).toLocaleString()})`}
      </span>
      {((costs.neridium ?? 0) > 0 || (diagnostics.costNeridium ?? 0) > 0) && (
        <span
          className={`flex items-center gap-1.5 ${(diagnostics.deficitNeridium ?? 0) > 0 ? 'cost-deficit' : 'cost-satisfied'}`}
          style={{ color: (diagnostics.deficitNeridium ?? 0) > 0 ? undefined : '#c084fc' }}
        >
          <NeridiumIcon className="w-3.5 h-3.5 flex-shrink-0" />
          <span>NERIDIUM: {(costs.neridium ?? diagnostics.costNeridium ?? 0).toLocaleString()}</span>
          {(diagnostics.deficitNeridium ?? 0) > 0 && ` (-${Math.round(diagnostics.deficitNeridium!).toLocaleString()})`}
        </span>
      )}
    </div>
  </div>
);

export interface ActiveTooltipState {
  visible: boolean;
  slotIndex?: number;
  actionType: 'BUILD_SHIP' | 'BUILD_STRUCTURE' | 'ORDER' | 'STANCE' | 'RESEARCH_NODE';
  payload: any;
  anchorRect?: DOMRect | null;
  anchorX?: number;
  anchorY?: number;
}

export interface TacticalTooltipCardProps {
  tooltip: ActiveTooltipState;
  engine: SimulationEngine;
  selectedShip?: ShipEntity | null;
  hqResources: HQResources;
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export const CommandTooltipCard: React.FC<TacticalTooltipCardProps> = ({
  tooltip,
  engine,
  selectedShip = null,
  hqResources,
}) => {
  if (!tooltip || !tooltip.visible || !tooltip.payload) return null;

  const { actionType, payload } = tooltip;

  // Resolve anchorRect: either explicitly passed DOMRect or synthesize from legacy anchor coordinates
  const anchorRect: DOMRect | null =
    tooltip.anchorRect ??
    (tooltip.anchorX !== undefined &&
    tooltip.anchorY !== undefined &&
    (tooltip.anchorX > 0 || tooltip.anchorY > 0)
      ? ({
          left: tooltip.anchorX - 24,
          right: tooltip.anchorX + 24,
          top: tooltip.anchorY,
          bottom: tooltip.anchorY + 48,
          width: 48,
          height: 48,
          x: tooltip.anchorX - 24,
          y: tooltip.anchorY,
          toJSON: () => ({}),
        } as DOMRect)
      : null);

  if (!anchorRect) return null;

  const content = (
    <div
      id="tactical-command-tooltip-card"
      className="w-[340px] max-w-[min(360px,calc(100vw-28px))] text-slate-200 font-mono text-xs select-none"
    >
      {/* ========================================================= */}
      {/* 1. UNIT PRODUCTION CARD (BUILD_SHIP)                      */}
      {/* ========================================================= */}
      {actionType === 'BUILD_SHIP' && (() => {
        const activeStation = payload.selectedStation ?? selectedShip;
        const shipClass = payload.role || payload.code || payload.name;

        // Primary Shipyard Diagnostic Resolution
        const diagnostic = resolveShipyardDiagnostics(shipClass, activeStation, engine);

        const validation = validateShipBuild(
          activeStation,
          shipClass,
          hqResources,
          engine.getResearchState()
        );

        const reqMet = diagnostic.costM || payload.metallic || 0;
        const curMet = hqResources.metallic ?? 0;
        const deficitMet = diagnostic.deficitM;

        const reqOrg = diagnostic.costO || payload.organic || 0;
        const curOrg = hqResources.organic ?? 0;
        const deficitOrg = diagnostic.deficitO;

        const reqNer = diagnostic.costNeridium || payload.neridiumCost || 0;
        const curNer = (hqResources as any).neridium ?? 0;
        const deficitNer = diagnostic.deficitNeridium ?? Math.max(0, reqNer - curNer);

        const tonnageClass = payload.tierCategory
          ? `${payload.tierCategory} CLASS HULL`
          : payload.classification || 'Naval Warship';

        return (
          <div>
            {/* 1. Header: Designation, Tonnage Class, and Status Badge */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-2 mb-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/60 text-cyan-300 font-black text-[10px]">
                    [{payload.code}]
                  </span>
                  <span className="font-bold text-slate-100 text-sm tracking-wide">
                    {payload.name}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                  <Factory className="w-3 h-3 text-slate-500" />
                  <span>{tonnageClass}</span>
                </div>
              </div>

              {/* Status Badge */}
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold"
                style={{
                  backgroundColor: `${diagnostic.statusColor}20`,
                  borderColor: `${diagnostic.statusColor}80`,
                  color: diagnostic.statusColor,
                  borderWidth: 1,
                }}
              >
                {diagnostic.isAvailable ? (
                  <CheckCircle2 className="w-3 h-3" style={{ color: diagnostic.statusColor }} />
                ) : diagnostic.gateType === 'RESEARCH' ? (
                  <Lock className="w-3 h-3" style={{ color: diagnostic.statusColor }} />
                ) : (
                  <AlertOctagon className="w-3 h-3" style={{ color: diagnostic.statusColor }} />
                )}
                {payload.queueCount > 0 ? `QUEUED x${payload.queueCount}` : diagnostic.statusTag}
              </span>
            </div>

            {/* 2. Description & Armament */}
            <p className="text-[11px] text-slate-300 leading-relaxed mb-2.5">
              {payload.description}
            </p>

            {/* Tactical Specifications Grid */}
            {payload.specs && (
              <div className="grid grid-cols-2 gap-1.5 bg-slate-950/70 border border-slate-800/80 rounded p-1.5 mb-2.5 text-[10px]">
                <div className="flex justify-between items-center px-1">
                  <span className="text-slate-500">Hull Armor:</span>
                  <span className="text-emerald-400 font-bold">{(payload.specs.hull ?? 0).toLocaleString()} HP</span>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-slate-500">Deflector:</span>
                  <span className="text-cyan-400 font-bold">{(payload.specs.shield ?? 0) > 0 ? `${(payload.specs.shield ?? 0).toLocaleString()} HP` : 'None'}</span>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-slate-500">Missile Tubes:</span>
                  <span className="text-rose-400 font-bold">{(payload.specs.tubes ?? 0) > 0 ? `${payload.specs.tubes} Tubes` : 'None'}</span>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-slate-500">Point-Defense:</span>
                  <span className="text-amber-400 font-bold">{(payload.specs.pdBeams ?? 0) > 0 ? `${payload.specs.pdBeams}x PDPLA` : 'None'}</span>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-slate-500">Max Velocity:</span>
                  <span className="text-slate-300 font-bold">{payload.specs.speed ?? 0} km/s</span>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-slate-500">Strike Range:</span>
                  <span className="text-slate-300 font-bold">{(payload.specs.range ?? 0) > 0 ? `${payload.specs.range} km` : 'Mining Range'}</span>
                </div>
              </div>
            )}

            {/* 3. Diagnostic Alert Box / Available Status */}
            {!diagnostic.isAvailable ? (
              <DiagnosticAlertBox diagnostics={diagnostic} />
            ) : (
              <div
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border mb-2.5 text-[10.5px] font-bold shadow-sm"
                style={{
                  backgroundColor: `${diagnostic.statusColor}15`,
                  borderColor: `${diagnostic.statusColor}80`,
                  color: diagnostic.statusColor,
                }}
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: diagnostic.statusColor }} />
                <span className="leading-snug">{diagnostic.statusTag} // {diagnostic.reason}</span>
              </div>
            )}

            {/* Stockpile Commitment Section */}
            <TooltipCostSection
              diagnostics={diagnostic}
              costs={{ metallic: reqMet, organic: reqOrg, neridium: reqNer }}
            />

            {/* 4. Cost & Stockpile Matrix */}
            <div className="bg-slate-900/90 border border-slate-800 rounded p-2 mb-2 text-[10px] space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-400 border-b border-slate-800/80 pb-1">
                <span>MATERIAL RESERVES MATRIX</span>
                <span className="text-slate-500 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {payload.buildTime ?? 0}s build cycle
                </span>
              </div>

              {/* Metallic */}
              <div className="flex justify-between items-center font-mono">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                  Metallic Refined:
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">{reqMet.toLocaleString()}</span>
                  <span className="text-slate-600">/</span>
                  <span className={`font-bold ${deficitMet === 0 ? 'text-cyan-300' : 'text-slate-300'}`}>
                    {Math.round(curMet).toLocaleString()}
                  </span>
                  {deficitMet > 0 ? (
                    <span className="text-rose-400 font-bold font-mono ml-1">
                      (-{Math.round(deficitMet).toLocaleString()})
                    </span>
                  ) : (
                    <span className="text-emerald-400 text-[9px] ml-1">[OK]</span>
                  )}
                </div>
              </div>

              {/* Organic */}
              <div className="flex justify-between items-center font-mono">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  Organic Polymers:
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">{reqOrg.toLocaleString()}</span>
                  <span className="text-slate-600">/</span>
                  <span className={`font-bold ${deficitOrg === 0 ? 'text-emerald-300' : 'text-slate-300'}`}>
                    {Math.round(curOrg).toLocaleString()}
                  </span>
                  {deficitOrg > 0 ? (
                    <span className="text-rose-400 font-bold font-mono ml-1">
                      (-{Math.round(deficitOrg).toLocaleString()})
                    </span>
                  ) : (
                    <span className="text-emerald-400 text-[9px] ml-1">[OK]</span>
                  )}
                </div>
              </div>

              {/* Neridium (ships only) */}
              {reqNer > 0 && (
                <div className="flex justify-between items-center font-mono">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                    Neridium Rare Byproduct:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">{reqNer.toLocaleString()}</span>
                    <span className="text-slate-600">/</span>
                    <span className={`font-bold ${deficitNer === 0 ? 'text-purple-300' : 'text-slate-300'}`}>
                      {Math.round(curNer).toLocaleString()}
                    </span>
                    {deficitNer > 0 ? (
                      <span className="text-rose-400 font-bold font-mono ml-1">
                        (-{Math.round(deficitNer).toLocaleString()})
                      </span>
                    ) : (
                      <span className="text-emerald-400 text-[9px] ml-1">[OK]</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Active Queue Construction Timer */}
            {payload.activeBuilding && (
              <div className="flex items-center justify-between px-2 py-1 bg-cyan-950/50 border border-cyan-500/40 rounded mb-2 text-[10px] text-cyan-300">
                <span className="flex items-center gap-1 font-bold">
                  <Clock className="w-3 h-3 animate-spin text-cyan-400" />
                  Active Hull Fabrication:
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  {payload.activeBuilding.buildTimeRemaining.toFixed(1)}s remaining
                </span>
              </div>
            )}

            {/* Controls Footer */}
            <div className="flex items-center justify-between border-t border-slate-800/80 pt-1.5 text-[9px]">
              {diagnostic.isAvailable && validation.valid ? (
                <span className="text-cyan-400 font-bold">[L-CLICK] Queue Fabrication</span>
              ) : (
                <span className="text-rose-400 font-bold">[FABRICATION BLOCKED - REVIEW DIAGNOSTICS]</span>
              )}
              {payload.queueCount > 0 && (
                <span className="text-rose-400 font-bold">[R-CLICK] Cancel & Refund</span>
              )}
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* 2. STRUCTURE CONSTRUCTION CARD (BUILD_STRUCTURE)          */}
      {/* ========================================================= */}
      {actionType === 'BUILD_STRUCTURE' && (() => {
        const structKey = payload.structureType || payload.type || payload.code || payload.name;
        const structDiag = resolveStructureDiagnostics(structKey, engine);

        const reqMet = structDiag.costM;
        const curMet = hqResources.metallic ?? 0;
        const deficitMet = structDiag.deficitM;

        const reqOrg = structDiag.costO;
        const curOrg = hqResources.organic ?? 0;
        const deficitOrg = structDiag.deficitO;

        return (
          <div>
            {/* 1. Header: Designation, Facility Class, Status Badge */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-2 mb-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/60 text-emerald-300 font-black text-[10px]">
                    [{payload.code || structDiag.code}]
                  </span>
                  <span className="font-bold text-slate-100 text-sm tracking-wide">
                    {payload.name || structDiag.name}
                  </span>
                </div>
                <div className="text-[10px] text-emerald-400/90 mt-0.5 flex items-center gap-1">
                  <Boxes className="w-3 h-3" />
                  <span>{payload.classification || 'Orbital Facility'}</span>
                </div>
              </div>

              {/* Live Status Badge */}
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold"
                style={{
                  backgroundColor: `${structDiag.statusColor}20`,
                  borderColor: `${structDiag.statusColor}80`,
                  color: structDiag.statusColor,
                  borderWidth: 1,
                }}
              >
                {structDiag.isAvailable ? (
                  <CheckCircle2 className="w-3 h-3" style={{ color: structDiag.statusColor }} />
                ) : structDiag.gateType === 'RESEARCH' ? (
                  <Lock className="w-3 h-3" style={{ color: structDiag.statusColor }} />
                ) : (
                  <AlertOctagon className="w-3 h-3" style={{ color: structDiag.statusColor }} />
                )}
                {structDiag.statusTag}
              </span>
            </div>

            {/* 2. Description & Mooring Specs */}
            <p className="text-[11px] text-slate-300 leading-relaxed mb-2.5">
              {payload.description || structDiag.trait}
            </p>

            {/* Mooring & Gravity Well Requirement */}
            <div className="flex items-start gap-1.5 px-2 py-1.5 bg-slate-900/90 border border-cyan-500/40 rounded mb-2.5 text-[10px]">
              <Orbit className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div className="leading-snug">
                <span className="text-cyan-400 font-bold uppercase text-[9px] block">Mooring Anchor Requirement</span>
                <span className="text-slate-200">{structDiag.mooring}</span>
              </div>
            </div>

            {/* Structure Specs & Capacity */}
            {payload.specs && (
              <div className="grid grid-cols-2 gap-1.5 bg-slate-950/70 border border-slate-800/80 rounded p-1.5 mb-2.5 text-[10px]">
                <div className="flex justify-between items-center px-1">
                  <span className="text-slate-500">Station Armor:</span>
                  <span className="text-emerald-400 font-bold">{payload.specs.hull?.toLocaleString()} HP</span>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-slate-500">Shielding:</span>
                  <span className="text-cyan-400 font-bold">{payload.specs.shield ? `${payload.specs.shield} HP` : 'Super-Frame'}</span>
                </div>
                {payload.specs.capacity && (
                  <div className="flex justify-between items-center px-1 col-span-2">
                    <span className="text-slate-500">Operation:</span>
                    <span className="text-cyan-300 font-bold">{payload.specs.capacity}</span>
                  </div>
                )}
              </div>
            )}

            {/* 3. Diagnostic Alert Box / Available Status */}
            {!structDiag.isAvailable ? (
              <DiagnosticAlertBox diagnostics={structDiag} />
            ) : (
              <div
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border mb-2.5 text-[10.5px] font-bold shadow-sm"
                style={{
                  backgroundColor: `${structDiag.statusColor}15`,
                  borderColor: `${structDiag.statusColor}80`,
                  color: structDiag.statusColor,
                }}
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: structDiag.statusColor }} />
                <span className="leading-snug">{structDiag.statusTag} // {structDiag.reason}</span>
              </div>
            )}

            {/* Stockpile Commitment Section */}
            <TooltipCostSection
              diagnostics={structDiag}
              costs={{ metallic: reqMet, organic: reqOrg }}
            />

            {/* 4. Cost & Stockpile Matrix */}
            <div className="bg-slate-900/90 border border-slate-800 rounded p-2 mb-2 text-[10px] space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-400 border-b border-slate-800/80 pb-1">
                <span>DEPLOYMENT REQUISITES</span>
                <span className="text-emerald-400 font-bold">INSTANT FIELD FORGE</span>
              </div>

              {/* Metallic */}
              <div className="flex justify-between items-center font-mono">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                  Metallic Refined:
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">{reqMet.toLocaleString()}</span>
                  <span className="text-slate-600">/</span>
                  <span className={`font-bold ${deficitMet === 0 ? 'text-cyan-300' : 'text-slate-300'}`}>
                    {Math.round(curMet).toLocaleString()}
                  </span>
                  {deficitMet > 0 ? (
                    <span className="text-rose-400 font-bold font-mono ml-1">
                      (-{Math.round(deficitMet).toLocaleString()})
                    </span>
                  ) : (
                    <span className="text-emerald-400 text-[9px] ml-1">[OK]</span>
                  )}
                </div>
              </div>

              {/* Organic */}
              <div className="flex justify-between items-center font-mono">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  Organic Polymers:
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">{reqOrg.toLocaleString()}</span>
                  <span className="text-slate-600">/</span>
                  <span className={`font-bold ${deficitOrg === 0 ? 'text-emerald-300' : 'text-slate-300'}`}>
                    {Math.round(curOrg).toLocaleString()}
                  </span>
                  {deficitOrg > 0 ? (
                    <span className="text-rose-400 font-bold font-mono ml-1">
                      (-{Math.round(deficitOrg).toLocaleString()})
                    </span>
                  ) : (
                    <span className="text-emerald-400 text-[9px] ml-1">[OK]</span>
                  )}
                </div>
              </div>
            </div>

            {/* Controls Footer */}
            <div className="flex items-center justify-between border-t border-slate-800/80 pt-1.5 text-[9px]">
              {structDiag.isAvailable ? (
                <span className="text-emerald-400 font-bold">[L-CLICK] Deploy Structure</span>
              ) : (
                <span className="text-rose-400 font-bold">[DEPLOYMENT BLOCKED - REVIEW DIAGNOSTICS]</span>
              )}
              <span className="text-slate-500">Builder Unit Context</span>
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* 3. TACTICAL ORDER CARD (ORDER)                            */}
      {/* ========================================================= */}
      {actionType === 'ORDER' && (
        <div>
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-800 pb-2 mb-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-blue-950 border border-blue-500/60 text-blue-300 font-black text-[10px]">
                  [{payload.hotkey || payload.code}]
                </span>
                <span className="font-bold text-slate-100 text-sm tracking-wide">
                  {payload.title}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                TACTICAL ORDER DIRECTIVE
              </div>
            </div>

            {payload.isActive ? (
              <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-400 text-cyan-200 text-[9px] font-bold animate-pulse">
                ACTIVE
              </span>
            ) : payload.status === 'COOLING_DOWN' ? (
              <span className="px-1.5 py-0.5 rounded bg-rose-950 border border-rose-400 text-rose-200 text-[9px] font-bold">
                RELOAD
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[9px] font-bold">
                READY
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed mb-2.5">
            {payload.description}
          </p>

          {/* Live Telemetry Details */}
          {payload.telemetry && payload.telemetry.length > 0 && (
            <div className="bg-slate-950/70 border border-slate-800 rounded p-2 mb-2 space-y-1">
              {payload.telemetry.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400">{item.label}:</span>
                  <span className={`font-bold font-mono ${item.color || 'text-slate-200'}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Propellant or Cost Requirements */}
          {payload.costDescription && (
            <div
              className={`p-1.5 rounded mb-2 border text-[10px] flex items-center justify-between ${
                payload.costAffordable !== false
                  ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              <span>{payload.costDescription}</span>
              {payload.costAffordable !== false ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
              )}
            </div>
          )}

          {/* Controls Footer */}
          <div className="flex items-center justify-between border-t border-slate-800/80 pt-1.5 text-[9px]">
            <span className="text-cyan-400 font-bold">
              {payload.instruction || `[L-CLICK] Execute [${payload.hotkey}]`}
            </span>
            <span className="text-slate-500">Immediate Action</span>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. DOCTRINE & STANCE CARD (STANCE)                        */}
      {/* ========================================================= */}
      {actionType === 'STANCE' && (
        <div>
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-800 pb-2 mb-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`px-1.5 py-0.5 rounded border font-black text-[10px] ${
                    payload.stanceType === 'AGGRESSIVE'
                      ? 'bg-rose-950 border-rose-500 text-rose-300'
                      : payload.stanceType === 'DEFENSIVE' || payload.stanceType === 'TIMID'
                      ? 'bg-blue-950 border-blue-500 text-blue-300'
                      : 'bg-emerald-950 border-emerald-500 text-emerald-300'
                  }`}
                >
                  [{payload.hotkey || 'P'}]
                </span>
                <span className="font-bold text-slate-100 text-sm tracking-wide">
                  {payload.title}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                COMBAT DOCTRINE & ROE
              </div>
            </div>

            {payload.isCurrent && (
              <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-400 text-cyan-200 text-[9px] font-bold">
                ACTIVE
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed mb-2.5">
            {payload.description}
          </p>

          {/* Rules of Engagement Breakdown */}
          {payload.rulesOfEngagement && payload.rulesOfEngagement.length > 0 && (
            <div className="bg-slate-950/70 border border-slate-800 rounded p-2 mb-2 space-y-1.5 text-[10px]">
              <div className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                RULES OF ENGAGEMENT (ROE):
              </div>
              {payload.rulesOfEngagement.map((roe: string, idx: number) => (
                <div key={idx} className="flex items-start gap-1.5 text-slate-300">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span className="leading-tight">{roe}</span>
                </div>
              ))}
            </div>
          )}

          {/* Controls Footer */}
          <div className="flex items-center justify-between border-t border-slate-800/80 pt-1.5 text-[9px]">
            <span className="text-cyan-400 font-bold">
              {payload.instruction || '[L-CLICK] Cycle Stance Protocol'}
            </span>
            <span className="text-slate-500">Autonomous AI Mode</span>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. RESEARCH NODE HOVER CARD (RESEARCH_NODE)               */}
      {/* ========================================================= */}
      {actionType === 'RESEARCH_NODE' && (() => {
        const node: TechNodeDefinition = payload.node;
        if (!node) return null;

        const tokens = calculateResearchTokens(engine);
        const nodeState = engine.researchManager.getNodeStatus(node, tokens);
        const isHQ = node.branch === 'HEADQUARTERS';

        const currentCapacity =
          node.branch === 'MILITARY'
            ? tokens.military
            : node.branch === 'CIVILIAN'
            ? tokens.civilian
            : node.branch === 'EXPANSION'
            ? tokens.expansion
            : tokens.headquarters;

        const requiredCapacity = isHQ ? (node.tier ?? 1) * 3 : (node.tier ?? 1);

        const branchStationName =
          node.branch === 'MILITARY'
            ? 'Military Research Stations [MRS]'
            : node.branch === 'CIVILIAN'
            ? 'Civic Research Outposts [CRO]'
            : node.branch === 'EXPANSION'
            ? 'Expansion Citadels [EXC]'
            : 'HQ Research Tokens';

        const branchTitle =
          node.branch === 'MILITARY'
            ? 'MILITARY MATRIX'
            : node.branch === 'CIVILIAN'
            ? 'CIVILIAN INDUSTRY'
            : node.branch === 'EXPANSION'
            ? 'EXPANSION DOMAIN'
            : 'HEADQUARTERS CITADEL';

        const costM = node.costMetallic ?? (node as any).costM ?? 0;
        const costO = node.costOrganic ?? (node as any).costO ?? 0;
        const hasMetallicDeficit = costM > hqResources.metallic;
        const hasOrganicDeficit = costO > hqResources.organic;
        const isInsufficient = hasMetallicDeficit || hasOrganicDeficit;

        const isBranchBusy = Boolean(engine.researchManager.getActiveProject(node.branch));
        const isQueued = engine.researchManager.isNodeQueued(node.id);
        const qPos = engine.researchManager.getQueuePosition(node.id);

        const durationSeconds = (node.totalTicks || 300) / 30.0;
        const durationFormatted =
          durationSeconds < 60
            ? `${durationSeconds.toFixed(0)}s`
            : `${Math.floor(durationSeconds / 60)}m ${Math.round(durationSeconds % 60)}s`;

        let statusText = '';
        let statusBadgeStyle = '';
        if (nodeState.status === 'COMPLETED') {
          statusText = 'COMPLETED: ACTIVE PROTOCOL';
          statusBadgeStyle = 'text-emerald-300 bg-emerald-950/80 border-emerald-500/60';
        } else if (nodeState.status === 'RESEARCHING') {
          statusText = `RESEARCHING: ${nodeState.remainingSeconds.toFixed(1)}s Remaining [CLICK TO CANCEL & REFUND]`;
          statusBadgeStyle = 'text-cyan-300 bg-cyan-950/80 border-cyan-500/60 animate-pulse';
        } else if (nodeState.status === 'PAUSED_LACKING_CAPACITY') {
          statusText = isHQ ? 'PAUSED: INSUFFICIENT HQ RESEARCH TOKENS' : 'PAUSED: INSUFFICIENT RESEARCH STATIONS';
          statusBadgeStyle = 'text-amber-300 bg-amber-950/80 border-amber-500/60 animate-pulse';
        } else if (isQueued) {
          statusText = `QUEUED: SLOT #${qPos?.position || 1} IN ${node.branch} QUEUE [CLICK TO REMOVE]`;
          statusBadgeStyle = 'text-amber-300 bg-amber-950/90 border-amber-400 font-bold animate-pulse';
        } else if (currentCapacity < requiredCapacity) {
          statusText = isHQ ? 'LOCKED: INSUFFICIENT HQ RESEARCH TOKENS' : 'LOCKED: INSUFFICIENT RESEARCH STATIONS';
          statusBadgeStyle = 'text-rose-400 bg-rose-950/80 border-rose-500/60';
        } else if (isInsufficient || nodeState.status === 'UNAVAILABLE') {
          statusText = 'UNAVAILABLE: INSUFFICIENT MATERIALS';
          statusBadgeStyle = 'text-rose-400 bg-rose-950/90 border-rose-500 font-bold';
        } else if (nodeState.status === 'AVAILABLE') {
          if (isBranchBusy) {
            statusText = `CLICK TO ADD TO QUEUE (Deducts -${costM.toLocaleString()} M / -${costO.toLocaleString()} O when started)`;
            statusBadgeStyle = 'text-amber-300 bg-amber-950/80 border-amber-500/60 font-bold';
          } else {
            statusText = `CLICK TO COMMIT: -${costM.toLocaleString()} M / -${costO.toLocaleString()} O`;
            statusBadgeStyle = 'text-emerald-300 bg-emerald-950/80 border-emerald-500/60 font-bold';
          }
        } else {
          statusText = nodeState.reason || 'LOCKED';
          statusBadgeStyle = 'text-rose-400 bg-rose-950/80 border-rose-500/60';
        }

        return (
          <div>
            {/* Header & Tech Classification */}
            <div className="border-b border-slate-800 pb-1.5 mb-2">
              <div className="flex items-center justify-between text-[10px] text-cyan-400 mb-0.5">
                <span className="font-bold tracking-wider">
                  {branchTitle} // TIER {ROMAN_NUMERALS[node.tier - 1] || node.tier}
                </span>
                <span className="text-amber-300 font-mono font-bold bg-slate-900 px-1.5 py-0.2 rounded border border-slate-700 text-[9px]">
                  ⏱️ {durationFormatted}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <h4 className="font-bold text-slate-100 text-sm tracking-wide leading-tight">
                  {node.name}
                </h4>
                <span className="text-slate-400 font-normal text-[10px]">{node.code}</span>
              </div>
            </div>

            {/* Station / Token Prerequisites */}
            <div className="text-[10px] mb-2 p-1.5 rounded bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">
                {isHQ ? 'HQ TOKEN PREREQUISITE:' : 'STATION PREREQUISITE:'}
              </span>
              <span
                className={`font-bold ${
                  currentCapacity >= requiredCapacity ? 'text-emerald-300' : 'text-rose-400'
                }`}
              >
                {isHQ
                  ? `Requires ${requiredCapacity} HQ Tokens (${currentCapacity}/${requiredCapacity})`
                  : `Requires ${node.tier} ${branchStationName} (${currentCapacity}/${node.tier})`}
              </span>
            </div>

            {/* Lockout Diagnostic Alert Box */}
            {nodeState.status === 'LOCKED' && (
              <div
                className="tooltip-alert-box"
                style={{
                  borderLeft: '4px solid #ff3344',
                  background: 'rgba(255, 40, 40, 0.12)',
                  padding: '8px 10px',
                  margin: '8px 0',
                  borderRadius: '2px 4px 4px 2px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ color: '#ff3344', fontWeight: 'bold', fontSize: '11px', letterSpacing: '0.5px' }}>
                  REASON:{' '}
                  {currentCapacity < requiredCapacity
                    ? isHQ
                      ? `HQ TOKEN DEFICIT: Requires ${requiredCapacity} HQ Research Tokens (Current: ${currentCapacity})`
                      : `FACILITY DEFICIT: Requires ${node.tier} ${branchStationName}`
                    : nodeState.reason || `PREREQUISITE LOCKED: Requires prior tier technologies`}
                </div>
                <div style={{ color: '#ffffff', fontSize: '11px', lineHeight: '1.3' }}>
                  TO UNLOCK:{' '}
                  {currentCapacity < requiredCapacity
                    ? isHQ
                      ? `Construct ${requiredCapacity - currentCapacity} additional research lab(s) of ANY type (MRS, CRO, or EXC) to generate required HQ tokens`
                      : `Construct ${node.tier - currentCapacity} additional ${branchStationName} via Builder or HQ Domestic menu`
                    : `Complete prerequisite research nodes in Archive [R]`}
                </div>
              </div>
            )}
            {nodeState.status === 'UNAVAILABLE' && (
              <div
                className="tooltip-alert-box"
                style={{
                  borderLeft: '4px solid #ff6644',
                  background: 'rgba(255, 40, 40, 0.12)',
                  padding: '8px 10px',
                  margin: '8px 0',
                  borderRadius: '2px 4px 4px 2px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ color: '#ff6644', fontWeight: 'bold', fontSize: '11px', letterSpacing: '0.5px' }}>
                  REASON: STOCKPILE DEFICIT: Insufficient materials in HQ storage
                </div>
                {(hasMetallicDeficit || hasOrganicDeficit) && (
                  <div style={{ color: '#f87171', fontWeight: 600, fontSize: '11px' }}>
                    SHORTAGE:{' '}
                    {hasMetallicDeficit ? `-${Math.round(costM - hqResources.metallic).toLocaleString()} Metallic ` : ''}
                    {hasOrganicDeficit ? `-${Math.round(costO - hqResources.organic).toLocaleString()} Organic` : ''}
                  </div>
                )}
                <div style={{ color: '#ffffff', fontSize: '11px', lineHeight: '1.3' }}>
                  TO UNLOCK: Mine raw ore with Autonomous Miners or expand HQ Refinery conversion tracks
                </div>
              </div>
            )}

            {/* Resource Cost & Live Deficits */}
            <div className="grid grid-cols-2 gap-1.5 mb-2 text-[10px]">
              <div
                className={`p-1.5 rounded border transition-colors ${
                  hasMetallicDeficit
                    ? 'bg-rose-950/70 border-rose-500 text-rose-300 ring-1 ring-rose-500/50'
                    : 'bg-slate-950/70 border-slate-800 text-slate-300'
                }`}
              >
                <div className={`text-[9px] ${hasMetallicDeficit ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
                  METALLIC COST:
                </div>
                <div className="font-bold">
                  {costM.toLocaleString()} MET{' '}
                  {hasMetallicDeficit ? (
                    <span className="text-rose-400 font-bold block mt-0.5">
                      MISSING: -{(costM - hqResources.metallic).toLocaleString()} MET
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-normal">[OK]</span>
                  )}
                </div>
              </div>

              <div
                className={`p-1.5 rounded border transition-colors ${
                  hasOrganicDeficit
                    ? 'bg-rose-950/70 border-rose-500 text-rose-300 ring-1 ring-rose-500/50'
                    : 'bg-slate-950/70 border-slate-800 text-slate-300'
                }`}
              >
                <div className={`text-[9px] ${hasOrganicDeficit ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
                  ORGANIC COST:
                </div>
                <div className="font-bold">
                  {costO.toLocaleString()} ORG{' '}
                  {hasOrganicDeficit ? (
                    <span className="text-rose-400 font-bold block mt-0.5">
                      MISSING: -{(costO - hqResources.organic).toLocaleString()} ORG
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-normal">[OK]</span>
                  )}
                </div>
              </div>
            </div>

            {/* Operational Status */}
            <div
              className={`px-2 py-1 rounded border text-[10px] font-bold text-center mb-2 ${statusBadgeStyle}`}
            >
              {statusText}
            </div>

            {/* Technical Benefit */}
            <div className="p-1.5 rounded bg-cyan-950/30 border border-cyan-500/40 text-[10px]">
              <div className="text-cyan-300 font-bold text-[9px] mb-0.5">TECHNICAL BENEFIT:</div>
              <div className="text-slate-200 leading-relaxed">{node.effects}</div>
            </div>
          </div>
        );
      })()}
    </div>
  );

  return (
    <ViewportTooltipPortal
      anchorRect={anchorRect}
      visible={Boolean(tooltip.visible && tooltip.payload)}
      content={content}
    />
  );
};

export const TacticalTooltipCard = CommandTooltipCard;
