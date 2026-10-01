import { Camera, Mesh, Plane, Post, Program, Renderer, Texture, Transform } from "ogl";

/*
 * Rendu WebGL du Liquid Carousel, en deux passes :
 *  1. le ruban de tirages : chaque image du DOM est doublée d'un plan WebGL calé sur sa position
 *     (le DOM reste la source de vérité : mise en page, liens, accessibilité) ;
 *  2. la lentille : le ruban est vu à travers une lentille de verre liquide inclinée.
 *     Le centre est optiquement plat ; le bord comprime l'image, l'entraîne dans le sens du
 *     mouvement, la décompose en spectre et s'illumine. Hors de la lentille, le ruban s'efface
 *     dans une brume sombre.
 */

const planeVertex = /* glsl */ `
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const planeFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D tMap;
  uniform vec2 uImageSize;
  uniform vec2 uPlaneSize;
  uniform float uAlpha;
  varying vec2 vUv;

  // Équivalent de object-fit: cover.
  vec2 cover(vec2 uv) {
    float rp = uPlaneSize.x / uPlaneSize.y;
    float ri = uImageSize.x / uImageSize.y;
    vec2 s = rp < ri ? vec2(rp / ri, 1.0) : vec2(1.0, ri / rp);
    return (uv - 0.5) * s + 0.5;
  }

  void main() {
    vec3 col = texture2D(tMap, cover(vUv)).rgb;
    gl_FragColor = vec4(col * uAlpha, uAlpha);
  }
`;

const lensFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D tMap;
  uniform vec2 uResolution;
  uniform vec2 uLens;      // demi-axes de la lentille, en px
  uniform float uTilt;     // inclinaison, en radians
  uniform float uVelocity; // -1..1
  uniform float uTime;
  uniform vec3 uGlow;
  varying vec2 vUv;

  vec4 sampleAt(vec2 px) {
    return texture2D(tMap, clamp(px / uResolution, 0.0, 1.0));
  }

  void main() {
    vec2 px = vUv * uResolution;
    vec2 c = uResolution * 0.5;
    vec2 d = px - c;
    float cs = cos(uTilt), sn = sin(uTilt);
    vec2 p = vec2(cs * d.x + sn * d.y, -sn * d.x + cs * d.y);   // repère de la lentille
    vec2 q = p / uLens;
    float theta = atan(q.y, q.x);
    float r = length(q);
    // Bord liquide : la lentille respire légèrement.
    r += sin(theta * 3.0 + uTime * 0.7) * 0.010 + sin(theta * 5.0 - uTime * 1.1) * 0.006;

    float v = clamp(uVelocity, -1.0, 1.0);
    float band = smoothstep(0.62, 1.0, r) * (1.0 - step(1.0, r));   // anneau réfractant
    float edge = pow(band, 1.6);

    // Direction radiale dans le repère écran.
    vec2 radial = normalize(d + 1e-4);
    // Réfraction : le bord aspire l'image vers l'intérieur et l'entraîne avec le mouvement.
    vec2 offset = -radial * edge * 0.09 * min(uLens.x, uLens.y);
    offset.x -= v * edge * 0.22 * uLens.x;
    vec2 base = px + offset;

    // Spectre : les trois canaux ne sont pas déviés de la même façon.
    float spread = edge * (3.0 + abs(v) * 28.0);
    vec4 sr = sampleAt(base + radial * spread);
    vec4 sg = sampleAt(base);
    vec4 sb = sampleAt(base - radial * spread);
    vec4 inside = vec4(sr.r, sg.g, sb.b, max(sg.a, max(sr.a, sb.a)));

    // Hors de la lentille : brume sombre et désaturée.
    vec4 plain = sampleAt(px);
    float grey = dot(plain.rgb, vec3(0.299, 0.587, 0.114));
    vec4 fog = vec4(mix(plain.rgb, vec3(grey), 0.55) * 0.28, plain.a * 0.9);

    float outside = smoothstep(0.995, 1.02, r);
    vec4 col = mix(inside, fog, outside);

    // Contour lumineux du verre, plus vif quand le ruban glisse.
    float rim = exp(-pow((r - 1.0) * 34.0, 2.0)) * (0.32 + abs(v) * 0.9);
    float sheen = exp(-pow((r - 0.9) * 10.0, 2.0)) * 0.05 * (0.6 + 0.4 * sin(theta * 2.0 - 0.6));
    vec3 light = uGlow * (rim + sheen);
    gl_FragColor = vec4(col.rgb + light, max(col.a, clamp(rim + sheen, 0.0, 1.0)));
  }
`;

type Item = { el: HTMLElement; mesh: Mesh; program: Program; loadedAt: number | null };
type Uniforms = Record<string, { value: unknown }>;

export class LiquidGL {
  private renderer: Renderer;
  private camera: Camera;
  private scene = new Transform();
  private post: Post;
  private lens: Uniforms;
  private items: Item[] = [];
  private velocity = 0;
  private targetVelocity = 0;
  private start = performance.now();
  private canvas: HTMLCanvasElement;
  private observer: ResizeObserver;

  /** Chaque instance crée et détruit son propre <canvas> : un contexte perdu n'est jamais réutilisé. */
  constructor(
    private container: HTMLElement,
    elements: HTMLElement[],
    onReady: (el: HTMLElement) => void,
  ) {
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("aria-hidden", "true");
    this.canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
    container.appendChild(this.canvas);

    this.renderer = new Renderer({
      canvas: this.canvas,
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    });
    const gl = this.renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    this.camera = new Camera(gl, { left: -1, right: 1, top: 1, bottom: -1, near: 0.1, far: 100 });
    this.camera.position.z = 10;

    const geometry = new Plane(gl);
    for (const el of elements) {
      const texture = new Texture(gl, { generateMipmaps: false });
      const program = new Program(gl, {
        vertex: planeVertex,
        fragment: planeFragment,
        transparent: true,
        uniforms: {
          tMap: { value: texture },
          uImageSize: { value: [1, 1] },
          uPlaneSize: { value: [1, 1] },
          uAlpha: { value: 0 },
        },
      });
      const mesh = new Mesh(gl, { geometry, program });
      mesh.frustumCulled = false; // positions en pixels : le test de frustum d'ogl ne s'applique pas
      mesh.setParent(this.scene);
      const item: Item = { el, mesh, program, loadedAt: null };
      this.items.push(item);

      const img = new Image();
      img.decoding = "async";
      img.src = el.dataset.src!;
      img
        .decode()
        .then(() => {
          texture.image = img;
          program.uniforms.uImageSize.value = [img.naturalWidth, img.naturalHeight];
          item.loadedAt = performance.now();
          onReady(el);
        })
        .catch(() => {});
    }

    this.post = new Post(gl);
    this.lens = this.post.addPass({
      fragment: lensFragment,
      uniforms: {
        uResolution: { value: [1, 1] },
        uLens: { value: [1, 1] },
        uTilt: { value: -0.12 },
        uVelocity: { value: 0 },
        uTime: { value: 0 },
        uGlow: { value: [1.0, 0.86, 0.68] }, // Lueur, adoucie
      },
    }).uniforms as Uniforms;

    this.resize();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
  }

  // ogl fixe la taille CSS du canvas : on mesure le conteneur, pas le canvas.
  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.post.resize();
    this.camera.orthographic({ left: -w / 2, right: w / 2, top: h / 2, bottom: -h / 2, near: 0.1, far: 100 });
    this.lens.uResolution.value = [w, h];
  }

  setVelocity(v: number) {
    this.targetVelocity = Math.max(-1, Math.min(1, v));
  }

  render() {
    const box = this.canvas.getBoundingClientRect();
    this.velocity += (this.targetVelocity - this.velocity) * 0.12;
    const now = performance.now();

    // Lentille calée sur une carte : le tirage central tient dans la zone plate,
    // ses voisins n'apparaissent que déformés par le bord.
    const card = this.items[0]?.el.getBoundingClientRect();
    if (card && card.height > 0) {
      const narrow = box.width < 768;
      this.lens.uLens.value = [Math.min(card.width * (narrow ? 0.64 : 0.78), box.width * 0.47), card.height * (narrow ? 0.56 : 0.6)];
    }

    for (const item of this.items) {
      const r = item.el.getBoundingClientRect();
      const u = item.program.uniforms;
      item.mesh.scale.set(r.width, r.height, 1);
      item.mesh.position.set(r.left + r.width / 2 - box.left - box.width / 2, -(r.top + r.height / 2 - box.top - box.height / 2), 0);
      u.uPlaneSize.value = [r.width, r.height];
      // Fondu d'apparition de 600 ms, indépendant de la cadence d'affichage.
      u.uAlpha.value = item.loadedAt === null ? 0 : Math.min(1, (now - item.loadedAt) / 600);
    }

    this.lens.uVelocity.value = this.velocity;
    this.lens.uTime.value = (now - this.start) / 1000;
    this.post.render({ scene: this.scene, camera: this.camera });
  }

  destroy() {
    this.observer.disconnect();
    this.renderer.gl.getExtension("WEBGL_lose_context")?.loseContext();
    this.canvas.remove();
  }
}
