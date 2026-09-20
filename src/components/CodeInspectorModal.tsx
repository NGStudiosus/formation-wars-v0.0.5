import React, { useState, useRef, useEffect } from 'react';
import { X, Copy, Check, FileCode, Layers, BookOpen, Terminal } from 'lucide-react';

interface CodeInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CodeInspectorModal: React.FC<CodeInspectorModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'python' | 'ue5' | 'architecture'>('python');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const pythonCode = `"""
FORMATION WARS - Core Systems Verification Prototype (Milestone 1 - Revision 1.4 - Optimized)
Role: Lead Systems Architect & C++ / Python Programmer
Client / Operator: Marshall Hawke, Creative Director

ARCHITECTURAL & SYSTEM OPTIMIZATIONS (Rev 1.4):
1. Algorithmic Threat Bucketing: Replaced O(N*M) ship-threat filtering with an O(M + N) single-pass
   hash map bucket, dramatically accelerating high-volume missile barrages.
2. Strict Squared-Distance Kinematics: Eliminated math.sqrt from all inner loops (radar detection,
   UNREP logistics transfer, weapon envelopes, collision detection).
3. Alpha Surface Pooling: Eliminated per-frame pygame.Surface allocations for EM mass blobs and
   thermal shields, eradicating garbage collector frame-time stutter.
4. Auto-Fire & Threat Engagement: Vanguard-01 automated standoff fire logic with targeting priority
   and distance-squared gating; optional Hostile Counter-Battery simulation toggle.
5. In-flight Parabolic Trails: Dynamic multi-stage rocket burn particles with cached visual offsets.
6. Real-time Telemetry Bench: Live computational profiling (Tick ms, Render ms, Entity Counter).
"""

# To run locally:
# pip install pygame
# python formation_wars_sim.py
# (See /formation_wars_sim.py in workspace root for full source)`;

  const ue5CppCode = `// =============================================================================
// Unreal Engine 5.4/5.5 Production Architecture - Formation Wars
// Module: FormationWarsRuntime
// =============================================================================

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Engine/DataTable.h"
#include "FormationShipTypes.generated.h"

// -----------------------------------------------------------------------------
// 1. DATA TABLE SCHEMAS (DataTable: DT_ShipConfigurations)
// -----------------------------------------------------------------------------
UENUM(BlueprintType)
enum class EFormationHullRole : uint8
{
    Cruiser UMETA(DisplayName = "Cruiser (Vanguard Class)"),
    Collier UMETA(DisplayName = "Collier (Atlas Logistics)"),
    Battlecruiser UMETA(DisplayName = "Battlecruiser (Capital Dread)"),
    Destroyer UMETA(DisplayName = "Escort Destroyer"),
    Tanker UMETA(DisplayName = "Fleet Tanker (Cryo Fuel Pods)"),
    Repair UMETA(DisplayName = "Fleet Repair Ship (Gantry Arms)"),
    Scrap UMETA(DisplayName = "Scrap Barge (Catamaran Salvage)")
};

USTRUCT(BlueprintType)
struct FFormationShipStats : public FTableRowBase
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Hull")
    float MaxHullHP = 400.f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Hull")
    float CrippleBarMax = 350.f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Shields")
    float MaxShieldHP = 800.f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Shields")
    float RadiatorCoolingRate = 12.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Propulsion")
    float MaxH2Propellant = 1000.f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Propulsion")
    float FTLReserveRule = 0.40f; // Trapped if < 40%

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ordnance")
    int32 MissileCapacity = 450;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ordnance")
    int32 CounterMissileCapacity = 50;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "E-War")
    float EWarJammingRating = 0.35f; // 35% lock disruption
};

// -----------------------------------------------------------------------------
// 2. HERMITE SPLINE KINEMATICS COMPONENT (Z=0 Planar Movement)
// -----------------------------------------------------------------------------
UCLASS(ClassGroup = (FormationWars), meta = (BlueprintSpawnableComponent))
class FORMATIONWARSRUNTIME_API UHermiteSplineKinematicsComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UHermiteSplineKinematicsComponent();

    // Deterministic Parametric Cubic Hermite Evaluation
    UFUNCTION(BlueprintPure, Category = "Kinematics")
    FVector2D EvaluateSpline(float ParamT) const
    {
        const float T2 = ParamT * ParamT;
        const float T3 = T2 * ParamT;
        const float H00 = 2.0f * T3 - 3.0f * T2 + 1.0f;
        const float H10 = T3 - 2.0f * T2 + ParamT;
        const float H01 = -2.0f * T3 + 3.0f * T2;
        const float H11 = T3 - T2;
        return P0 * H00 + M0 * H10 + P1 * H01 + M1 * H11;
    }

    // Set Waypoint Order enforcing false delta-V and turning radius commitment
    UFUNCTION(BlueprintCallable, Category = "Kinematics")
    void SetHermiteWaypoint(FVector2D InTargetPos, float MaxSpeed)
    {
        P0 = CurrentPlanarPos;
        P1 = InTargetPos;
        const float Speed = CurrentVelocity.Length();
        const float TangentMag = FMath::Max(Speed * 1.5f, 140.0f);
        M0 = ForwardHeading * TangentMag;

        FVector2D Chord = P1 - P0;
        M1 = Chord.GetSafeNormal() * TangentMag;
        SplineDuration = FMath::Max(Chord.Length() / FMath::Max(MaxSpeed, 50.f), 1.2f);
        SplineT = 0.0f;
        bSplineActive = true;
    }

protected:
    UPROPERTY(Replicated)
    FVector2D P0;
    UPROPERTY(Replicated)
    FVector2D M0;
    UPROPERTY(Replicated)
    FVector2D P1;
    UPROPERTY(Replicated)
    FVector2D M1;

    float SplineT = 0.0f;
    float SplineDuration = 1.0f;
    bool bSplineActive = false;
    FVector2D CurrentPlanarPos;
    FVector2D CurrentVelocity;
    FVector2D ForwardHeading;
};

// -----------------------------------------------------------------------------
// 3. DEFENSE LADDER SUBSYSTEM (5-Layer Combat Ladder)
// -----------------------------------------------------------------------------
UCLASS()
class FORMATIONWARSRUNTIME_API UFormationDefenseLadderSubsystem : public UWorldSubsystem
{
    GENERATED_BODY()

public:
    // Resolves terminal warhead impact against the 5-layer hierarchy
    bool ResolveMissileImpact(class AFormationShip* TargetShip, float WarheadDamage)
    {
        if (!TargetShip) return false;

        // Layer 1: E-War Soft-Kill Lock Disruption
        if (FMath::FRand() < TargetShip->GetEWarRating())
        {
            OnCombatEvent.Broadcast(TEXT("E-War Soft-Kill Jamming Deflected Warhead!"));
            return false; // Intercepted
        }

        // Layer 4: Thermal Deflector Shields
        if (!TargetShip->IsShieldOverheated() && TargetShip->GetShieldHP() > 0.0f)
        {
            TargetShip->ApplyShieldDamage(WarheadDamage);
            return true;
        }

        // Layer 5: Direct Hull Impact
        TargetShip->ApplyHullDamage(WarheadDamage);
        return true;
    }

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnCombatEvent, const FString&, Message);
    UPROPERTY(BlueprintAssignable)
    FOnCombatEvent OnCombatEvent;
};`;

  const architectureDoc = `# FORMATION WARS: ARCHITECTURE OVERVIEW

1. Flat Z=0 Kinematics:
   - 100% of collision, pathfinding, weapon ranges, and AI occurs strictly on a flat (X, Y) plane.
   - Projectiles decouple visual meshes (parabolic Z arcs) from planar 2D simulation.

2. Hermite Splines:
   - Ships navigate along parametric cubic Hermite splines.
   - Acceleration dwells and wide turning radii enforce tactical "commitment traps."

3. 5-Layer Defense Ladder:
   - Layer 1: E-War Soft-Kill Lock Degradation
   - Layer 2: Counter-Missiles (Hard Kill)
   - Layer 3: Point-Defense Phased Array Lasers (PDPLA)
   - Layer 4: Thermal Deflector Shields (Radiator heat saturation)
   - Layer 5: Hull Lifecycle (Operational -> Crippled -> Buckled -> Destroyed)

4. Physical Fleet Logistics:
   - Fleet Colliers conduct Underway Replenishment (UNREP).
   - Drifting UNREP (33% rate) vs Cold-Stop UNREP (100% rate).
   - Liquid Hydrogen strictly fuels FTL and tactical micro-jumps (<40% reserve traps fleet).`;

  const copyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = () => {
    let textToCopy = '';
    if (activeTab === 'python') textToCopy = pythonCode;
    else if (activeTab === 'ue5') textToCopy = ue5CppCode;
    else textToCopy = architectureDoc;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    if (copyTimeoutRef.current !== null) {
      window.clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-mono select-none">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-950 border border-slate-700/80 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <FileCode className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100">
                Code & Systems Architecture Inspector
              </h2>
              <p className="text-[11px] text-slate-400">For Engine Operator & Creative Director Marshall Hawke</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-slate-800 bg-slate-900/30 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('python')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition cursor-pointer ${
                activeTab === 'python'
                  ? 'bg-indigo-600/30 border border-indigo-500/80 text-indigo-200 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Optimized Python Sim (Rev 1.4)</span>
            </button>

            <button
              onClick={() => setActiveTab('ue5')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition cursor-pointer ${
                activeTab === 'ue5'
                  ? 'bg-indigo-600/30 border border-indigo-500/80 text-indigo-200 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Unreal Engine 5.4 C++ Schemas</span>
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition cursor-pointer ${
                activeTab === 'architecture'
                  ? 'bg-indigo-600/30 border border-indigo-500/80 text-indigo-200 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Design Pillars (.md)</span>
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Code Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#090d14] select-text">
          <pre className="font-mono text-xs text-slate-300 leading-relaxed whitespace-pre">
            {activeTab === 'python' && pythonCode}
            {activeTab === 'ue5' && ue5CppCode}
            {activeTab === 'architecture' && architectureDoc}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex justify-between items-center text-[11px] text-slate-500">
          <span>Files available in workspace: /formation_wars_sim.py and /FORMATION_WARS_DESIGN.md</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-slate-100 font-bold text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
