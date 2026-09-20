# FORMATION WARS: MASTER ARCHITECTURE & SYSTEM DESIGN DOCUMENT
**Engine:** Unreal Engine 5.4/5.5 (Large World Coordinates)  
**Operator & Creative Director:** Marshall Hawke  
**Lead Systems Architect & Programmer:** AI Assistant  

---

## 1. TECHNICAL FOUNDATION & PERFORMANCE PHILOSOPHY
- **Movement Plane (Z=0):** Flat Z=0 planar gameplay. 100% of spatial simulation, collision, ranges, and AI occurs on an (X, Y) plane. NO 6DOF flight.
- **Visual/Simulation Decoupling:** Projectiles and missiles simulate on a flat 2D spline, while visual meshes add an artificial, deterministic parabolic Z-height curve ($Z = H_{max} \cdot \sin(\pi \cdot t)$) and lateral corkscrews for visual depth without 3D physics overhead.
- **Distance Calculations:** Range checks use flat 2D squared-distance formulas ($\Delta X^2 + \Delta Y^2 \le Range^2$), strictly bypassing 3D collision sweeps and continuous raycasts.
- **Kinematics:** Ships navigate along parametric cubic Hermite splines. Straight trajectories reward higher speed; turning requires wide arcs (false delta-V). Capital ships suffer lower acceleration and massive turning radii ("commitment traps").
- **Multiplayer Netcode:** Deterministic spline replication over Steam P2P. Server broadcasts spline parameters once upon command input; clients evaluate local ship positions deterministically.
- **Map Scale:** 1 continuous level containing 6–8 solar systems in an octagonal ring around a deep-space void (~25 km x 25 km Unreal play space).

---

## 2. SPATIAL GEOMETRY & TRANSIT RULES
- **Stellar Jump Limit:** Sits at ~2.1 AU (outside the main asteroid belt).
- **FTL Transit:** Permitted strictly outside 2.1 AU. Takes ~15–20s in an alternate dimension occluded from enemy sensors.
- **Sublight Crucible:** Inside 2.1 AU, strategic FTL is disabled. Travel requires 20 to 40 minutes of continuous sublight reaction thrust.
- **Tactical Micro-Jumps:** Capital ships can execute short-range tactical micro-jumps in-system to bypass minefields or defenses, but incur heavy hydrogen fuel costs and massive thermal signatures.
- **Planetary Wells:** Celestial bodies project local jump shadows (e.g. 30 light-seconds).

---

## 3. PROPULSION & LOGISTICS WARFARE
- **Hydrogen Mechanics:** Hydrogen is strictly an FTL and tactical jump propellant. Sublight reaction drives do not consume hydrogen.
- **40% Reserve Rule:** Initiating an Inter-System FTL jump requires a flat 40% of maximum internal hydrogen capacity. Dropping below 40% traps the fleet in-system until refueled.
- **The Fleet Train:**
  - Fleet Tankers: Provide AOE liquid hydrogen refueling.
  - Fleet Colliers: Provide AOE rearming of metallic missile magazines.
  - Colliers must physically load at the HQ Orbital and accompany the fleet; no magical resource wallets.
- **Underway Replenishment (UNREP):**
  - Drifting UNREP: Fleet moves slowly on a fixed spline; transfer rate is 33% efficiency.
  - Cold-Stop UNREP: Fleet halts completely (0 km/s); transfer rate is 100%, but fleet is vulnerable to ambush.
- **Magazine Exhaustion:** Warships draining missile magazines must close to 400k km beam suicide range, withdraw to colliers for UNREP, or abort.

---

## 4. DYNAMIC ECONOMY
- Bulk Resources: Metallic Base and Semi-Organic Base.
- Strategic Trace Elements: Extracted at 1:12,000 baseline (upgradable to 1:5,000 via research).
- Dynamic Unit Cap: No hard supply limit. Ship construction limited strictly by strategic trace elements.
- Heavy Mining Craft: Battlecruiser-sized industrial vessels that harvest asteroid clusters and haul raw ore to refineries.
- Refineries: Moved via 2 Heavy Tugs. "Refinery Triangle" vertex focus grants +50% yield multiplier.
- Freight Corridors: Forward refineries use automated freighters to haul refined ingots back to HQ.

---

## 5. 5-LAYER COMBAT LADDER & SENSORS
- **Engagement Envelopes:**
  - Standoff Missile Range: 7,000,000 to 8,000,000 km.
  - Mutual Suicide Beam Range: <= 400,000 km. Inverse-square law, 0 ammo, massive sustained DPS.
- **The 5 Defense Layers:**
  1. E-War (Soft Kill): Direct percentage degradation of missile lock accuracy.
  2. Counter-Missiles (Hard Kill): Range is 1/12th to 1/8th of missile range. Intercept roll against warheads.
  3. Point-Defense Phased Array Lasers (PDPLA): Range <= 400k km. High cyclic rate.
  4. Thermal Deflector Shields: Massive HP pool, but continuous fire saturates thermal radiators, forcing a 1–5 second complete shutdown to cool before full restore.
  5. Hull: Extremely thin structural plating; vulnerable to critical subsystem failures.
- **Dual-Layer Fog of War:**
  - Layer 1 (Passive EM/Gravimetric): Detected across AUs. Renders as amorphous red blobs displaying aggregate mass.
  - Layer 2 (Tactical Radar): 3x to 6x max missile range. Fully resolves 3D hulls and subsystems.
  - Footprint Magnification System (FMS): E-War module that artificially inflates or dampens passive signatures.

---

## 6. HULL LIFECYCLE & JUMP GATES
- **Hull States:**
  - Operational: Combat-capable.
  - Crippled: HP hits 0. SAR cold-gas thrusters halt derelict. Cripple bar active.
  - Frame Buckling (<50% Cripple Bar): Permanent frame damage, permanently capping maximum repairable HP to 50%.
  - Destroyed (0% Cripple Bar): Frame shatters into non-repairable scrap (10% scrap floor). Drops completely from Layer 1 EM Mass projection.
- **Jump Gates:**
  - Symmetric physics: completely blind to friend-or-foe; enemy fleets can transit.
  - 300-second (5 min) shutdown cycle; 300-second self-destruct cycle. Immobile once built.
- **Win Condition:** Total decapitation and destruction of the enemy homeworld.
