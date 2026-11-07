import * as THREE from 'three';
// An orthographic, top-down camera preserves exact input alignment with the SVG.
// Depth comes from beveled geometry and directional shadows, never hidden passages.
export class MazeScene {
  constructor(host) {
    this.host = host;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    this.renderer.setClearColor(0xf3f5f0, 1);
    this.renderer.domElement.className = 'maze-canvas';
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    host.prepend(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 6, 6, 0, 0.1, 100);
    this.camera.position.set(0, 0, 25);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const light = new THREE.DirectionalLight(0xffffff, 2.2);
    light.position.set(-4, 7, 12);
    light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    Object.assign(light.shadow.camera, {
      left: -20,
      right: 20,
      top: 20,
      bottom: -20,
      near: 0.1,
      far: 60,
    });
    light.shadow.bias = -0.0001;
    light.shadow.normalBias = 0.012;
    this.scene.add(light);
    this.scene.add(light.target);
    this.wallMat = new THREE.MeshStandardMaterial({ color: 0x819376, roughness: 0.72 });
    this.routeMat = new THREE.MeshStandardMaterial({ color: 0x337d5b, roughness: 0.45 });
    this.bestMat = new THREE.MeshStandardMaterial({ color: 0xb2cbb9, roughness: 0.8 });
    this.optimalMat = new THREE.MeshStandardMaterial({ color: 0x273f31, roughness: 0.65 });
    this.endpointMat = new THREE.MeshStandardMaterial({ color: 0xfaffef, roughness: 0.3 });
    this.walls = new THREE.Group();
    this.paths = new THREE.Group();
    this.scene.add(this.walls, this.paths);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
  }
  resize() {
    const s = this.host.clientWidth;
    if (!s) return;
    this.renderer.setSize(s, s, false);
    this.render();
  }
  clear(group) {
    while (group.children.length) {
      const c = group.children[0];
      group.remove(c);
      c.geometry?.dispose();
    }
  }
  block(w, h, d, material) {
    const shape = new THREE.Shape();
    const r = Math.min(0.035, w / 3, h / 3);
    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    shape.lineTo(w / 2, h / 2 - r);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    shape.lineTo(-w / 2 + r, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    shape.lineTo(-w / 2, -h / 2 + r);
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const mesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, {
        depth: d,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.022,
        bevelThickness: 0.025,
        curveSegments: 3,
      }),
      material,
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
  setMaze(maze) {
    this.n = maze.n;
    this.clear(this.walls);
    Object.assign(this.camera, { left: 0, right: this.n, top: this.n, bottom: 0 });
    this.camera.updateProjectionMatrix();
    if (this.floor) {
      this.scene.remove(this.floor);
      this.floor.geometry.dispose();
      this.floor.material.dispose();
    }
    this.floor = new THREE.Mesh(
      new THREE.PlaneGeometry(this.n, this.n),
      new THREE.MeshStandardMaterial({ color: 0xf3f5f0, roughness: 1 }),
    );
    this.floor.position.set(this.n / 2, this.n / 2, -0.07);
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);
    const wall = (x, y, w, h) => {
      const mesh = this.block(w, h, 0.2, this.wallMat);
      mesh.position.set(x, this.n - y, 0);
      this.walls.add(mesh);
    };
    wall(this.n / 2, 0.045, this.n, 0.09);
    wall(this.n / 2, this.n - 0.045, this.n, 0.09);
    wall(0.045, this.n / 2, 0.09, this.n);
    wall(this.n - 0.045, this.n / 2, 0.09, this.n);
    for (let i = 0; i < this.n * this.n; i++) {
      const x = i % this.n,
        y = Math.floor(i / this.n);
      if (x < this.n - 1 && !maze.g[i].includes(i + 1)) wall(x + 1, y + 0.5, 0.1, 1.04);
      if (y < this.n - 1 && !maze.g[i].includes(i + this.n)) wall(x + 0.5, y + 1, 1.04, 0.1);
    }
    this.render();
  }
  route(path, mat, z = 0.015, dotted = false) {
    const point = (i) =>
      new THREE.Vector3((i % this.n) + 0.5, this.n - Math.floor(i / this.n) - 0.5, z);
    for (let j = 1; j < path.length; j++) {
      const a = point(path[j - 1]),
        b = point(path[j]);
      if (dotted) {
        for (let t = 0; t < 1; t += 0.22) {
          const dot = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), mat);
          dot.position.copy(a).lerp(b, t);
          this.paths.add(dot);
        }
        continue;
      }
      const delta = b.clone().sub(a);
      const piece = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.075, delta.length(), 12),
        mat,
      );
      piece.position.copy(a).add(b).multiplyScalar(0.5);
      piece.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
      piece.castShadow = true;
      this.paths.add(piece);
    }
    if (!dotted)
      for (const cell of path) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), mat);
        dot.position.copy(point(cell));
        dot.castShadow = true;
        this.paths.add(dot);
      }
  }
  update(path, best, optimal) {
    this.clear(this.paths);
    if (best) this.route(best, this.bestMat);
    this.route(path, this.routeMat, 0.035);
    if (optimal) this.route(optimal, this.optimalMat, 0.13, true);
    if (path.length) {
      const i = path.at(-1),
        orb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 12), this.endpointMat);
      orb.position.set((i % this.n) + 0.5, this.n - Math.floor(i / this.n) - 0.5, 0.12);
      orb.castShadow = true;
      this.paths.add(orb);
    }
    this.render();
  }
  render() {
    if (this.renderer) this.renderer.render(this.scene, this.camera);
  }
}
