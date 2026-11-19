// הזירה החיה: סצנת תלת-ממד שנבנית כולה בקוד (בלי מודלים או תמונות חיצוניות).
// זירה, חבלים, במה ומסך ענק, תאורה נעה, קהל שמגיב, שלטי לד, זיקוקים.
// המסכים של המשחק שולטים בה דרך ה-API שבסוף הקובץ.
import * as THREE from 'three';

type Shot = 'wide' | 'stage' | 'ring' | 'high' | 'ringside' | 'entrance';
const SHOTS: Record<Shot, { pos: [number, number, number]; target: [number, number, number] }> = {
  wide: { pos: [15, 8.5, 17], target: [0, 2.2, -3] },
  stage: { pos: [0, 4.6, 5], target: [0, 6.2, -18] },
  ring: { pos: [6.5, 3.4, 7.5], target: [0, 1.9, 0] },
  high: { pos: [0, 17, 16], target: [0, 0.5, -3] },
  ringside: { pos: [-7.5, 2.3, 3.5], target: [0, 2.1, 0] },
  entrance: { pos: [0, 2.6, -4], target: [0, 3.5, -16] },
};

interface ScreenContent { kicker?: string; title: string; subtitle?: string; color: string }

class ArenaWorld {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  clock = new THREE.Timer();
  brandColor = new THREE.Color('#C8102E');
  brandName = 'LWF';
  hype = 0.3;
  spike = 0;
  camPos = new THREE.Vector3(...SHOTS.wide.pos);
  camTarget = new THREE.Vector3(...SHOTS.wide.target);
  wantPos = new THREE.Vector3(...SHOTS.wide.pos);
  wantTarget = new THREE.Vector3(...SHOTS.wide.target);
  brandMats: THREE.MeshStandardMaterial[] = [];
  crowd!: THREE.InstancedMesh;
  crowdBase: { x: number; y: number; z: number; phase: number; ry: number }[] = [];
  flashes!: THREE.Points;
  movers: { light: THREE.SpotLight; cone: THREE.Mesh; seed: number }[] = [];
  screenCanvas: HTMLCanvasElement;
  screenTex: THREE.CanvasTexture;
  screen: ScreenContent = { title: 'LWF', color: '#E2B84B' };
  ledCanvas: HTMLCanvasElement;
  ledTex: THREE.CanvasTexture;
  sparks: { p: THREE.Vector3; v: THREE.Vector3; life: number }[] = [];
  sparkGeo = new THREE.BufferGeometry();
  sparkPts!: THREE.Points;
  dummy = new THREE.Object3D();
  frame = 0;
  running = true;
  lowPower: boolean;
  side: 'start' | 'end' = 'end';

  constructor(private canvas: HTMLCanvasElement) {
    this.lowPower = Math.min(window.innerWidth, window.innerHeight) < 700;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.lowPower, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.lowPower ? 1.5 : 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    this.scene.background = new THREE.Color('#030407');
    this.scene.fog = new THREE.Fog('#05060B', 22, 75);

    this.screenCanvas = document.createElement('canvas');
    this.screenCanvas.width = 1024;
    this.screenCanvas.height = 440;
    this.screenTex = new THREE.CanvasTexture(this.screenCanvas);
    this.screenTex.colorSpace = THREE.SRGBColorSpace;
    this.ledCanvas = document.createElement('canvas');
    this.ledCanvas.width = 2048;
    this.ledCanvas.height = 64;
    this.ledTex = new THREE.CanvasTexture(this.ledCanvas);
    this.ledTex.colorSpace = THREE.SRGBColorSpace;
    this.ledTex.wrapS = THREE.RepeatWrapping;
    this.ledTex.repeat.set(3, 1);

    this.build();
    this.resize();
    this.drawLed();
    this.loop();
  }

  private brandMat(emissive = 0.35, metal = 0.2) {
    const m = new THREE.MeshStandardMaterial({ color: this.brandColor.clone(), emissive: this.brandColor.clone(), emissiveIntensity: emissive, roughness: 0.5, metalness: metal });
    this.brandMats.push(m);
    return m;
  }

  private build() {
    const s = this.scene;
    s.add(new THREE.AmbientLight('#4A5A80', 0.35));
    s.add(new THREE.HemisphereLight('#8090C0', '#100808', 0.35));

    // רצפת האולם
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#07080C', roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2;
    s.add(floor);

    // הזירה: סינר בצבע המותג, משטח, עמודים, כריות וחבלים
    const apron = new THREE.Mesh(new THREE.BoxGeometry(6.8, 1.2, 6.8), this.brandMat(0.25));
    apron.position.y = 0.6;
    s.add(apron);
    const mat = new THREE.Mesh(new THREE.BoxGeometry(7, 0.18, 7), new THREE.MeshStandardMaterial({ color: '#C9CCD6', roughness: 0.85 }));
    mat.position.y = 1.29;
    s.add(mat);
    const logoMat = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), this.brandMat(0.15));
    logoMat.rotation.x = -Math.PI / 2;
    logoMat.position.y = 1.385;
    s.add(logoMat);
    const steel = new THREE.MeshStandardMaterial({ color: '#2B2F3A', metalness: 0.9, roughness: 0.3 });
    const corners: [number, number][] = [[-3.2, -3.2], [3.2, -3.2], [3.2, 3.2], [-3.2, 3.2]];
    for (const [x, z] of corners) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.9, 12), steel);
      post.position.set(x, 1.45, z);
      s.add(post);
      for (const h of [1.75, 2.2, 2.65]) {
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.28), this.brandMat(0.5));
        pad.position.set(x, h, z);
        s.add(pad);
      }
    }
    const ropeMat = new THREE.MeshStandardMaterial({ color: '#E8E8EE', emissive: '#ffffff', emissiveIntensity: 0.08, roughness: 0.4 });
    for (const h of [1.75, 2.2, 2.65]) {
      for (let i = 0; i < 4; i++) {
        const [x1, z1] = corners[i];
        const [x2, z2] = corners[(i + 1) % 4];
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 6.4, 8), h === 2.2 ? this.brandMat(0.6) : ropeMat);
        rope.position.set((x1 + x2) / 2, h, (z1 + z2) / 2);
        rope.rotation.z = x1 !== x2 ? Math.PI / 2 : 0;
        rope.rotation.x = z1 !== z2 ? Math.PI / 2 : 0;
        s.add(rope);
      }
    }
    // מחסום סביב הזירה
    const barrierMat = new THREE.MeshStandardMaterial({ color: '#0E1018', roughness: 0.6 });
    for (const [w, d, x, z] of [[14, 0.15, 0, 6.5], [14, 0.15, 0, -6.5], [0.15, 13, 7, 0], [0.15, 13, -7, 0]] as const) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, 1, d), barrierMat);
      b.position.set(x, 0.5, z);
      s.add(b);
    }

    // במה, רמפה ומסך ענק
    const stage = new THREE.Mesh(new THREE.BoxGeometry(20, 1.2, 5), new THREE.MeshStandardMaterial({ color: '#0B0D14', roughness: 0.5, metalness: 0.4 }));
    stage.position.set(0, 0.6, -18);
    s.add(stage);
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.25, 10), new THREE.MeshStandardMaterial({ color: '#0D1018', roughness: 0.4, metalness: 0.5 }));
    ramp.position.set(0, 0.55, -11.5);
    s.add(ramp);
    for (const x of [-1.7, 1.7]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 10), this.brandMat(1.2));
      strip.position.set(x, 0.7, -11.5);
      s.add(strip);
    }
    const tron = new THREE.Mesh(new THREE.PlaneGeometry(16, 6.9), new THREE.MeshBasicMaterial({ map: this.screenTex, toneMapped: false }));
    tron.position.set(0, 6.4, -19.8);
    s.add(tron);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(16.6, 7.5, 0.3), steel);
    frame.position.set(0, 6.4, -20);
    s.add(frame);
    for (const x of [-12.5, 12.5]) {
      const side = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), this.brandMat(0.9, 0));
      side.position.set(x, 4.5, -19.6);
      s.add(side);
    }

    // שלטי לד סביב הקהל
    const ledMat = new THREE.MeshBasicMaterial({ map: this.ledTex, toneMapped: false });
    for (const [x, z, ry, len] of [[0, 9.2, 0, 22], [-11.2, -1, Math.PI / 2, 20], [11.2, -1, -Math.PI / 2, 20]] as const) {
      const led = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.7), ledMat);
      led.position.set(x, 1.2, z);
      led.rotation.y = ry === 0 ? Math.PI : ry;
      s.add(led);
    }

    // מסגרת תאורה מעל הזירה
    const trussMat = new THREE.MeshStandardMaterial({ color: '#1A1D26', metalness: 0.8, roughness: 0.4 });
    for (const [w, d, x, z] of [[12, 0.3, 0, 5], [12, 0.3, 0, -5], [0.3, 10, 6, 0], [0.3, 10, -6, 0]] as const) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), trussMat);
      t.position.set(x, 13, z);
      s.add(t);
    }

    // אור ראשי על הזירה
    const key = new THREE.SpotLight('#FFF4E0', 380, 40, 0.42, 0.5, 1.4);
    key.position.set(0, 13, 0);
    key.target.position.set(0, 1.3, 0);
    s.add(key, key.target);

    // ארבעה זרקורים נעים, עם קונוס אור נראה
    const coneGeo = new THREE.ConeGeometry(2.4, 13, 24, 1, true);
    coneGeo.translate(0, -6.5, 0);
    coneGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 4; i++) {
      const color = i % 2 ? '#ffffff' : this.brandColor.clone();
      const light = new THREE.SpotLight(color, 220, 45, 0.3, 0.6, 1.3);
      light.position.set(corners[i][0] * 1.8, 13, corners[i][1] * 1.6);
      s.add(light, light.target);
      const coneMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.copy(light.position);
      s.add(cone);
      this.movers.push({ light, cone, seed: i * 1.7 });
    }

    // הקהל: יציעים מדורגים משלושה צדדים
    const seats: { x: number; y: number; z: number; ry: number }[] = [];
    const rows = this.lowPower ? 10 : 14;
    for (let r = 0; r < rows; r++) {
      const d = 10 + r * 0.95;
      const y = 0.9 + r * 0.55;
      const step = 0.62;
      for (let x = -d; x <= d; x += step) seats.push({ x: x + (Math.random() - 0.5) * 0.15, y, z: d, ry: Math.PI });
      for (let z = -d + 4; z <= d; z += step) {
        seats.push({ x: -d - 1, y, z: z + (Math.random() - 0.5) * 0.15, ry: Math.PI / 2 });
        seats.push({ x: d + 1, y, z: z + (Math.random() - 0.5) * 0.15, ry: -Math.PI / 2 });
      }
    }
    const body = new THREE.CapsuleGeometry(0.17, 0.42, 3, 6);
    this.crowd = new THREE.InstancedMesh(body, new THREE.MeshStandardMaterial({ roughness: 0.9 }), seats.length);
    const palette = ['#2A2E3A', '#1E2230', '#3A2E2E', '#2E3A34', '#444A58', '#151820', '#5A4A3A'];
    seats.forEach((p, i) => {
      this.crowdBase.push({ ...p, phase: Math.random() * Math.PI * 2 });
      const c = new THREE.Color(Math.random() < 0.18 ? '#C8102E' : palette[(Math.random() * palette.length) | 0]);
      this.crowd.setColorAt(i, c);
    });
    s.add(this.crowd);
    // יציעים עצמם
    const standMat = new THREE.MeshStandardMaterial({ color: '#0A0B10', roughness: 0.95 });
    for (let r = 0; r < rows; r++) {
      const d = 10 + r * 0.95;
      const y = 0.5 + r * 0.55;
      const front = new THREE.Mesh(new THREE.BoxGeometry(d * 2 + 2, 0.55, 0.95), standMat);
      front.position.set(0, y, d);
      s.add(front);
      for (const sx of [-1, 1]) {
        const side = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, d * 2 - 4), standMat);
        side.position.set(sx * (d + 1), y, 2);
        s.add(side);
      }
    }

    // הבזקי טלפונים במצלמה בקהל
    const nFlash = this.lowPower ? 160 : 320;
    const fp = new Float32Array(nFlash * 3);
    const fc = new Float32Array(nFlash * 3);
    for (let i = 0; i < nFlash; i++) {
      const b = this.crowdBase[(Math.random() * this.crowdBase.length) | 0];
      fp.set([b.x, b.y + 0.55, b.z], i * 3);
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    fg.setAttribute('color', new THREE.BufferAttribute(fc, 3));
    this.flashes = new THREE.Points(fg, new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.add(this.flashes);

    // זיקוקים
    const maxSparks = 600;
    this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxSparks * 3), 3));
    this.sparkGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(maxSparks * 3), 3));
    this.sparkPts = new THREE.Points(this.sparkGeo, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.add(this.sparkPts);
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    // מסך רחב: הזירה בצד הפנוי מהלוח. טלפון: הזירה בחלק העליון, מעל הגיליון
    if (w < 900) {
      const k = 1.7;
      this.camera.aspect = w / (h * k);
      this.camera.fov = (2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(34)) * k) * 180) / Math.PI;
      this.camera.setViewOffset(w, h * k, 0, h * 0.62, w, h);
    } else {
      const k = 1.5;
      this.camera.aspect = (w * k) / h;
      this.camera.fov = 46;
      this.camera.setViewOffset(w * k, h, w * (this.side === 'end' ? 0.42 : 0.08), 0, w, h);
    }
    this.camera.updateProjectionMatrix();
  }

  drawScreen(t: number) {
    const c = this.screenCanvas.getContext('2d')!;
    const { width: W, height: H } = this.screenCanvas;
    const col = this.screen.color;
    const g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#05060A');
    g.addColorStop(0.5, col);
    g.addColorStop(1, '#05060A');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    // קרן אור שעוברת על המסך
    const sweep = ((t * 0.25) % 1.6) - 0.3;
    const sg = c.createLinearGradient(sweep * W - 200, 0, sweep * W + 200, H);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.5, 'rgba(255,255,255,0.18)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = sg;
    c.fillRect(0, 0, W, H);
    c.textAlign = 'center';
    c.fillStyle = '#ffffff';
    c.shadowColor = col;
    c.shadowBlur = 30;
    if (this.screen.kicker) {
      c.font = '700 44px BarlowCondensed_800ExtraBold_Italic, sans-serif';
      c.fillStyle = 'rgba(255,255,255,0.8)';
      c.fillText(this.screen.kicker.toUpperCase(), W / 2, 92);
    }
    c.fillStyle = '#ffffff';
    let size = 170;
    c.font = `${size}px Anton_400Regular, Impact, sans-serif`;
    while (c.measureText(this.screen.title).width > W - 80 && size > 50) { size -= 8; c.font = `${size}px Anton_400Regular, Impact, sans-serif`; }
    c.fillText(this.screen.title, W / 2, this.screen.kicker ? 260 : 240);
    if (this.screen.subtitle) {
      c.font = '700 54px BarlowCondensed_800ExtraBold_Italic, sans-serif';
      c.fillStyle = '#FFE9A3';
      c.fillText(this.screen.subtitle.toUpperCase(), W / 2, 360);
    }
    c.shadowBlur = 0;
    // קווי סריקה של מסך לד
    c.fillStyle = 'rgba(0,0,0,0.22)';
    for (let y = 0; y < H; y += 4) c.fillRect(0, y, W, 1.5);
    this.screenTex.needsUpdate = true;
  }

  drawLed() {
    const c = this.ledCanvas.getContext('2d')!;
    const { width: W, height: H } = this.ledCanvas;
    c.fillStyle = '#05060A';
    c.fillRect(0, 0, W, H);
    c.font = '44px Anton_400Regular, Impact, sans-serif';
    c.textBaseline = 'middle';
    const words = ['LWF', this.brandName.toUpperCase(), 'LEGENDS WRESTLING FEDERATION'];
    let x = 20;
    let i = 0;
    while (x < W) {
      const w = words[i % words.length];
      c.fillStyle = i % 3 === 1 ? '#' + this.brandColor.getHexString() : i % 3 === 0 ? '#E2B84B' : '#ffffff';
      c.fillText(w, x, H / 2 + 2);
      x += c.measureText(w).width + 60;
      i++;
    }
    this.ledTex.needsUpdate = true;
  }

  private loop = () => {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    this.clock.update();
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.getElapsed();
    this.frame++;
    this.spike = Math.max(0, this.spike - dt * 0.35);
    const energy = Math.min(1, this.hype + this.spike);

    // מצלמה: מעבר חלק לשוט הנבחר ותנודה עדינה
    this.camPos.lerp(this.wantPos, 1 - Math.pow(0.04, dt));
    this.camTarget.lerp(this.wantTarget, 1 - Math.pow(0.04, dt));
    this.camera.position.set(this.camPos.x + Math.sin(t * 0.13) * 1.2, this.camPos.y + Math.sin(t * 0.21) * 0.25, this.camPos.z + Math.cos(t * 0.11) * 0.8);
    this.camera.lookAt(this.camTarget);

    // זרקורים נעים
    for (const m of this.movers) {
      const sp = 0.35 + energy * 0.9;
      const tx = Math.sin(t * sp + m.seed) * 5.5;
      const tz = Math.cos(t * sp * 0.8 + m.seed * 1.3) * 5.5;
      m.light.target.position.set(tx, 1.3, tz);
      m.cone.lookAt(tx, 1.3, tz);
      (m.cone.material as THREE.MeshBasicMaterial).opacity = 0.04 + energy * 0.07;
      m.light.intensity = 150 + energy * 200;
    }

    // קהל קופץ לפי האנרגיה
    const amp = 0.04 + energy * 0.28;
    for (let i = 0; i < this.crowdBase.length; i++) {
      const b = this.crowdBase[i];
      const jump = Math.max(0, Math.sin(t * (4 + energy * 5) + b.phase)) * amp;
      this.dummy.position.set(b.x, b.y + 0.45 + jump, b.z);
      this.dummy.rotation.set(0, b.ry, Math.sin(t * 2 + b.phase) * 0.06 * energy);
      this.dummy.updateMatrix();
      this.crowd.setMatrixAt(i, this.dummy.matrix);
    }
    this.crowd.instanceMatrix.needsUpdate = true;

    // הבזקי מצלמות
    const fc = this.flashes.geometry.getAttribute('color') as THREE.BufferAttribute;
    for (let i = 0; i < fc.count; i++) {
      const on = Math.random() < 0.004 + energy * 0.03;
      const cur = fc.getX(i) * 0.82;
      const v = on ? 1 : cur;
      fc.setXYZ(i, v, v, v * 0.95);
    }
    fc.needsUpdate = true;

    // זיקוקים
    const pos = this.sparkGeo.getAttribute('position') as THREE.BufferAttribute;
    const col = this.sparkGeo.getAttribute('color') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const sp = this.sparks[i];
      if (sp && sp.life > 0) {
        sp.life -= dt;
        sp.v.y -= 9.8 * dt * 0.6;
        sp.p.addScaledVector(sp.v, dt);
        pos.setXYZ(i, sp.p.x, sp.p.y, sp.p.z);
        const k = Math.max(0, sp.life / 1.6);
        col.setXYZ(i, 1 * k, 0.75 * k, 0.3 * k);
      } else {
        col.setXYZ(i, 0, 0, 0);
      }
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;

    this.ledTex.offset.x = (t * 0.03) % 1;
    if (this.frame % 3 === 0) this.drawScreen(t);
    this.renderer.render(this.scene, this.camera);
  };

  // ---------- API ----------
  setBrand(color: string, name: string) {
    this.brandColor.set(color);
    this.brandName = name;
    for (const m of this.brandMats) { m.color.set(color); m.emissive.set(color); }
    this.movers.forEach((m, i) => {
      if (i % 2 === 0) { m.light.color.set(color); (m.cone.material as THREE.MeshBasicMaterial).color.set(color); }
    });
    for (let i = 0; i < this.crowd.count; i++) {
      if (Math.random() < 0.16) this.crowd.setColorAt(i, new THREE.Color(color));
    }
    if (this.crowd.instanceColor) this.crowd.instanceColor.needsUpdate = true;
    this.drawLed();
  }
  shot(name: Shot) {
    this.wantTarget.set(...SHOTS[name].target);
    this.wantPos.set(...SHOTS[name].pos);
    // מסך צר: המצלמה מתרחקת כדי שהזירה כולה תיכנס ברוחב
    if (window.innerWidth < 900 && name !== 'stage' && name !== 'entrance') this.wantPos.sub(this.wantTarget).multiplyScalar(1.7).add(this.wantTarget);
  }
  setScreen(c: ScreenContent) { this.screen = c; }
  setSide(side: 'start' | 'end') { this.side = side; this.resize(); }
  setHype(h: number) { this.hype = h; }
  pop(intensity = 0.6) { this.spike = Math.min(1, this.spike + intensity); }
  pyro() {
    let k = 0;
    for (let i = 0; i < 600 && k < 260; i++) {
      if (this.sparks[i] && this.sparks[i].life > 0) continue;
      const x = (k % 2 ? -1 : 1) * (6 + Math.random() * 2);
      this.sparks[i] = { p: new THREE.Vector3(x, 1.3, -16), v: new THREE.Vector3((Math.random() - 0.5) * 2.5, 9 + Math.random() * 6, (Math.random() - 0.5) * 2.5), life: 1 + Math.random() * 0.8 };
      k++;
    }
    this.pop(0.8);
  }
  dispose() { this.running = false; this.renderer.dispose(); }
}

// ---------- מופע יחיד, עם פקודות שנשמרות עד שהזירה מוכנה ----------
let world: ArenaWorld | null = null;
const pending: ((w: ArenaWorld) => void)[] = [];
function run(f: (w: ArenaWorld) => void) { if (world) f(world); else pending.push(f); }

export function mountArena(canvas: HTMLCanvasElement) {
  try {
    world = new ArenaWorld(canvas);
  } catch (e) {
    console.warn('arena unavailable', e);
    return () => {};
  }
  pending.splice(0).forEach((f) => f(world!));
  const onResize = () => world?.resize();
  window.addEventListener('resize', onResize);
  return () => { window.removeEventListener('resize', onResize); world?.dispose(); world = null; };
}

export const arena = {
  brand: (color: string, name: string) => run((w) => w.setBrand(color, name)),
  shot: (s: Shot) => run((w) => w.shot(s)),
  screen: (c: ScreenContent) => run((w) => w.setScreen(c)),
  hype: (h: number) => run((w) => w.setHype(h)),
  pop: (i?: number) => run((w) => w.pop(i)),
  pyro: () => run((w) => w.pyro()),
  side: (side: 'start' | 'end') => run((w) => w.setSide(side)),
};
