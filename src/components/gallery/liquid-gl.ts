import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from "ogl";

/*
 * Rendu WebGL du Liquid Carousel. Le DOM reste la source de vérité (mise en page, liens,
 * accessibilité) : chaque image du DOM est doublée d'un plan WebGL calé sur sa position,
 * qui se courbe et ondule selon la vitesse du défilement, avec une onde au survol.
 */

const vertex = /* glsl */ `
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uVelocity;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    // La carte se creuse comme une nappe d'eau poussée par le geste.
    p.y += sin(uv.x * 3.14159) * uVelocity * 0.09;
    p.x += sin(uv.y * 3.14159) * uVelocity * 0.03;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  uniform sampler2D tMap;
  uniform vec2 uImageSize;
  uniform vec2 uPlaneSize;
  uniform vec2 uMouse;
  uniform float uVelocity;
  uniform float uHover;
  uniform float uTime;
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
    vec2 uv = vUv;
    float v = abs(uVelocity);

    // Houle : ondulation proportionnelle à la vitesse.
    uv.x += sin(uv.y * 11.0 + uTime * 2.2) * 0.014 * v;
    uv.y += cos(uv.x * 9.0 + uTime * 1.7) * 0.009 * v;

    // Ronds dans l'eau autour du pointeur.
    vec2 d = (uv - uMouse) * vec2(uPlaneSize.x / uPlaneSize.y, 1.0);
    float dist = length(d);
    float ripple = sin(dist * 38.0 - uTime * 5.5) * 0.007 * uHover * smoothstep(0.5, 0.0, dist);
    uv += normalize(d + 1e-5) * ripple;
    uv = (uv - 0.5) * (1.0 - 0.045 * uHover) + 0.5;

    vec2 c = cover(uv);
    float shift = 0.007 * uVelocity;
    vec3 col = vec3(
      texture2D(tMap, c + vec2(shift, 0.0)).r,
      texture2D(tMap, c).g,
      texture2D(tMap, c - vec2(shift, 0.0)).b
    );
    gl_FragColor = vec4(col * uAlpha, uAlpha);
  }
`;

type Item = {
  el: HTMLElement;
  mesh: Mesh;
  program: Program;
  hover: number;
  loadedAt: number | null;
};

export class LiquidGL {
  private renderer: Renderer;
  private camera: Camera;
  private scene = new Transform();
  private items: Item[] = [];
  private velocity = 0;
  private targetVelocity = 0;
  private mouse = { x: -1e4, y: -1e4 };
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
    this.renderer = new Renderer({ canvas: this.canvas, alpha: true, premultipliedAlpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio || 1, 2) });
    const gl = this.renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    this.camera = new Camera(gl, { left: -1, right: 1, top: 1, bottom: -1, near: 0.1, far: 100 });
    this.camera.position.z = 10;
    const geometry = new Plane(gl, { widthSegments: 32, heightSegments: 16 });

    for (const el of elements) {
      const texture = new Texture(gl, { generateMipmaps: false });
      const program = new Program(gl, {
        vertex,
        fragment,
        transparent: true,
        uniforms: {
          tMap: { value: texture },
          uImageSize: { value: [1, 1] },
          uPlaneSize: { value: [1, 1] },
          uMouse: { value: [0.5, 0.5] },
          uVelocity: { value: 0 },
          uHover: { value: 0 },
          uTime: { value: 0 },
          uAlpha: { value: 0 },
        },
      });
      const mesh = new Mesh(gl, { geometry, program });
      mesh.frustumCulled = false; // positions en pixels : le test de frustum d'ogl ne s'applique pas
      mesh.setParent(this.scene);
      const item: Item = { el, mesh, program, hover: 0, loadedAt: null };
      this.items.push(item);

      const img = new Image();
      img.decoding = "async";
      img.src = el.dataset.src!;
      img.decode().then(() => {
        texture.image = img;
        program.uniforms.uImageSize.value = [img.naturalWidth, img.naturalHeight];
        item.loadedAt = performance.now();
        onReady(el);
      }).catch(() => {});
    }
    this.resize();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
  }

  // ogl fixe la taille CSS du canvas : on mesure le conteneur, pas le canvas.
  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.orthographic({ left: -w / 2, right: w / 2, top: h / 2, bottom: -h / 2, near: 0.1, far: 100 });
  }

  setVelocity(v: number) {
    this.targetVelocity = Math.max(-1, Math.min(1, v));
  }

  setPointer(x: number, y: number) {
    this.mouse = { x, y };
  }

  render() {
    const box = this.canvas.getBoundingClientRect();
    this.velocity += (this.targetVelocity - this.velocity) * 0.08;
    const time = (performance.now() - this.start) / 1000;

    for (const item of this.items) {
      const r = item.el.getBoundingClientRect();
      const u = item.program.uniforms;
      item.mesh.scale.set(r.width, r.height, 1);
      item.mesh.position.set(r.left + r.width / 2 - box.left - box.width / 2, -(r.top + r.height / 2 - box.top - box.height / 2), 0);

      const inside = this.mouse.x >= r.left && this.mouse.x <= r.right && this.mouse.y >= r.top && this.mouse.y <= r.bottom;
      item.hover += ((inside ? 1 : 0) - item.hover) * 0.07;
      if (inside) u.uMouse.value = [(this.mouse.x - r.left) / r.width, 1 - (this.mouse.y - r.top) / r.height];

      u.uPlaneSize.value = [r.width, r.height];
      u.uVelocity.value = this.velocity;
      u.uHover.value = item.hover;
      u.uTime.value = time;
      // Fondu d'apparition de 600 ms, indépendant de la cadence d'affichage.
      u.uAlpha.value = item.loadedAt === null ? 0 : Math.min(1, (performance.now() - item.loadedAt) / 600);
    }
    this.renderer.render({ scene: this.scene, camera: this.camera });
  }

  destroy() {
    this.observer.disconnect();
    this.renderer.gl.getExtension("WEBGL_lose_context")?.loseContext();
    this.canvas.remove();
  }
}
