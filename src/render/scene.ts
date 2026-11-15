import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { Session } from '../game/session';
import type { Move } from '../engine/types';
import type { MoveResult } from '../engine/puzzle';
import { skinById, themeById, type BlockSkin, type BoardTheme } from './skins';
import { arrowTexture, frostTexture, glyphTexture, gradientTexture, padTexture, relationTexture, softDot } from './textures';

const BLOCK_H = 0.62;
const TILE_Y = 0;
const GOLD = '#ffc23d';

interface BlockView {
  i: number;
  mesh: THREE.Mesh;
  glyph?: THREE.Mesh;
  edges?: THREE.LineSegments;
  mat: THREE.MeshPhysicalMaterial;
  /** Visual position along axis (float cells). */
  pos: number;
  vel: number;
  target: number;
  exiting: number; // seconds since exit started, -1 if not
  /** Red flash timer when this twin blocks a drag. */
  blocked: number;
  baseEmissive: number;
  pulse: number;
}

interface Tether {
  g: number;
  a: number;
  b: number;
  mesh: THREE.Mesh;
  badge: THREE.Sprite;
  color: THREE.Color;
}

export interface SceneEvents {
  /** Called when the player releases a drag. Return the result (or null if illegal). */
  tryMove(mv: Move): MoveResult | null;
  onBump(): void;
  onDragStart(b: number): void;
  onTick(dt: number): void;
  onTwinBlocked?(): void;
}

type Mode = 'showcase' | 'play';

export class GameScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  private composer: EffectComposer | null = null;
  private bloom: UnrealBloomPass | null = null;
  private quality: 'high' | 'low' = 'high';
  private skin: BlockSkin = skinById('prism');
  private theme: BoardTheme = themeById('nebula');

  private boardGroup = new THREE.Group();
  private fx = new THREE.Group();
  private session: Session | null = null;
  private views: BlockView[] = [];
  private tethers: Tether[] = [];
  private pads: THREE.Mesh[] = [];
  private exitGlows: THREE.Mesh[] = [];
  private hintGhosts: THREE.Mesh[] = [];
  private hintBlock = -1;
  private particles!: THREE.Points;
  private bursts: { pts: THREE.Points; vel: Float32Array; life: number }[] = [];
  private keyLight!: THREE.DirectionalLight;
  private rimLines: THREE.Mesh[] = [];
  private halos: { m: number; mesh: THREE.Mesh }[] = [];

  private mode: Mode = 'showcase';
  private camT = 0;
  private camFrom = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  private clock = new THREE.Timer();
  private elapsed = 0;
  private shake = 0;
  private fog = false;
  insets = { top: 120, bottom: 140 };

  private drag: {
    b: number;
    pointerId: number;
    startX: number;
    startY: number;
    axisPx: THREE.Vector2;
    base: number[];
    members: number[];
    rel: number[];
    range: [number, number];
    solo: [number, number];
    d: number;
    bumped: boolean;
  } | null = null;

  constructor(private canvas: HTMLCanvasElement, private events: SceneEvents) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.45;

    const hemi = new THREE.HemisphereLight('#bfc8ff', '#1a1030', 0.45);
    this.scene.add(hemi);
    this.keyLight = new THREE.DirectionalLight('#ffffff', 1.7);
    this.keyLight.position.set(-4, 10, 5);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.left = -6;
    this.keyLight.shadow.camera.right = 6;
    this.keyLight.shadow.camera.top = 6;
    this.keyLight.shadow.camera.bottom = -6;
    this.keyLight.shadow.radius = 4;
    this.keyLight.shadow.bias = -0.0006;
    this.scene.add(this.keyLight);
    const fill = new THREE.PointLight('#8a6bff', 12, 20, 2);
    fill.position.set(5, 3, -4);
    this.scene.add(fill);

    this.scene.add(this.boardGroup, this.fx);
    this.makeParticles();
    this.applyTheme();
    this.setQuality('high');

    canvas.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMoveEvt);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
    if (import.meta.env.DEV) {
      // Test hook: screen positions of blocks, used by automated UI tests.
      (window as unknown as { __tl: () => unknown }).__tl = () => ({
        blocks: this.views.map((v) => {
          const p = this.project(this.blockCenter(v, new THREE.Vector3()));
          return { x: p.x, y: p.y, visible: v.mesh.visible };
        }),
      });
    }
  }

  // ---------- configuration ----------

  setQuality(q: 'high' | 'low') {
    this.quality = q;
    const dpr = Math.min(window.devicePixelRatio || 1, q === 'high' ? 2 : 1.25);
    this.renderer.setPixelRatio(dpr);
    this.renderer.shadowMap.enabled = q === 'high';
    this.keyLight.castShadow = q === 'high';
    if (q === 'high') {
      const size = new THREE.Vector2();
      this.renderer.getSize(size);
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.42, 0.45, 0.9);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    } else {
      this.composer?.dispose();
      this.composer = null;
      this.bloom = null;
    }
    this.resize();
    if (this.session) this.load(this.session, this.fog);
  }

  setSkin(id: string) {
    this.skin = skinById(id);
    if (this.session) this.load(this.session, this.fog);
  }

  setTheme(id: string) {
    this.theme = themeById(id);
    this.applyTheme();
    if (this.session) this.load(this.session, this.fog);
  }

  private applyTheme() {
    const th = this.theme;
    this.scene.background = gradientTexture(th.bgTop, th.bgBottom);
    this.scene.fog = new THREE.Fog(th.fog, 18, 40);
    (this.particles.material as THREE.PointsMaterial).color.set(th.particles);
    this.keyLight.color.set(th.light);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer?.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setMode(m: Mode) {
    if (m === this.mode) return;
    this.mode = m;
    this.camT = 0;
    this.camFrom.pos.copy(this.camera.position);
    this.camFrom.look.copy(this.lookAt);
  }

  // ---------- level building ----------

  private cellX(x: number) {
    return x - (this.session!.puzzle.w - 1) / 2;
  }
  private cellZ(y: number) {
    return y - (this.session!.puzzle.h - 1) / 2;
  }

  private clearBoard() {
    const disposeObj = (o: THREE.Object3D) => {
      o.traverse((c) => {
        const m = c as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
    };
    disposeObj(this.boardGroup);
    this.boardGroup.clear();
    this.views = [];
    this.tethers = [];
    this.pads = [];
    this.exitGlows = [];
    this.rimLines = [];
    this.hintGhosts = [];
    this.hintBlock = -1;
  }

  load(session: Session, fog = false) {
    this.session = session;
    this.fog = fog;
    this.drag = null;
    this.clearHalos();
    this.clearBoard();
    const p = session.puzzle;
    const th = this.theme;
    const seg = this.quality === 'high' ? 4 : 2;

    // Slab
    const slab = new THREE.Mesh(
      new RoundedBoxGeometry(p.w + 0.7, 0.5, p.h + 0.7, seg, 0.22),
      new THREE.MeshPhysicalMaterial({ color: th.slab, roughness: 0.35, metalness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
    );
    slab.position.y = TILE_Y - 0.3;
    slab.receiveShadow = true;
    this.boardGroup.add(slab);

    // Tiles (instanced)
    const tileGeo = new RoundedBoxGeometry(0.92, 0.1, 0.92, 2, 0.06);
    const tileMat = new THREE.MeshPhysicalMaterial({ color: th.tile, roughness: 0.28, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.12 });
    const tiles = new THREE.InstancedMesh(tileGeo, tileMat, p.w * p.h);
    const m4 = new THREE.Matrix4();
    let k = 0;
    for (let y = 0; y < p.h; y++)
      for (let x = 0; x < p.w; x++) {
        m4.makeTranslation(this.cellX(x), TILE_Y - 0.04, this.cellZ(y));
        tiles.setMatrixAt(k++, m4);
      }
    tiles.receiveShadow = true;
    this.boardGroup.add(tiles);

    // Rim glow lines with gaps at exits.
    const rimMat = new THREE.MeshBasicMaterial({ color: th.rim, toneMapped: false });
    const exitSet = new Set(p.def.exits.map((e) => `${e.side}${e.side === 'r' || e.side === 'l' ? e.y : e.x}`));
    const rimGeoH = new THREE.BoxGeometry(1, 0.04, 0.04);
    const rimGeoV = new THREE.BoxGeometry(0.04, 0.04, 1);
    const hx = p.w / 2 + 0.18;
    const hz = p.h / 2 + 0.18;
    for (let x = 0; x < p.w; x++) {
      for (const [side, z] of [['t', -hz], ['b', hz]] as const) {
        if (exitSet.has(`${side}${x}`)) continue;
        const r = new THREE.Mesh(rimGeoH, rimMat);
        r.position.set(this.cellX(x), 0.02, z);
        this.boardGroup.add(r);
        this.rimLines.push(r);
      }
    }
    for (let y = 0; y < p.h; y++) {
      for (const [side, xx] of [['l', -hx], ['r', hx]] as const) {
        if (exitSet.has(`${side}${y}`)) continue;
        const r = new THREE.Mesh(rimGeoV, rimMat);
        r.position.set(xx, 0.02, this.cellZ(y));
        this.boardGroup.add(r);
        this.rimLines.push(r);
      }
    }

    // Exits: glowing gold gateway + light carpet.
    for (const e of p.def.exits) {
      const horiz = e.side === 'r' || e.side === 'l';
      const sgn = e.side === 'r' || e.side === 'b' ? 1 : -1;
      const g = new THREE.Group();
      const postMat = new THREE.MeshStandardMaterial({ color: GOLD, emissive: GOLD, emissiveIntensity: 1.6, toneMapped: false });
      const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.9, 12);
      for (const o of [-0.5, 0.5]) {
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(horiz ? 0 : o, 0.45, horiz ? o : 0);
        g.add(post);
      }
      const bar = new THREE.Mesh(new THREE.BoxGeometry(horiz ? 0.08 : 1.08, 0.08, horiz ? 1.08 : 0.08), postMat);
      bar.position.y = 0.9;
      g.add(bar);
      const carpet = new THREE.Mesh(
        new THREE.PlaneGeometry(horiz ? 1.6 : 0.86, horiz ? 0.86 : 1.6),
        new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      );
      carpet.rotation.x = -Math.PI / 2;
      carpet.position.set(horiz ? sgn * 0.5 : 0, 0.03, horiz ? 0 : sgn * 0.5);
      g.add(carpet);
      this.exitGlows.push(carpet);
      const cx = this.cellX(e.x) + (horiz ? sgn * 0.62 : 0);
      const cz = this.cellZ(e.y) + (horiz ? 0 : sgn * 0.62);
      g.position.set(cx, 0, cz);
      this.boardGroup.add(g);
    }

    // Walls (stone pillars).
    const wallGeo = new RoundedBoxGeometry(0.86, 0.9, 0.86, seg, 0.12);
    const wallMat = new THREE.MeshPhysicalMaterial({ color: '#3b3548', roughness: 0.85, metalness: 0.1, clearcoat: 0.2 });
    for (const [x, y] of p.def.walls ?? []) {
      const m = new THREE.Mesh(wallGeo, wallMat);
      m.position.set(this.cellX(x), 0.45, this.cellZ(y));
      m.castShadow = m.receiveShadow = true;
      this.boardGroup.add(m);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.06), new THREE.MeshBasicMaterial({ color: '#8f86a8' }));
      cap.position.set(this.cellX(x), 0.91, this.cellZ(y));
      this.boardGroup.add(cap);
    }

    // Gates: colored arch + tinted tile.
    for (const gt of p.def.gates ?? []) {
      const col = new THREE.Color(this.groupColor(gt.g));
      const tile = new THREE.Mesh(
        new THREE.PlaneGeometry(0.86, 0.86),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      );
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(this.cellX(gt.x), 0.025, this.cellZ(gt.y));
      this.boardGroup.add(tile);
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.035, 8, 32, Math.PI),
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.4, toneMapped: false }),
      );
      arch.position.set(this.cellX(gt.x), 0.02, this.cellZ(gt.y));
      // Arch spans across the tile; orient it so blocks visibly pass under.
      arch.rotation.y = Math.PI / 4;
      this.boardGroup.add(arch);
    }

    // Polarity pads.
    for (const [x, y] of p.def.pads ?? []) {
      const pad = new THREE.Mesh(
        new THREE.CircleGeometry(0.42, 40),
        new THREE.MeshBasicMaterial({ map: padTexture(), color: '#c79bff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(this.cellX(x), 0.03, this.cellZ(y));
      this.boardGroup.add(pad);
      this.pads.push(pad);
    }

    // One-way arrows.
    const rot: Record<string, number> = { r: 0, u: Math.PI / 2, l: Math.PI, d: -Math.PI / 2 };
    for (const a of p.def.arrows ?? []) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 0.8),
        new THREE.MeshBasicMaterial({ map: arrowTexture(), color: '#45ffb5', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      );
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = rot[a.d];
      m.position.set(this.cellX(a.x), 0.03, this.cellZ(a.y));
      this.boardGroup.add(m);
    }

    // Blocks.
    p.blocks.forEach((b, i) => this.views.push(this.makeBlock(i, b.len, b.axis)));
    this.buildTethers();
    this.syncInstant();
  }

  private groupColor(g: number) {
    return this.skin.palette[g % this.skin.palette.length];
  }

  private blockColor(i: number): string {
    const b = this.session!.puzzle.blocks[i];
    if (b.gold) return GOLD;
    if (b.group >= 0 && (!this.fog || this.session!.revealed.has(b.group))) return this.groupColor(b.group);
    return this.skin.neutral;
  }

  private makeBlock(i: number, len: number, axis: 'h' | 'v'): BlockView {
    const p = this.session!.puzzle;
    const blk = p.blocks[i];
    const seg = this.quality === 'high' ? 5 : 2;
    const lx = axis === 'h' ? len - 0.14 : 0.86;
    const lz = axis === 'v' ? len - 0.14 : 0.86;
    const geo = new RoundedBoxGeometry(lx, BLOCK_H, lz, seg, 0.16);
    const sk = this.skin;
    const color = new THREE.Color(this.blockColor(i));
    const mat = new THREE.MeshPhysicalMaterial({
      color,
      roughness: sk.roughness,
      metalness: sk.metalness,
      clearcoat: sk.clearcoat,
      clearcoatRoughness: 0.08,
      iridescence: sk.iridescence,
      iridescenceIOR: 1.4,
      emissive: color,
      emissiveIntensity: sk.glow,
    });
    let baseEmissive = sk.glow;
    if (blk.gold) {
      mat.metalness = 1;
      mat.roughness = 0.2;
      mat.iridescence = 0.15;
      mat.emissive.set('#ff8a00');
      mat.emissiveIntensity = baseEmissive = 0.18;
    }
    if (blk.ice) {
      mat.color.lerp(new THREE.Color('#bfeaff'), blk.group >= 0 && !this.fog ? 0.35 : 0.75);
      mat.emissive.set('#5fc8ff');
      mat.roughness = 0.08;
      mat.metalness = 0;
      if (this.quality === 'high') {
        mat.transmission = 0.65;
        mat.thickness = 0.6;
        mat.ior = 1.31;
      } else {
        mat.transparent = true;
        mat.opacity = 0.82;
      }
      mat.clearcoatMap = null;
      mat.roughnessMap = frostTexture();
      mat.emissiveIntensity = baseEmissive = 0.22;
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.boardGroup.add(mesh);
    const view: BlockView = { i, mesh, mat, pos: 0, vel: 0, target: 0, exiting: -1, baseEmissive, pulse: 0, blocked: 0 };

    // Glyph on top: group symbol, or a diamond on gold.
    const showGlyph = blk.gold || (blk.group >= 0 && !this.fog) || blk.ice;
    if (showGlyph) {
      const tex = blk.gold ? glyphTexture(3) : blk.group >= 0 && !this.fog ? glyphTexture(blk.group) : glyphTexture(5);
      const gm = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.5),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, color: blk.gold ? '#fff4c9' : '#ffffff', opacity: blk.ice ? 0.5 : 0.9, depthWrite: false, toneMapped: false }),
      );
      gm.rotation.x = -Math.PI / 2;
      gm.position.y = BLOCK_H / 2 + 0.005;
      mesh.add(gm);
      view.glyph = gm;
    }
    if (sk.edges && !blk.gold) {
      const eg = new THREE.EdgesGeometry(new THREE.BoxGeometry(lx - 0.02, BLOCK_H - 0.02, lz - 0.02));
      const el = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: color.clone().multiplyScalar(2), toneMapped: false }));
      mesh.add(el);
      view.edges = el;
    }
    return view;
  }

  private buildTethers() {
    const p = this.session!.puzzle;
    for (const g of this.tethers) this.boardGroup.remove(g.mesh, g.badge);
    this.tethers = [];
    p.groups.forEach((members, g) => {
      if (!members) return;
      for (let k = 1; k < members.length; k++) {
        const color = new THREE.Color(this.groupColor(g));
        const mesh = new THREE.Mesh(
          new THREE.BufferGeometry(),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
        );
        const badge = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, transparent: true }));
        badge.scale.setScalar(0.44);
        badge.renderOrder = 10;
        this.boardGroup.add(mesh, badge);
        this.tethers.push({ g, a: members[0], b: members[k], mesh, badge, color });
      }
    });
  }

  private blockCenter(v: BlockView, out: THREE.Vector3) {
    const p = this.session!.puzzle;
    const b = p.blocks[v.i];
    const mid = v.pos + (b.len - 1) / 2;
    if (b.axis === 'h') out.set(this.cellX(mid), BLOCK_H / 2 + 0.01, this.cellZ(b.lane));
    else out.set(this.cellX(b.lane), BLOCK_H / 2 + 0.01, this.cellZ(mid));
    return out;
  }

  private tmpA = new THREE.Vector3();
  private tmpB = new THREE.Vector3();
  private updateTethers() {
    const s = this.session!;
    const p = s.puzzle;
    for (const t of this.tethers) {
      const va = this.views[t.a];
      const vb = this.views[t.b];
      const alive = s.state[t.a] >= 0 && s.state[t.b] >= 0;
      const hidden = this.fog && !s.revealed.has(t.g);
      t.mesh.visible = t.badge.visible = alive && !hidden && va.exiting < 0 && vb.exiting < 0;
      if (!t.mesh.visible) continue;
      const a = this.blockCenter(va, this.tmpA);
      const b = this.blockCenter(vb, this.tmpB);
      a.y += BLOCK_H / 2;
      b.y += BLOCK_H / 2;
      const dist = a.distanceTo(b);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      mid.y += 0.55 + dist * 0.22;
      const curve = new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
      t.mesh.geometry.dispose();
      t.mesh.geometry = new THREE.TubeGeometry(curve, 28, 0.025, 6, false);
      const apex = curve.getPoint(0.5);
      t.badge.position.copy(apex).add(new THREE.Vector3(0, 0.12, 0));
      const inv = s.state[p.n] ? -1 : 1;
      const rel = (p.blocks[t.a].sign * p.blocks[t.b].sign * inv) as 1 | -1;
      (t.badge.material as THREE.SpriteMaterial).map = relationTexture(rel, '#' + t.color.getHexString());
      (t.badge.material as THREE.SpriteMaterial).needsUpdate = true;
    }
  }

  private placeBlock(v: BlockView) {
    const c = this.blockCenter(v, this.tmpA);
    v.mesh.position.copy(c);
  }

  /** Snap all visuals to the session state. */
  syncInstant() {
    const s = this.session!;
    for (const v of this.views) {
      const pos = s.state[v.i];
      v.mesh.visible = pos >= 0;
      v.exiting = -1;
      v.mesh.scale.setScalar(1);
      if (pos >= 0) v.pos = v.target = pos;
      v.vel = 0;
      this.placeBlock(v);
    }
    this.refreshColors();
    this.updateTethers();
    this.clearHint();
  }

  /** Animate visuals toward the session state (after move/undo). */
  syncAnimated(exited: number[] = []) {
    const s = this.session!;
    const p = s.puzzle;
    for (const v of this.views) {
      const pos = s.state[v.i];
      if (pos >= 0) {
        if (!v.mesh.visible) {
          v.mesh.visible = true;
          v.exiting = -1;
          v.mesh.scale.setScalar(1);
          v.pos = pos;
        }
        v.target = pos;
      } else if (exited.includes(v.i)) {
        // slide out through the exit
        const e = p.def.exits.find((ex) => (p.blocks[v.i].axis === 'h' ? ex.side === 'r' || ex.side === 'l' : ex.side === 't' || ex.side === 'b'))!;
        const far = e.side === 'r' || e.side === 'b' ? (p.blocks[v.i].axis === 'h' ? p.w : p.h) + 1.5 : -p.blocks[v.i].len - 1.5;
        v.target = far;
        v.exiting = 0;
        this.burst(this.blockCenter(v, new THREE.Vector3()), GOLD, 90);
      } else if (v.exiting < 0) {
        v.mesh.visible = false;
      }
    }
    this.refreshColors();
    this.clearHint();
  }

  refreshColors() {
    for (const v of this.views) {
      const col = new THREE.Color(this.blockColor(v.i));
      const b = this.session!.puzzle.blocks[v.i];
      if (!b.gold && !b.ice) {
        v.mat.color.copy(col);
        v.mat.emissive.copy(col);
      }
      if (this.fog && b.group >= 0 && this.session!.revealed.has(b.group) && !v.glyph) {
        const gm = new THREE.Mesh(
          new THREE.PlaneGeometry(0.5, 0.5),
          new THREE.MeshBasicMaterial({ map: glyphTexture(b.group), transparent: true, depthWrite: false, toneMapped: false }),
        );
        gm.rotation.x = -Math.PI / 2;
        gm.position.y = BLOCK_H / 2 + 0.005;
        v.mesh.add(gm);
        v.glyph = gm;
        v.pulse = 1;
      }
    }
  }

  padFlash() {
    for (const p of this.pads) p.scale.setScalar(1.6);
    this.shake = 0.15;
  }

  // ---------- hints ----------

  showHint(mv: Move) {
    this.clearHint();
    const s = this.session!;
    const { idx, rel } = s.puzzle.linked(s.state, mv.b);
    this.hintBlock = mv.b;
    idx.forEach((m, j) => {
      const v = this.views[m];
      const ghost = new THREE.Mesh(
        v.mesh.geometry,
        new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.38, depthWrite: false, toneMapped: false }),
      );
      const saved = v.pos;
      v.pos = s.state[m] + mv.d * rel[j];
      this.blockCenter(v, ghost.position);
      v.pos = saved;
      this.boardGroup.add(ghost);
      this.hintGhosts.push(ghost);
    });
  }

  /** The driver could go further alone: its twin is what blocks it. Flash the twins red. */
  private flashTwins(d: { b: number; members: number[] }) {
    for (const m of d.members) if (m !== d.b) this.views[m].blocked = 0.7;
    this.events.onTwinBlocked?.();
  }

  private clearHalos() {
    for (const h of this.halos) {
      h.mesh.geometry.dispose();
      (h.mesh.material as THREE.Material).dispose();
      this.boardGroup.remove(h.mesh);
    }
    this.halos = [];
  }

  /** Screen position of a block's center, optionally shifted by d cells along its axis. */
  screenOfBlock(i: number, d = 0): { x: number; y: number } {
    const v = this.views[i];
    const saved = v.pos;
    v.pos += d;
    const p = this.project(this.blockCenter(v, new THREE.Vector3()));
    v.pos = saved;
    return { x: p.x, y: p.y };
  }

  /** Screen-space center of a block and of the first exit (for tutorial overlays). */
  screenHints(): { gold: { x: number; y: number }; exit: { x: number; y: number } } | null {
    const s = this.session;
    if (!s) return null;
    const gi = s.puzzle.goldIdx[0];
    const gold = this.project(this.blockCenter(this.views[gi], new THREE.Vector3()));
    const e = s.puzzle.def.exits[0];
    const ex = this.project(new THREE.Vector3(this.cellX(e.x), BLOCK_H / 2, this.cellZ(e.y)));
    return { gold: { x: gold.x, y: gold.y }, exit: { x: ex.x, y: ex.y } };
  }

  clearHint() {
    for (const g of this.hintGhosts) {
      (g.material as THREE.Material).dispose();
      this.boardGroup.remove(g);
    }
    this.hintGhosts = [];
    this.hintBlock = -1;
  }

  // ---------- effects ----------

  private makeParticles() {
    const n = 260;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 26;
      pos[i * 3 + 1] = Math.random() * 10 - 3;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 26;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.particles = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ size: 0.09, map: softDot(), transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    this.scene.add(this.particles);
  }

  burst(at: THREE.Vector3, color: string, n = 60) {
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos.set([at.x, at.y, at.z], i * 3);
      const th = Math.random() * Math.PI * 2;
      const up = Math.random() * 4 + 1.5;
      const sp = Math.random() * 3 + 0.8;
      vel.set([Math.cos(th) * sp, up, Math.sin(th) * sp], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ size: 0.16, map: softDot(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    );
    this.fx.add(pts);
    this.bursts.push({ pts, vel, life: 1.6 });
  }

  celebrate() {
    const p = this.session!.puzzle;
    const palette = [GOLD, ...this.skin.palette];
    for (let k = 0; k < 6; k++) {
      const at = new THREE.Vector3((Math.random() - 0.5) * p.w, 0.5, (Math.random() - 0.5) * p.h);
      this.burst(at, palette[k % palette.length], 70);
    }
    for (const r of this.rimLines) (r.material as THREE.MeshBasicMaterial).color.set(GOLD);
  }

  bumpShake() {
    this.shake = Math.max(this.shake, 0.08);
  }

  // ---------- input ----------

  private ndc = new THREE.Vector2();
  private ray = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BLOCK_H / 2);

  private pickBlock(cx: number, cy: number): number {
    const s = this.session;
    if (!s || this.mode !== 'play' || s.status !== 'playing') return -1;
    const rect = this.canvas.getBoundingClientRect();
    this.ndc.set(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
    // Prefer an exact mesh hit, fall back to nearest block on the board plane (fat-finger friendly).
    const hits = this.ray.intersectObjects(this.views.filter((v) => v.mesh.visible).map((v) => v.mesh), false);
    if (hits.length) {
      const v = this.views.find((vv) => vv.mesh === hits[0].object);
      if (v) return v.i;
    }
    const pt = new THREE.Vector3();
    if (!this.ray.ray.intersectPlane(this.plane, pt)) return -1;
    let best = -1;
    let bd = 0.75;
    const c = new THREE.Vector3();
    for (const v of this.views) {
      if (!v.mesh.visible || s.state[v.i] < 0) continue;
      const b = s.puzzle.blocks[v.i];
      this.blockCenter(v, c);
      const dx = Math.abs(pt.x - c.x) - (b.axis === 'h' ? (b.len - 1) / 2 : 0);
      const dz = Math.abs(pt.z - c.z) - (b.axis === 'v' ? (b.len - 1) / 2 : 0);
      const d = Math.hypot(Math.max(0, dx), Math.max(0, dz));
      if (d < bd) {
        bd = d;
        best = v.i;
      }
    }
    return best;
  }

  private project(v: THREE.Vector3) {
    const p = v.clone().project(this.camera);
    return new THREE.Vector2(((p.x + 1) / 2) * window.innerWidth, ((1 - p.y) / 2) * window.innerHeight);
  }

  private onDown = (e: PointerEvent) => {
    if (this.drag) return;
    const b = this.pickBlock(e.clientX, e.clientY);
    if (b < 0) return;
    const s = this.session!;
    const blk = s.puzzle.blocks[b];
    const v = this.views[b];
    const c = this.blockCenter(v, new THREE.Vector3());
    const c2 = c.clone().add(blk.axis === 'h' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1));
    const axisPx = this.project(c2).sub(this.project(c));
    const { idx, rel } = s.puzzle.linked(s.state, b);
    this.drag = {
      b,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      axisPx,
      members: idx,
      rel,
      base: idx.map((m) => s.state[m]),
      range: s.range(b),
      solo: s.puzzle.soloRange(s.state, b),
      d: 0,
      bumped: false,
    };
    this.canvas.setPointerCapture?.(e.pointerId);
    this.events.onDragStart(b);
    // Twins light up with a halo while the drag lasts, so you see who moves with you.
    // (Hidden twins in fog mode are revealed only after a move.)
    for (const m of idx) {
      this.views[m].pulse = 1;
      const g = s.puzzle.blocks[m].group;
      if (m === b || g < 0 || (this.fog && !s.revealed.has(g))) continue;
      const len = s.puzzle.blocks[m].len;
      const axis = s.puzzle.blocks[m].axis;
      const halo = new THREE.Mesh(
        new THREE.PlaneGeometry(axis === 'h' ? len + 0.9 : 1.9, axis === 'v' ? len + 0.9 : 1.9),
        new THREE.MeshBasicMaterial({ map: softDot(), color: this.groupColor(g), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      );
      halo.rotation.x = -Math.PI / 2;
      this.boardGroup.add(halo);
      this.halos.push({ m, mesh: halo });
    }
  };

  private onMoveEvt = (e: PointerEvent) => {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const len2 = d.axisPx.lengthSq() || 1;
    let raw = (dx * d.axisPx.x + dy * d.axisPx.y) / len2;
    const [neg, pos] = d.range;
    // Rubber band past the limit.
    if (raw > pos) {
      const over = raw - pos;
      raw = pos + Math.min(0.28, over * 0.18);
      if (over > 0.35 && !d.bumped) {
        d.bumped = true;
        this.events.onBump();
        if (d.solo[1] > pos) this.flashTwins(d);
      }
    } else if (raw < -neg) {
      const over = -neg - raw;
      raw = -neg - Math.min(0.28, over * 0.18);
      if (over > 0.35 && !d.bumped) {
        d.bumped = true;
        this.events.onBump();
        if (d.solo[0] > neg) this.flashTwins(d);
      }
    } else d.bumped = false;
    d.d = raw;
    d.members.forEach((m, j) => {
      const v = this.views[m];
      v.pos = v.target = d.base[j] + raw * d.rel[j];
      v.vel = 0;
    });
  };

  private onUp = (e: PointerEvent) => {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    this.drag = null;
    this.clearHalos();
    const s = this.session!;
    const [neg, pos] = d.range;
    let steps = Math.round(d.d);
    if (s.puzzle.blocks[d.b].ice) {
      if (d.d > 0.25 && pos > 0) steps = pos;
      else if (d.d < -0.25 && neg > 0) steps = -neg;
      else steps = 0;
    }
    steps = Math.max(-neg, Math.min(pos, steps));
    let res: MoveResult | null = null;
    if (steps !== 0) res = this.events.tryMove({ b: d.b, d: steps });
    if (!res) {
      d.members.forEach((m, j) => (this.views[m].target = d.base[j]));
    }
  };

  // ---------- frame loop ----------

  private lookAt = new THREE.Vector3();

  private cameraGoal(out: { pos: THREE.Vector3; look: THREE.Vector3 }) {
    const p = this.session?.puzzle;
    const w = p ? p.w : 6;
    const h = p ? p.h : 6;
    if (this.mode === 'showcase') {
      const a = this.elapsed * 0.12;
      const r = Math.max(w, h) * 1.45 + 4;
      out.pos.set(Math.sin(a) * r, Math.max(w, h) * 1.05 + 3, Math.cos(a) * r);
      out.look.set(0, 3.2, 0);
      return;
    }
    // Fit the board inside the area between the HUD insets.
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const usable = Math.max(0.3, (vh - this.insets.top - this.insets.bottom) / vh);
    const elev = THREE.MathUtils.degToRad(52);
    const fovV = THREE.MathUtils.degToRad(this.camera.fov);
    const fovH = 2 * Math.atan(Math.tan(fovV / 2) * (vw / vh));
    const halfW = (w / 2 + 0.7) * 1.04;
    const halfD = h / 2 + 0.9;
    // Width constraint and depth constraint (projected depth shrinks by sin(elev)).
    const distW = halfW / Math.tan(fovH / 2);
    const distH = (halfD * Math.sin(elev) + 0.6 * Math.cos(elev)) / Math.tan((fovV * usable) / 2);
    const dist = Math.max(distW, distH) * 1.02;
    out.look.set(0, 0, 0);
    out.pos.set(0, Math.sin(elev) * dist, Math.cos(elev) * dist);
    // Shift so the board centers in the usable band.
    const shiftPx = (this.insets.top - this.insets.bottom) / 2;
    const worldPerPx = (2 * Math.tan(fovV / 2) * dist) / vh;
    const shift = shiftPx * worldPerPx;
    // Move camera "down" along its up-vector (screen up) to push the board down on screen.
    const up = new THREE.Vector3(0, Math.cos(elev), -Math.sin(elev));
    out.pos.addScaledVector(up, shift);
    out.look.addScaledVector(up, shift);
  }

  private goal = { pos: new THREE.Vector3(), look: new THREE.Vector3() };

  private frame() {
    this.clock.update();
    const rawDt = this.clock.getDelta();
    const dt = Math.min(0.05, rawDt);
    this.elapsed += dt;
    this.events.onTick(dt);

    // Camera
    this.cameraGoal(this.goal);
    this.camT = Math.min(1, this.camT + Math.min(0.25, rawDt) * 1.4);
    const e = 1 - Math.pow(1 - this.camT, 3);
    this.camera.position.lerpVectors(this.camFrom.pos, this.goal.pos, e);
    this.lookAt.lerpVectors(this.camFrom.look, this.goal.look, e);
    if (this.camT >= 1) {
      this.camFrom.pos.copy(this.goal.pos);
      this.camFrom.look.copy(this.goal.look);
    }
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      const m = this.shake * 0.25;
      this.camera.position.x += (Math.random() - 0.5) * m;
      this.camera.position.y += (Math.random() - 0.5) * m;
    }
    this.camera.lookAt(this.lookAt);

    // Blocks: critically-damped springs.
    if (this.session) {
      let moved = false;
      const k = 260;
      const c = 2 * Math.sqrt(k) * 0.92;
      for (const v of this.views) {
        if (!v.mesh.visible) continue;
        const dragging = this.drag?.members.includes(v.i);
        if (!dragging) {
          const acc = -k * (v.pos - v.target) - c * v.vel;
          v.vel += acc * dt;
          v.pos += v.vel * dt;
          if (Math.abs(v.pos - v.target) < 0.0005 && Math.abs(v.vel) < 0.001) {
            v.pos = v.target;
            v.vel = 0;
          }
        }
        if (Math.abs(v.vel) > 0.0001 || dragging) moved = true;
        this.placeBlock(v);
        // Lift while dragged.
        const lift = dragging ? 0.08 : 0;
        v.mesh.position.y += lift;
        if (v.exiting >= 0) {
          v.exiting += dt;
          const sc = Math.max(0.01, 1 - Math.max(0, v.exiting - 0.25) * 2.2);
          v.mesh.scale.setScalar(sc);
          if (sc <= 0.011) v.mesh.visible = false;
        }
        v.pulse = Math.max(0, v.pulse - dt * 1.8);
        const hint = v.i === this.hintBlock ? 0.35 + Math.sin(this.elapsed * 6) * 0.25 : 0;
        const goldPulse = this.session.puzzle.blocks[v.i].gold ? Math.sin(this.elapsed * 2.4) * 0.06 : 0;
        v.mat.emissiveIntensity = v.baseEmissive + v.pulse * 0.6 + hint + goldPulse + (dragging ? 0.3 : 0);
        if (v.blocked > 0) {
          v.blocked = Math.max(0, v.blocked - dt);
          v.mat.emissive.set('#ff2a3d');
          v.mat.emissiveIntensity = 0.9 * (0.5 + 0.5 * Math.sin(this.elapsed * 30));
          if (v.blocked === 0) v.mat.emissive.copy(v.mat.color);
        }
      }
      for (const hl of this.halos) {
        this.blockCenter(this.views[hl.m], hl.mesh.position);
        hl.mesh.position.y = 0.04;
        hl.mesh.scale.setScalar(1 + Math.sin(this.elapsed * 8) * 0.06);
      }
      if (moved || this.elapsed < 0.2) this.updateTethers();
      // Tether emphasis when its group is dragged.
      for (const t of this.tethers) {
        const active = this.drag && this.drag.members.includes(t.a);
        const mat = t.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity += ((active ? 1 : 0.38) - mat.opacity) * Math.min(1, dt * 10);
      }
      for (const g of this.exitGlows) (g.material as THREE.MeshBasicMaterial).opacity = 0.28 + Math.sin(this.elapsed * 3) * 0.12;
      for (const p of this.pads) {
        p.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, dt * 4));
        p.rotation.z += dt * 0.6;
      }
    }

    // Ambient particles drift.
    const pp = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pp.count; i++) {
      let y = pp.getY(i) + dt * 0.18;
      if (y > 7) y = -3;
      pp.setY(i, y);
    }
    pp.needsUpdate = true;
    this.particles.rotation.y += dt * 0.01;

    // Bursts.
    for (let bi = this.bursts.length - 1; bi >= 0; bi--) {
      const b = this.bursts[bi];
      b.life -= dt;
      const attr = b.pts.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < attr.count; i++) {
        b.vel[i * 3 + 1] -= 6 * dt;
        attr.setXYZ(i, attr.getX(i) + b.vel[i * 3] * dt, attr.getY(i) + b.vel[i * 3 + 1] * dt, attr.getZ(i) + b.vel[i * 3 + 2] * dt);
      }
      attr.needsUpdate = true;
      (b.pts.material as THREE.PointsMaterial).opacity = Math.max(0, b.life / 1.6);
      if (b.life <= 0) {
        b.pts.geometry.dispose();
        (b.pts.material as THREE.Material).dispose();
        this.fx.remove(b.pts);
        this.bursts.splice(bi, 1);
      }
    }

    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
