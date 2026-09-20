"""
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

import sys
import math
import random
import time
import collections
import traceback
import pygame
from typing import List, Tuple, Optional, Dict

# =============================================================================
# CONSTANTS & CONFIGURATION
# =============================================================================
SCREEN_WIDTH = 1440
SCREEN_HEIGHT = 900
FPS = 60

# Palette (Tactical Sci-Fi HUD)
COLOR_BG = (8, 12, 18)
COLOR_GRID = (16, 26, 38)
COLOR_UI_PANEL = (12, 20, 30, 235)
COLOR_UI_BORDER = (45, 80, 115)
COLOR_TEXT_BRIGHT = (220, 235, 245)
COLOR_TEXT_MUTED = (110, 140, 165)
COLOR_TEXT_WARN = (255, 180, 50)
COLOR_TEXT_CRIT = (255, 60, 60)

COLOR_FRIENDLY = (60, 180, 255)
COLOR_COLLIER = (80, 220, 140)
COLOR_HOSTILE = (255, 70, 70)
COLOR_HOSTILE_BLOB = (255, 40, 40, 90)
COLOR_SHIELD = (100, 200, 255)
COLOR_HEAT = (255, 120, 30)
COLOR_HULL = (180, 195, 210)
COLOR_CRIPPLE = (255, 50, 50)
COLOR_MISSILE = (255, 215, 0)
COLOR_CM = (150, 255, 200)
COLOR_BEAM = (120, 220, 255)
COLOR_SPLINE = (0, 235, 165)

# Precomputed Range Constants (Squared to prevent expensive sqrt calls)
RADAR_RANGE = 750.0
RADAR_RANGE_SQ = RADAR_RANGE * RADAR_RANGE

MISSILE_RANGE = 1050.0
MISSILE_RANGE_SQ = MISSILE_RANGE * MISSILE_RANGE

UNREP_RANGE = 170.0
UNREP_RANGE_SQ = UNREP_RANGE * UNREP_RANGE

PDPLA_RANGE = 280.0
PDPLA_RANGE_SQ = PDPLA_RANGE * PDPLA_RANGE

CM_MIN_RANGE_SQ = 280.0 * 280.0
CM_MAX_RANGE_SQ = 550.0 * 550.0

MISSILE_HIT_DIST_SQ = 16.0 * 16.0
CM_HIT_DIST_SQ = 18.0 * 18.0

# =============================================================================
# OPTIMIZED VECTOR MATH & HERMITE SPLINES
# =============================================================================
class Vec2:
    __slots__ = ('x', 'y')
    def __init__(self, x: float = 0.0, y: float = 0.0):
        self.x = float(x)
        self.y = float(y)

    def __add__(self, o: 'Vec2') -> 'Vec2': return Vec2(self.x + o.x, self.y + o.y)
    def __sub__(self, o: 'Vec2') -> 'Vec2': return Vec2(self.x - o.x, self.y - o.y)
    def __mul__(self, s: float) -> 'Vec2': return Vec2(self.x * s, self.y * s)
    def __truediv__(self, s: float) -> 'Vec2': return Vec2(self.x / s, self.y / s)

    def length_sq(self) -> float: return self.x * self.x + self.y * self.y
    def length(self) -> float: return math.sqrt(self.x * self.x + self.y * self.y)

    def normalized(self) -> 'Vec2':
        l_sq = self.x * self.x + self.y * self.y
        if l_sq > 0.000001:
            inv = 1.0 / math.sqrt(l_sq)
            return Vec2(self.x * inv, self.y * inv)
        return Vec2(0.0, 0.0)

    def angle(self) -> float: return math.atan2(self.y, self.x)
    def as_tuple(self) -> Tuple[int, int]: return (int(self.x), int(self.y))


def hermite_interpolate(p0: Vec2, m0: Vec2, p1: Vec2, m1: Vec2, t: float) -> Vec2:
    """Parametric Cubic Hermite evaluation at parameter t in [0, 1]."""
    t2 = t * t
    t3 = t2 * t
    h00 = 2.0 * t3 - 3.0 * t2 + 1.0
    h10 = t3 - 2.0 * t2 + t
    h01 = -2.0 * t3 + 3.0 * t2
    h11 = t3 - t2
    return Vec2(
        p0.x * h00 + m0.x * h10 + p1.x * h01 + m1.x * h11,
        p0.y * h00 + m0.y * h10 + p1.y * h01 + m1.y * h11
    )


# =============================================================================
# CAMERA
# =============================================================================
class Camera:
    def __init__(self, x: float, y: float, zoom: float = 1.0):
        self.pos = Vec2(x, y)
        self.zoom = zoom

    def world_to_screen(self, w_pos: Vec2) -> Tuple[int, int]:
        sx = int((w_pos.x - self.pos.x) * self.zoom + SCREEN_WIDTH * 0.5)
        sy = int((w_pos.y - self.pos.y) * self.zoom + SCREEN_HEIGHT * 0.5)
        return (sx, sy)

    def screen_to_world(self, s_pos: Tuple[int, int]) -> Vec2:
        wx = (s_pos[0] - SCREEN_WIDTH * 0.5) / self.zoom + self.pos.x
        wy = (s_pos[1] - SCREEN_HEIGHT * 0.5) / self.zoom + self.pos.y
        return Vec2(wx, wy)

    def zoom_at_mouse(self, mouse_screen: Tuple[int, int], factor: float):
        world_under_mouse = self.screen_to_world(mouse_screen)
        new_zoom = max(min(self.zoom * factor, 3.0), 0.25)
        if new_zoom == self.zoom:
            return
        self.zoom = new_zoom
        self.pos.x = world_under_mouse.x - (mouse_screen[0] - SCREEN_WIDTH * 0.5) / self.zoom
        self.pos.y = world_under_mouse.y - (mouse_screen[1] - SCREEN_HEIGHT * 0.5) / self.zoom


# =============================================================================
# PROJECTILES & TRAILS (Decoupled 2D Kinematics with Faux-3D Parabolic Arc)
# =============================================================================
class CounterMissile:
    __slots__ = ('pos', 'target', 'speed', 'alive')
    def __init__(self, origin: Vec2, target_missile):
        self.pos = Vec2(origin.x, origin.y)
        self.target = target_missile
        self.speed = 490.0
        self.alive = True

    def update(self, dt: float) -> bool:
        if not self.target or not self.target.alive:
            self.alive = False
            return False
        dx = self.target.pos.x - self.pos.x
        dy = self.target.pos.y - self.pos.y
        dist_sq = dx * dx + dy * dy
        if dist_sq <= CM_HIT_DIST_SQ:
            self.alive = False
            self.target.alive = False
            return True
        inv_dist = 1.0 / math.sqrt(dist_sq)
        step = self.speed * dt
        self.pos.x += dx * inv_dist * step
        self.pos.y += dy * inv_dist * step
        return False


class Missile:
    __slots__ = ('origin', 'pos', 'target', 'faction', 'speed', 'max_lifetime',
                 'lifetime', 'alive', 'damage', 'visual_seed', 'trail', 'trail_sample_timer')
    def __init__(self, origin: Vec2, target, faction: str):
        self.origin = Vec2(origin.x, origin.y)
        self.pos = Vec2(origin.x, origin.y)
        self.target = target
        self.faction = faction
        self.speed = 230.0
        self.max_lifetime = 20.0
        self.lifetime = 0.0
        self.alive = True
        self.damage = 160.0
        self.visual_seed = random.uniform(0.0, 100.0)
        self.trail: List[Vec2] = []
        self.trail_sample_timer = 0.0

    def update(self, dt: float) -> bool:
        if not self.alive or not self.target or self.target.hull_state == "DESTROYED":
            self.alive = False
            return False
        self.lifetime += dt
        if self.lifetime >= self.max_lifetime:
            self.alive = False
            return False

        dx = self.target.pos.x - self.pos.x
        dy = self.target.pos.y - self.pos.y
        dist_sq = dx * dx + dy * dy
        if dist_sq <= MISSILE_HIT_DIST_SQ:
            self.alive = False
            self.target.apply_hit(self.damage)
            return True

        inv_dist = 1.0 / math.sqrt(dist_sq)
        step = self.speed * dt
        self.pos.x += dx * inv_dist * step
        self.pos.y += dy * inv_dist * step

        # Exhaust trail accumulation
        self.trail_sample_timer += dt
        if self.trail_sample_timer >= 0.03:
            self.trail_sample_timer = 0.0
            self.trail.append(self.get_render_pos())
            if len(self.trail) > 12:
                self.trail.pop(0)

        return False

    def get_render_pos(self) -> Vec2:
        if not self.target:
            return self.pos
        tot_dx = self.target.pos.x - self.origin.x
        tot_dy = self.target.pos.y - self.origin.y
        tot_dist_sq = tot_dx * tot_dx + tot_dy * tot_dy
        cur_dx = self.pos.x - self.origin.x
        cur_dy = self.pos.y - self.origin.y
        cur_dist_sq = cur_dx * cur_dx + cur_dy * cur_dy
        progress = min(max(math.sqrt(cur_dist_sq / max(tot_dist_sq, 1.0)), 0.0), 1.0)
        z_offset = -math.sin(progress * math.pi) * 35.0
        corkscrew = math.cos(self.lifetime * 12.0 + self.visual_seed) * 3.0
        return Vec2(self.pos.x + corkscrew, self.pos.y + z_offset)


# =============================================================================
# SHIP ENTITY
# =============================================================================
class Ship:
    def __init__(self, name: str, faction: str, role: str, x: float, y: float):
        self.name = name
        self.faction = faction
        self.role = role
        self.pos = Vec2(x, y)
        self.velocity = Vec2(0.0, 0.0)
        self.heading = 0.0
        self.max_speed = 110.0 if role == "COLLIER" else 150.0

        # Hermite Spline Flight
        self.spline_active = False
        self.spline_p0 = Vec2()
        self.spline_m0 = Vec2()
        self.spline_p1 = Vec2()
        self.spline_m1 = Vec2()
        self.spline_t = 0.0
        self.spline_duration = 1.0

        # Propulsion & Hydrogen
        self.h2_fuel_max = 1000.0
        self.h2_fuel = 1000.0
        self.fuel_reserve_rule = 0.40

        # Ordnance Magazines
        if name == "Vanguard-01":
            self.missiles_max = 450
        elif role == "COLLIER":
            self.missiles_max = 2000
        elif role == "CRUISER":
            self.missiles_max = 96
        else:
            self.missiles_max = 144

        self.missiles = float(self.missiles_max)
        self.counter_missiles = 120 if role == "COLLIER" else 50
        self.missile_cooldown = 0.0
        self.missile_range = MISSILE_RANGE
        self.missile_range_sq = MISSILE_RANGE_SQ

        # Automated Engagement & Combat Stances ("PASSIVE", "DEFENSIVE", "AGGRESSIVE")
        self.combat_stance = "DEFENSIVE"
        self.auto_fire = False

        # Layer 1: E-War Soft-Kill Jamming
        self.ewar_jamming_rating = 0.35 if role == "CRUISER" else 0.15

        # Layer 3: PDPLA (Point Defense Phased Array Lasers)
        self.pdpla_range = PDPLA_RANGE
        self.pdpla_range_sq = PDPLA_RANGE_SQ
        self.pdpla_cooldown = 0.0
        self.pdpla_active_beam_target: Optional[Vec2] = None
        self.pdpla_beam_timer = 0.0

        # Layer 4: Thermal Deflector Shields
        self.shield_hp_max = 1200.0 if role == "BATTLECRUISER" else 800.0
        self.shield_hp = self.shield_hp_max
        self.shield_heat = 0.0
        self.shield_heat_max = 100.0
        self.shield_overheated = False
        self.shield_cooldown_timer = 0.0

        # Layer 5: Hull Lifecycle
        self.hull_max = 600.0 if role == "BATTLECRUISER" else 400.0
        self.hull_hp = self.hull_max
        self.max_repairable_hull = self.hull_max
        self.cripple_bar_max = 350.0
        self.cripple_bar = self.cripple_bar_max
        self.hull_state = "OPERATIONAL"
        self.permanent_frame_buckled = False

        # Sensors & Mass
        self.mass_rating = 48000.0 if role == "CRUISER" else (95000.0 if role == "BATTLECRUISER" else 65000.0)
        self.fms_active = False
        self.fms_multiplier = 3.5

    def set_spline_order(self, target_pos: Vec2):
        if self.hull_state == "DESTROYED":
            return
        self.spline_p0 = Vec2(self.pos.x, self.pos.y)
        self.spline_p1 = Vec2(target_pos.x, target_pos.y)

        forward_dir = Vec2(math.cos(self.heading), math.sin(self.heading))
        curr_speed = self.velocity.length()
        tangent_mag = max(curr_speed * 1.5, 140.0)
        self.spline_m0 = forward_dir * tangent_mag

        approach_dir = (self.spline_p1 - self.spline_p0).normalized()
        self.spline_m1 = approach_dir * tangent_mag

        chord_len = (self.spline_p1 - self.spline_p0).length()
        self.spline_duration = max(chord_len / self.max_speed, 1.2)
        self.spline_t = 0.0
        self.spline_active = True

    def execute_tactical_micro_jump(self, jump_vec: Vec2) -> bool:
        if self.hull_state != "OPERATIONAL":
            return False
        fuel_cost = 250.0
        if self.h2_fuel >= fuel_cost:
            self.h2_fuel -= fuel_cost
            self.pos = self.pos + jump_vec
            self.spline_active = False
            self.velocity = Vec2(0.0, 0.0)
            return True
        return False

    def update_fast(self, dt: float, my_threats: List[Missile], all_ships: List['Ship']) -> Tuple[List[CounterMissile], List[Missile]]:
        new_cms: List[CounterMissile] = []
        new_missiles: List[Missile] = []
        if self.hull_state == "DESTROYED":
            return new_cms, new_missiles

        # 1. Spline Kinematics
        if self.spline_active and self.hull_state == "OPERATIONAL":
            self.spline_t += dt / max(self.spline_duration, 0.01)
            if self.spline_t >= 1.0:
                self.spline_t = 1.0
                self.spline_active = False
                self.pos = self.spline_p1
                self.velocity = Vec2(0.0, 0.0)
            else:
                next_pos = hermite_interpolate(self.spline_p0, self.spline_m0, self.spline_p1, self.spline_m1, self.spline_t)
                dx = next_pos.x - self.pos.x
                dy = next_pos.y - self.pos.y
                if dx * dx + dy * dy > 0.001:
                    self.heading = math.atan2(dy, dx)
                    self.velocity = Vec2(dx / max(dt, 0.001), dy / max(dt, 0.001))
                self.pos = next_pos
        elif self.hull_state == "CRIPPLED":
            decay = max(1.0 - dt * 2.5, 0.0)
            self.velocity.x *= decay
            self.velocity.y *= decay
            self.pos.x += self.velocity.x * dt
            self.pos.y += self.velocity.y * dt

        # 2. Shield Radiator Dynamics
        if self.shield_overheated:
            self.shield_cooldown_timer -= dt
            if self.shield_cooldown_timer <= 0.0:
                self.shield_overheated = False
                self.shield_heat = 0.0
                self.shield_hp = self.shield_hp_max
        else:
            self.shield_heat = max(self.shield_heat - 12.0 * dt, 0.0)

        # 3. Interception Grid against Pre-Filtered Threats (PASSIVE = hold fire, never fire; DEFENSIVE/AGGRESSIVE = fire defensive ammo)
        if self.hull_state == "OPERATIONAL" and self.combat_stance != "PASSIVE":
            self.missile_cooldown = max(self.missile_cooldown - dt, 0.0)
            self.pdpla_cooldown = max(self.pdpla_cooldown - dt, 0.0)
            if self.pdpla_beam_timer > 0.0:
                self.pdpla_beam_timer -= dt
                if self.pdpla_beam_timer <= 0.0:
                    self.pdpla_active_beam_target = None

            for threat in my_threats:
                if not threat.alive:
                    continue
                dx = threat.pos.x - self.pos.x
                dy = threat.pos.y - self.pos.y
                d_sq = dx * dx + dy * dy

                # Layer 2: Counter-Missiles (Hostile: 7% chance; Friendly: 14% chance)
                cm_launch_prob = 0.07 if self.faction == "HOSTILE" else 0.14
                if CM_MIN_RANGE_SQ < d_sq <= CM_MAX_RANGE_SQ and self.counter_missiles > 0 and random.random() < cm_launch_prob:
                    self.counter_missiles -= 1
                    new_cms.append(CounterMissile(self.pos, threat))

                # Layer 3: PDPLA Lasers (Hostile: 36% hit rate; Friendly: 72% hit rate)
                elif d_sq <= self.pdpla_range_sq and self.pdpla_cooldown <= 0.0:
                    self.pdpla_cooldown = 0.20
                    self.pdpla_active_beam_target = Vec2(threat.pos.x, threat.pos.y)
                    self.pdpla_beam_timer = 0.08
                    pd_hit_chance = 0.36 if self.faction == "HOSTILE" else 0.72
                    if random.random() < pd_hit_chance:
                        threat.alive = False
                    break
        elif self.hull_state == "OPERATIONAL":
            self.missile_cooldown = max(self.missile_cooldown - dt, 0.0)
            self.pdpla_cooldown = max(self.pdpla_cooldown - dt, 0.0)

        # 4. Automated Combat Engagement (AGGRESSIVE Stance: fire on any enemy in range until dead)
        is_aggressive = self.combat_stance == "AGGRESSIVE" or self.auto_fire
        if is_aggressive and self.hull_state == "OPERATIONAL" and self.missiles > 0 and self.missile_cooldown <= 0.0:
            best_target = None
            closest_dist_sq = 1e12

            for s in all_ships:
                if s.faction != self.faction and s.hull_state != "DESTROYED":
                    dx = s.pos.x - self.pos.x
                    dy = s.pos.y - self.pos.y
                    dist_sq = dx * dx + dy * dy
                    if dist_sq <= self.missile_range_sq and dist_sq < closest_dist_sq:
                        closest_dist_sq = dist_sq
                        best_target = s

            if best_target:
                salvo_count = min(6, int(self.missiles))
                offsets = [
                    (-16.0, -10.0), (-16.0, 10.0),
                    (0.0, -14.0), (0.0, 14.0),
                    (16.0, -8.0), (16.0, 8.0)
                ]
                for i in range(salvo_count):
                    ox, oy = offsets[i]
                    new_missiles.append(Missile(Vec2(self.pos.x + ox, self.pos.y + oy), best_target, self.faction))

                self.missiles -= salvo_count
                self.missile_cooldown = 1.8

        # 5. UNREP Physical Logistics (Squared Distance Check)
        if self.role == "COLLIER" and self.hull_state == "OPERATIONAL":
            for ship in all_ships:
                if ship.faction == self.faction and ship != self and ship.hull_state == "OPERATIONAL":
                    dx = ship.pos.x - self.pos.x
                    dy = ship.pos.y - self.pos.y
                    if (dx * dx + dy * dy) <= UNREP_RANGE_SQ:
                        is_cold_stop = ship.velocity.length_sq() < 25.0 and self.velocity.length_sq() < 25.0
                        transfer_rate = 1.0 if is_cold_stop else 0.33

                        if ship.missiles < ship.missiles_max and self.missiles > 0:
                            qty = min(dt * 16.0 * transfer_rate, ship.missiles_max - ship.missiles, self.missiles)
                            ship.missiles += qty
                            self.missiles -= qty

                        if ship.h2_fuel < ship.h2_fuel_max and self.h2_fuel > 0:
                            f_qty = min(dt * 75.0 * transfer_rate, ship.h2_fuel_max - ship.h2_fuel, self.h2_fuel)
                            ship.h2_fuel += f_qty
                            self.h2_fuel -= f_qty

        return new_cms, new_missiles

    def apply_hit(self, damage: float):
        if self.hull_state == "DESTROYED":
            return

        if random.random() < self.ewar_jamming_rating:
            return

        if not self.shield_overheated and self.shield_hp > 0.0:
            self.shield_hp -= damage
            self.shield_heat += damage * 0.28
            if self.shield_heat >= self.shield_heat_max or self.shield_hp <= 0.0:
                self.shield_overheated = True
                self.shield_hp = 0.0
                self.shield_cooldown_timer = random.uniform(2.5, 4.5)
            return

        if self.hull_state == "OPERATIONAL":
            self.hull_hp -= damage
            if self.hull_hp <= 0.0:
                self.hull_hp = 0.0
                self.hull_state = "CRIPPLED"
                self.spline_active = False
        elif self.hull_state == "CRIPPLED":
            self.cripple_bar -= damage
            if self.cripple_bar < (self.cripple_bar_max * 0.5) and not self.permanent_frame_buckled:
                self.permanent_frame_buckled = True
                self.max_repairable_hull = self.hull_max * 0.50

            if self.cripple_bar <= 0.0:
                self.cripple_bar = 0.0
                self.hull_state = "DESTROYED"


# =============================================================================
# SIMULATION HARNESS WITH PERFORMANCE TELEMETRY
# =============================================================================
class FormationWarsSim:
    def __init__(self):
        pygame.init()
        pygame.display.set_caption("FORMATION WARS - Core Systems Engine (Rev 1.4 Optimized)")
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        self.clock = pygame.time.Clock()
        self.font = pygame.font.SysFont("Consolas", 13)
        self.font_bold = pygame.font.SysFont("Consolas", 15, bold=True)
        self.font_title = pygame.font.SysFont("Consolas", 20, bold=True)

        self.camera = Camera(0.0, 0.0, 0.95)
        self.panning = False
        self.pan_anchor = (0, 0)

        self.ships: List[Ship] = []
        self.missiles: List[Missile] = []
        self.counter_missiles: List[CounterMissile] = []
        self.selected_ship: Optional[Ship] = None

        # Auto-Fire Button Rect
        self.auto_fire_btn_rect = pygame.Rect(20, 270, 44, 44)

        self.gate_pos = Vec2(350, -250)
        self.gate_shutdown_timer = 0.0
        self.gate_shutting_down = False

        # Surface Cache for transparent shapes (avoids per-frame allocations)
        self._blob_surfaces: Dict[int, pygame.Surface] = {}
        self._shield_surfaces: Dict[int, pygame.Surface] = {}

        # Profiling Telemetry
        self.last_tick_ms = 0.0
        self.last_render_ms = 0.0

        self._seed_world()

    def _seed_world(self):
        player_flag = Ship("Vanguard-01", "FRIENDLY", "CRUISER", -200, 100)
        player_coll = Ship("Atlas-UNREP", "FRIENDLY", "COLLIER", -320, 160)
        hostile_dread = Ship("Goliath-IV", "HOSTILE", "BATTLECRUISER", 550, -100)
        hostile_escort = Ship("Scythe-02", "HOSTILE", "CRUISER", 680, -40)

        self.ships.extend([player_flag, player_coll, hostile_dread, hostile_escort])
        self.selected_ship = player_flag

    def _get_blob_surface(self, radius: int) -> pygame.Surface:
        if radius not in self._blob_surfaces:
            s = pygame.Surface((radius * 2, radius * 2), pygame.SRCALPHA)
            pygame.draw.circle(s, COLOR_HOSTILE_BLOB, (radius, radius), radius)
            self._blob_surfaces[radius] = s
        return self._blob_surfaces[radius]

    def handle_input(self):
        mouse_pos = pygame.mouse.get_pos()
        world_mouse = self.camera.screen_to_world(mouse_pos)
        keys = pygame.key.get_pressed()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit(0)

            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1:
                    if self.auto_fire_btn_rect.collidepoint(mouse_pos):
                        vanguard = next((s for s in self.ships if s.name == "Vanguard-01"), None)
                        if vanguard:
                            vanguard.auto_fire = not vanguard.auto_fire
                        continue

                    if keys[pygame.K_SPACE]:
                        self.panning = True
                        self.pan_anchor = mouse_pos
                        continue

                    # Ship selection with squared distance check
                    clicked_ship = None
                    for s in self.ships:
                        dx = s.pos.x - world_mouse.x
                        dy = s.pos.y - world_mouse.y
                        if (dx * dx + dy * dy) <= (34.0 * 34.0):
                            clicked_ship = s
                            break
                    if clicked_ship:
                        self.selected_ship = clicked_ship

                elif event.button == 2:
                    self.panning = True
                    self.pan_anchor = mouse_pos

                elif event.button == 3 and self.selected_ship:
                    if self.selected_ship.faction == "FRIENDLY":
                        self.selected_ship.set_spline_order(world_mouse)

            elif event.type == pygame.MOUSEBUTTONUP:
                if event.button in (1, 2):
                    self.panning = False

            elif event.type == pygame.MOUSEMOTION and self.panning:
                dx = mouse_pos[0] - self.pan_anchor[0]
                dy = mouse_pos[1] - self.pan_anchor[1]
                self.camera.pos.x -= dx / self.camera.zoom
                self.camera.pos.y -= dy / self.camera.zoom
                self.pan_anchor = mouse_pos

            elif event.type == pygame.MOUSEWHEEL:
                zoom_factor = 1.15 if event.y > 0 else (1.0 / 1.15)
                self.camera.zoom_at_mouse(mouse_pos, zoom_factor)

            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_a:
                    vanguard = next((s for s in self.ships if s.name == "Vanguard-01"), None)
                    if vanguard:
                        vanguard.auto_fire = not vanguard.auto_fire

                elif event.key == pygame.K_f and self.selected_ship and self.selected_ship.faction == "FRIENDLY":
                    salvo_count = min(6, int(self.selected_ship.missiles))
                    if salvo_count > 0 and self.selected_ship.missile_cooldown <= 0.0:
                        targets = [s for s in self.ships if s.faction == "HOSTILE" and s.hull_state != "DESTROYED"]
                        if targets:
                            primary_target = targets[0]
                            offsets = [
                                (-16.0, -10.0), (-16.0, 10.0),
                                (0.0, -14.0), (0.0, 14.0),
                                (16.0, -8.0), (16.0, 8.0)
                            ]
                            for i in range(salvo_count):
                                ox, oy = offsets[i]
                                self.missiles.append(Missile(Vec2(self.selected_ship.pos.x + ox, self.selected_ship.pos.y + oy), primary_target, self.selected_ship.faction))

                            self.selected_ship.missiles -= salvo_count
                            self.selected_ship.missile_cooldown = 1.8

                elif event.key == pygame.K_j and self.selected_ship:
                    jump_vector = (world_mouse - self.selected_ship.pos).normalized() * 320.0
                    self.selected_ship.execute_tactical_micro_jump(jump_vector)

                elif event.key == pygame.K_m and self.selected_ship:
                    self.selected_ship.fms_active = not self.selected_ship.fms_active

                elif event.key == pygame.K_g:
                    self.gate_shutting_down = not self.gate_shutting_down

                elif event.key == pygame.K_h:
                    hostiles = [s for s in self.ships if s.faction == "HOSTILE" and s.hull_state != "DESTROYED"]
                    friendlies = [s for s in self.ships if s.faction == "FRIENDLY" and s.hull_state != "DESTROYED"]
                    if hostiles and friendlies:
                        for offset in [Vec2(-12, -8), Vec2(-12, 8), Vec2(0, 0)]:
                            self.missiles.append(Missile(hostiles[0].pos + offset, friendlies[0], "HOSTILE"))

    def update(self, dt: float):
        t0 = time.perf_counter()

        if self.gate_shutting_down:
            self.gate_shutdown_timer += dt

        # Single-pass threat bucketing: O(M)
        threat_buckets: Dict[Ship, List[Missile]] = collections.defaultdict(list)
        for m in self.missiles:
            if m.alive and m.target:
                threat_buckets[m.target].append(m)

        for ship in self.ships:
            my_threats = threat_buckets.get(ship, [])
            new_cms, new_missiles = ship.update_fast(dt, my_threats, self.ships)
            self.counter_missiles.extend(new_cms)
            self.missiles.extend(new_missiles)

        # In-place projectile updates
        self.counter_missiles = [cm for cm in self.counter_missiles if cm.alive and not cm.update(dt)]
        self.missiles = [m for m in self.missiles if m.alive and not m.update(dt)]

        self.last_tick_ms = (time.perf_counter() - t0) * 1000.0

    def draw_tactical_grid(self):
        spacing = int(100 * self.camera.zoom)
        if spacing <= 15:
            return
        origin_screen = self.camera.world_to_screen(Vec2(0, 0))
        start_x = origin_screen[0] % spacing
        start_y = origin_screen[1] % spacing

        for x in range(start_x, SCREEN_WIDTH, spacing):
            pygame.draw.line(self.screen, COLOR_GRID, (x, 0), (x, SCREEN_HEIGHT))
        for y in range(start_y, SCREEN_HEIGHT, spacing):
            pygame.draw.line(self.screen, COLOR_GRID, (0, y), (SCREEN_WIDTH, y))

    def draw_ship_vector(self, ship: Ship, friendly_ships: List[Ship]):
        screen_pos = self.camera.world_to_screen(ship.pos)
        r = 18.0 * self.camera.zoom
        angle = ship.heading
        cx, cy = screen_pos[0], screen_pos[1]

        # Fast radar proximity check using precomputed squared range
        is_player_near = False
        for s in friendly_ships:
            dx = s.pos.x - ship.pos.x
            dy = s.pos.y - ship.pos.y
            if dx * dx + dy * dy < RADAR_RANGE_SQ:
                is_player_near = True
                break

        if ship.hull_state == "DESTROYED":
            if not is_player_near:
                return
            pygame.draw.line(self.screen, (75, 80, 85), (cx - 10, cy - 10), (cx + 10, cy + 10), 2)
            pygame.draw.line(self.screen, (75, 80, 85), (cx + 10, cy - 10), (cx - 10, cy + 10), 2)
            lbl = self.font.render("WRECK [10% SCRAP]", True, (100, 110, 120))
            self.screen.blit(lbl, (cx - 48, cy + 14))
            return

        if ship.faction == "HOSTILE" and not is_player_near:
            mass_visual_size = max(int((ship.mass_rating * (ship.fms_multiplier if ship.fms_active else 1.0)) * 0.0008 * self.camera.zoom), 12)
            blob_surf = self._get_blob_surface(mass_visual_size)
            self.screen.blit(blob_surf, (screen_pos[0] - mass_visual_size, screen_pos[1] - mass_visual_size))
            mass_text = self.font.render(f"EM-MASS: {int(ship.mass_rating * (ship.fms_multiplier if ship.fms_active else 1.0))}t", True, COLOR_HOSTILE)
            self.screen.blit(mass_text, (screen_pos[0] - 45, screen_pos[1] + 18))
            return

        if ship.spline_active:
            pts = []
            steps = 20
            for i in range(steps + 1):
                t = i / float(steps)
                w_pt = hermite_interpolate(ship.spline_p0, ship.spline_m0, ship.spline_p1, ship.spline_m1, t)
                pts.append(self.camera.world_to_screen(w_pt))
            if len(pts) > 1:
                pygame.draw.lines(self.screen, COLOR_SPLINE, False, pts, 2)

        color = COLOR_FRIENDLY if ship.faction == "FRIENDLY" else COLOR_HOSTILE
        if ship.role == "COLLIER":
            color = COLOR_COLLIER
        if ship.hull_state == "CRIPPLED":
            color = COLOR_CRIPPLE

        cos_h = math.cos(angle)
        sin_h = math.sin(angle)
        fwd_x, fwd_y = cos_h, sin_h
        perp_x, perp_y = -sin_h, cos_h

        if ship.role == "CRUISER":
            bar_center_x = cx - fwd_x * (0.6 * r)
            bar_center_y = cy - fwd_y * (0.6 * r)
            bar_half_w = 0.95 * r

            bar_p1 = (int(bar_center_x + perp_x * bar_half_w), int(bar_center_y + perp_y * bar_half_w))
            bar_p2 = (int(bar_center_x - perp_x * bar_half_w), int(bar_center_y - perp_y * bar_half_w))

            tri_apex = (int(cx + fwd_x * (1.6 * r)), int(cy + fwd_y * (1.6 * r)))
            tri_base_x = cx - fwd_x * (0.4 * r)
            tri_base_y = cy - fwd_y * (0.4 * r)
            tri_half_w = 0.75 * r

            tri_p1 = (int(tri_base_x + perp_x * tri_half_w), int(tri_base_y + perp_y * tri_half_w))
            tri_p2 = (int(tri_base_x - perp_x * tri_half_w), int(tri_base_y - perp_y * tri_half_w))

            pygame.draw.line(self.screen, color, bar_p1, bar_p2, max(int(3 * self.camera.zoom), 2))
            pygame.draw.polygon(self.screen, color, [tri_apex, tri_p1, tri_p2], 2)

        elif ship.role == "COLLIER":
            poly_collier = [
                (int(cx + fwd_x * (1.2 * r)), int(cy + fwd_y * (1.2 * r))),
                (int(cx + fwd_x * (0.5 * r) + perp_x * (0.8 * r)), int(cy + fwd_y * (0.5 * r) + perp_x * (0.8 * r))),
                (int(cx - fwd_x * (1.1 * r) + perp_x * (0.8 * r)), int(cy - fwd_y * (1.1 * r) + perp_x * (0.8 * r))),
                (int(cx - fwd_x * (1.3 * r)), int(cy - fwd_y * (1.3 * r))),
                (int(cx - fwd_x * (1.1 * r) - perp_x * (0.8 * r)), int(cy - fwd_y * (1.1 * r) - perp_x * (0.8 * r))),
                (int(cx + fwd_x * (0.5 * r) - perp_x * (0.8 * r)), int(cy + fwd_y * (0.5 * r) - perp_x * (0.8 * r))),
            ]
            pygame.draw.polygon(self.screen, color, poly_collier, 2)
            pygame.draw.line(self.screen, color, (int(cx - fwd_x * r), int(cy - fwd_y * r)), (int(cx + fwd_x * r * 0.8), int(cy + fwd_y * r * 0.8)), 2)

        else:
            poly_bc = [
                (int(cx + fwd_x * 1.8 * r), int(cy + fwd_y * 1.8 * r)),
                (int(cx + perp_x * 1.1 * r), int(cy + perp_y * 1.1 * r)),
                (int(cx - fwd_x * 0.4 * r + perp_x * 0.5 * r), int(cy - fwd_y * 0.4 * r + perp_x * 0.5 * r)),
                (int(cx - fwd_x * 1.2 * r + perp_x * 1.1 * r), int(cy - fwd_y * 1.2 * r + perp_x * 1.1 * r)),
                (int(cx - fwd_x * 0.8 * r), int(cy - fwd_y * 0.8 * r)),
                (int(cx - fwd_x * 1.2 * r - perp_x * 1.1 * r), int(cy - fwd_y * 1.2 * r - perp_x * 1.1 * r)),
                (int(cx - fwd_x * 0.4 * r - perp_x * 0.5 * r), int(cy - fwd_y * 0.4 * r - perp_x * 0.5 * r)),
                (int(cx - perp_x * 1.1 * r), int(cy - perp_y * 1.1 * r)),
            ]
            pygame.draw.polygon(self.screen, color, poly_bc, 2)

        if ship == self.selected_ship:
            pygame.draw.circle(self.screen, (255, 255, 255), (cx, cy), max(int(r * 2.3), 16), 1)

        if not ship.shield_overheated and ship.shield_hp > 0.0:
            s_radius = max(int(r * 1.9), 12)
            alpha_val = int(80 * (ship.shield_hp / ship.shield_hp_max))
            key = (s_radius, alpha_val)
            if key not in self._shield_surfaces:
                surf = pygame.Surface((s_radius * 2, s_radius * 2), pygame.SRCALPHA)
                pygame.draw.circle(surf, (100, 200, 255, alpha_val), (s_radius, s_radius), s_radius, 2)
                self._shield_surfaces[key] = surf
            self.screen.blit(self._shield_surfaces[key], (cx - s_radius, cy - s_radius))

        if ship.pdpla_active_beam_target:
            beam_screen = self.camera.world_to_screen(ship.pdpla_active_beam_target)
            pygame.draw.line(self.screen, COLOR_BEAM, (cx, cy), beam_screen, 2)

        bar_w = 44
        bx = cx - bar_w // 2
        by = cy - int(r * 2.2)

        if ship.hull_state == "OPERATIONAL":
            h_ratio = max(min(ship.hull_hp / ship.hull_max, 1.0), 0.0)
            pygame.draw.rect(self.screen, (30, 30, 30), (bx, by, bar_w, 4))
            pygame.draw.rect(self.screen, COLOR_HULL, (bx, by, int(bar_w * h_ratio), 4))
        elif ship.hull_state == "CRIPPLED":
            c_ratio = max(min(ship.cripple_bar / ship.cripple_bar_max, 1.0), 0.0)
            pygame.draw.rect(self.screen, (30, 30, 30), (bx, by, bar_w, 4))
            pygame.draw.rect(self.screen, COLOR_CRIPPLE, (bx, by, int(bar_w * c_ratio), 4))

        heat_ratio = max(min(ship.shield_heat / ship.shield_heat_max, 1.0), 0.0)
        pygame.draw.rect(self.screen, (30, 30, 30), (bx, by + 5, bar_w, 3))
        pygame.draw.rect(self.screen, COLOR_HEAT, (bx, by + 5, int(bar_w * heat_ratio), 3))

    def draw_projectiles(self):
        for m in self.missiles:
            if len(m.trail) >= 2:
                for i in range(len(m.trail) - 1):
                    p1 = self.camera.world_to_screen(m.trail[i])
                    p2 = self.camera.world_to_screen(m.trail[i + 1])
                    factor = (i + 1) / float(len(m.trail))
                    t_col = (
                        int(140 + 115 * factor),
                        int(50 + 160 * factor),
                        int(20 + 30 * factor)
                    )
                    pygame.draw.line(self.screen, t_col, p1, p2, 2 if factor > 0.5 else 1)

            sp = self.camera.world_to_screen(m.get_render_pos())
            pygame.draw.circle(self.screen, COLOR_MISSILE, sp, 3)

            shadow_sp = self.camera.world_to_screen(m.pos)
            pygame.draw.circle(self.screen, (50, 70, 90), shadow_sp, 2)
            pygame.draw.line(self.screen, (40, 60, 80), sp, shadow_sp, 1)

        for cm in self.counter_missiles:
            sp = self.camera.world_to_screen(cm.pos)
            pygame.draw.circle(self.screen, COLOR_CM, sp, 2)

    def draw_structures(self):
        sp = self.camera.world_to_screen(self.gate_pos)
        r = max(int(38 * self.camera.zoom), 10)
        pygame.draw.circle(self.screen, (120, 160, 220), sp, r, 3)
        pygame.draw.circle(self.screen, (60, 100, 160), sp, max(int(r * 0.4), 4), 2)
        status_txt = f"JUMP GATE [300s SHUTDOWN: {int(self.gate_shutdown_timer)}s]" if self.gate_shutting_down else "JUMP GATE [ACTIVE / SYMMETRIC]"
        lbl = self.font.render(status_txt, True, COLOR_TEXT_MUTED)
        self.screen.blit(lbl, (sp[0] - 90, sp[1] + r + 8))

    def draw_hud(self):
        # Telemetry Box
        panel = pygame.Surface((380, 255), pygame.SRCALPHA)
        panel.fill(COLOR_UI_PANEL)
        self.screen.blit(panel, (20, 20))
        pygame.draw.rect(self.screen, COLOR_UI_BORDER, (20, 20, 380, 255), 1)

        if self.selected_ship:
            s = self.selected_ship
            y = 30
            title = self.font_title.render(f"{s.name} [{s.role}]", True, COLOR_FRIENDLY if s.faction == "FRIENDLY" else COLOR_HOSTILE)
            self.screen.blit(title, (32, y))
            y += 26

            state_color = COLOR_TEXT_BRIGHT if s.hull_state == "OPERATIONAL" else COLOR_TEXT_CRIT
            self.screen.blit(self.font.render(f"HULL STATE: {s.hull_state}", True, state_color), (32, y))
            if s.permanent_frame_buckled:
                self.screen.blit(self.font.render("[FRAME BUCKLED - 50% CAP]", True, COLOR_TEXT_CRIT), (170, y))
            y += 18

            h_txt = f"HULL HP: {int(s.hull_hp)} / {int(s.max_repairable_hull)}" if s.hull_state == "OPERATIONAL" else f"CRIPPLE BAR: {int(s.cripple_bar)} / {int(s.cripple_bar_max)}"
            self.screen.blit(self.font.render(h_txt, True, COLOR_TEXT_BRIGHT), (32, y))
            y += 18

            s_stat = "OVERHEATED (COOLING DUMP)" if s.shield_overheated else f"{int(s.shield_hp)} / {int(s.shield_hp_max)}"
            self.screen.blit(self.font.render(f"SHIELD DEFLECTOR: {s_stat}", True, COLOR_SHIELD if not s.shield_overheated else COLOR_TEXT_CRIT), (32, y))
            y += 18
            self.screen.blit(self.font.render(f"RADIATOR HEAT: {int(s.shield_heat)}% / 100%", True, COLOR_HEAT), (32, y))
            y += 18

            f_warn = " [LOCKED: <40% FTL RESERVE]" if (s.h2_fuel / s.h2_fuel_max) < s.fuel_reserve_rule else ""
            f_color = COLOR_TEXT_CRIT if f_warn else COLOR_TEXT_BRIGHT
            self.screen.blit(self.font.render(f"H2 PROPELLANT: {int(s.h2_fuel)} / {int(s.h2_fuel_max)}{f_warn}", True, f_color), (32, y))
            y += 18

            self.screen.blit(self.font.render(f"MISSILE MAGAZINE: {int(s.missiles)} / {int(s.missiles_max)}", True, COLOR_TEXT_BRIGHT), (32, y))
            y += 18
            self.screen.blit(self.font.render(f"COUNTER-MISSILES: {int(s.counter_missiles)} | E-WAR JAM: {int(s.ewar_jamming_rating * 100)}%", True, COLOR_TEXT_BRIGHT), (32, y))
            y += 18

            self.screen.blit(self.font.render(f"SUB-LIGHT VELOCITY: {int(s.velocity.length())} km/s", True, COLOR_TEXT_MUTED), (32, y))
            y += 18

            # Realtime Profiling
            self.screen.blit(self.font.render(f"SIM TICK: {self.last_tick_ms:.2f}ms | RENDER: {self.last_render_ms:.2f}ms | FPS: {int(self.clock.get_fps())}", True, (70, 210, 160)), (32, y))

        # Auto-Fire Button
        vanguard = next((s for s in self.ships if s.name == "Vanguard-01"), None)
        is_auto_active = vanguard.auto_fire if vanguard else False

        bx, by, bw, bh = self.auto_fire_btn_rect
        cx = bx + bw // 2
        cy = by + bh // 2

        btn_bg_col = (120, 20, 20, 230) if is_auto_active else (16, 26, 38, 200)
        btn_border_col = COLOR_TEXT_CRIT if is_auto_active else COLOR_UI_BORDER
        btn_icon_col = (255, 70, 70) if is_auto_active else (130, 160, 185)

        btn_surf = pygame.Surface((bw, bh), pygame.SRCALPHA)
        btn_surf.fill(btn_bg_col)
        self.screen.blit(btn_surf, (bx, by))
        pygame.draw.rect(self.screen, btn_border_col, self.auto_fire_btn_rect, 2)

        pygame.draw.circle(self.screen, btn_icon_col, (cx, cy), 13, 1)
        pygame.draw.line(self.screen, btn_icon_col, (cx - 16, cy), (cx - 10, cy), 1)
        pygame.draw.line(self.screen, btn_icon_col, (cx + 10, cy), (cx + 16, cy), 1)
        pygame.draw.line(self.screen, btn_icon_col, (cx, cy - 16), (cx, cy - 10), 1)
        pygame.draw.line(self.screen, btn_icon_col, (cx, cy + 10), (cx, cy + 16), 1)

        play_poly = [
            (cx + 6, cy),
            (cx - 4, cy - 6),
            (cx - 4, cy + 6)
        ]
        pygame.draw.polygon(self.screen, btn_icon_col, play_poly)

        status_lbl = "AUTO-FIRE ENGAGED [A]" if is_auto_active else "AUTO-FIRE STANDBY [A]"
        lbl_col = COLOR_TEXT_CRIT if is_auto_active else COLOR_TEXT_MUTED
        self.screen.blit(self.font_bold.render(status_lbl, True, lbl_col), (bx + bw + 12, by + 13))

        # Controls Panel
        legend_panel = pygame.Surface((440, 175), pygame.SRCALPHA)
        legend_panel.fill(COLOR_UI_PANEL)
        self.screen.blit(legend_panel, (SCREEN_WIDTH - 460, 20))
        pygame.draw.rect(self.screen, COLOR_UI_BORDER, (SCREEN_WIDTH - 460, 20, 440, 175), 1)

        controls = [
            "OPERATOR CONTROLS (REV 1.4 OPTIMIZED):",
            "Left Click: Select Ship / Toggle Auto-Fire UI",
            "Right Click: Generate Hermite Trajectory",
            "[A]: Toggle Auto-Fire Standoff Engagement",
            "[F]: Manual 6-Missile Salvo Fire",
            "[J]: Tactical Micro-Jump (Burns 250 H2 Propellant)",
            "[H]: Trigger Inbound Enemy Salvo",
            "[M]: Toggle FMS Spoofing",
            "[G]: Toggle Jump Gate 300s Shutdown Sequence",
            "Middle Click Drag / Space+Left Drag: Pan",
            "Mouse Wheel: Cursor-Focused Smooth Zoom",
        ]
        ky = 26
        for c in controls:
            col = COLOR_TEXT_BRIGHT if "OPERATOR" in c else COLOR_TEXT_MUTED
            self.screen.blit(self.font.render(c, True, col), (SCREEN_WIDTH - 446, ky))
            ky += 14

    def render(self):
        t0 = time.perf_counter()
        self.screen.fill(COLOR_BG)
        self.draw_tactical_grid()
        self.draw_structures()

        friendly_ships = [s for s in self.ships if s.faction == "FRIENDLY"]
        for ship in self.ships:
            self.draw_ship_vector(ship, friendly_ships)

        self.draw_projectiles()
        self.draw_hud()
        pygame.display.flip()
        self.last_render_ms = (time.perf_counter() - t0) * 1000.0

    def run(self):
        while True:
            raw_dt = self.clock.tick(FPS) / 1000.0
            dt = min(max(raw_dt, 0.001), 0.1)

            self.handle_input()
            self.update(dt)
            self.render()


if __name__ == "__main__":
    try:
        app = FormationWarsSim()
        app.run()
    except Exception as e:
        print("\n--- CRITICAL SIMULATION ERROR ---")
        traceback.print_exc()
        pygame.quit()
        sys.exit(1)
