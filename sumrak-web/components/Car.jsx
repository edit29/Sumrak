'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { COLORS, normalizeColor } from '../lib/config';

const CAR_LENGTH = 4.6;
const CAR_WIDTH = 1.8;
const tintColor = (vlt, color) => {
  const value = vlt === 'ath' ? .8 : Number(vlt) / 100;
  return vlt === 'ath'
    ? new THREE.Color(COLORS[normalizeColor(color)][1]).multiplyScalar(value)
    : new THREE.Color(value, value, value);
};

export default function Car({ type, wins = [], lights = [], vlt, color, cart = [] }) {
  const host = useRef(), api = useRef(), [bad, setBad] = useState(false), [modelStatus, setModelStatus] = useState('loading');

  useEffect(() => {
    const el = host.current;
    let ren;
    try {
      ren = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      ren.setPixelRatio(Math.min(devicePixelRatio, 2));
      el.appendChild(ren.domElement);
      const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(35, 4 / 3, .1, 50);
      sc.add(new THREE.HemisphereLight(0xffffff, 0x778899, 1.1));
      const dl = new THREE.DirectionalLight(0xffffff, 1);
      dl.position.set(4, 6, 3);
      sc.add(dl);

      const cv = document.createElement('canvas');
      cv.width = cv.height = 128;
      const g = cv.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(0,0,0,.45)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 128);
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
      sh.rotation.x = -Math.PI / 2;
      sh.position.y = .01;
      sh.scale.set(CAR_LENGTH * 1.5, CAR_WIDTH * 2, 1);
      sc.add(sh);

      const windows = {};
      ['front', 'rear', 'fs', 'rs'].forEach(key => {
        windows[key] = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
      });
      const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: .32, metalness: .35 });
      const tireMaterial = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: .9 });
      const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x858585, roughness: .36, metalness: .65 });
      const lightMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: .2, roughness: .22 });
      const headlightMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: .2, roughness: .22 });
      const taillightMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: .2, roughness: .22 });
      const materials = [bodyMaterial, tireMaterial, wheelMaterial, lightMaterial, headlightMaterial, taillightMaterial, ...Object.values(windows)];
      const releaseMaterials = sourceMaterials => {
        const textures = new Set();
        sourceMaterials.forEach(material => {
          Object.values(material).forEach(value => {
            if (value?.isTexture) textures.add(value);
          });
          material.dispose();
        });
        textures.forEach(texture => texture.dispose());
      };
      const disposeVehicle = (root, disposeMaterials = false) => {
        const sourceMaterials = new Set();
        root.traverse(node => {
          if (!node.isMesh) return;
          node.geometry.dispose();
          if (disposeMaterials) {
            const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
            nodeMaterials.forEach(material => material && sourceMaterials.add(material));
          }
        });
        if (disposeMaterials) releaseMaterials(sourceMaterials);
      };

      let vehicle = null, disposed = false, dirty = true, raf;
      let az = -.9, ph = 1.15, drag = false, px = 0, py = 0;
      let auto = !matchMedia('(prefers-reduced-motion:reduce)').matches;
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      loader.load('/models/sedan.glb', gltf => {
        const loadedVehicle = gltf.scene;
        if (disposed) {
          disposeVehicle(loadedVehicle, true);
          return;
        }

        try {
          loadedVehicle.rotation.y = Math.PI / 2;
          let bounds = new THREE.Box3().setFromObject(loadedVehicle);
          const size = bounds.getSize(new THREE.Vector3());
          if (!Number.isFinite(size.x) || size.x <= 0) {
            throw new Error('Модель седана не содержит корректную геометрию.');
          }
          loadedVehicle.scale.setScalar(CAR_LENGTH / size.x);
          loadedVehicle.updateMatrixWorld(true);
          bounds = new THREE.Box3().setFromObject(loadedVehicle);
          const center = bounds.getCenter(new THREE.Vector3());
          const wheelBounds = new THREE.Box3();
          let foundWheels = false;
          const foundWindows = new Set();
          const sourceMaterials = new Set();

          loadedVehicle.traverse(node => {
            if (!node.isMesh) return;
            const name = node.name.toLowerCase();
            const group = Object.keys(windows).find(key => name.includes(`sumrak-window-${key}`));
            const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
            nodeMaterials.forEach(material => material && sourceMaterials.add(material));

            if (group) {
              node.material = windows[group];
              foundWindows.add(group);
            } else if (/tire|tyre/.test(name)) {
              node.material = tireMaterial;
              const wheel = new THREE.Box3().setFromObject(node);
              if (foundWheels) wheelBounds.union(wheel);
              else { wheelBounds.copy(wheel); foundWheels = true; }
            } else if (/rim/.test(name)) {
              node.material = wheelMaterial;
            } else if (/taillight/.test(name)) {
              node.material = taillightMaterial;
            } else if (/headlight|fog_light|lens_reflector/.test(name)) {
              node.material = headlightMaterial;
            } else if (/headlight|fog_light|blinker|light|reflector|reflight/.test(name)) {
              node.material = lightMaterial;
            } else {
              node.material = bodyMaterial;
            }
          });

          const missingWindows = Object.keys(windows).filter(key => !foundWindows.has(key));
          if (missingWindows.length) {
            throw new Error(`В модели седана не найдены группы стёкол: ${missingWindows.join(', ')}.`);
          }
          if (!foundWheels) {
            throw new Error('В модели седана не найдены колёса для установки на землю.');
          }
          releaseMaterials(sourceMaterials);
          loadedVehicle.position.set(-center.x, -wheelBounds.min.y, -center.z);
          vehicle = loadedVehicle;
          sc.add(vehicle);
          setModelStatus('ready');
          dirty = true;
        } catch (error) {
          console.error('Не удалось подготовить 3D-модель седана.', error);
          disposeVehicle(loadedVehicle, true);
          setModelStatus('error');
        }
      }, undefined, error => {
        if (disposed) return;
        console.error('Не удалось загрузить 3D-модель седана.', error);
        setModelStatus('error');
      });

      api.current = { sync(t, w, l, v, c, items) {
        const selected = new Map();
        items.forEach(item => {
          if ((item.service || 'tint') !== 'tint' || item.type === 'other') return;
          const tint = tintColor(item.vlt, item.color);
          (item.windows || []).forEach(key => selected.set(`window:${key}`, tint));
          (item.lights || []).forEach(key => selected.set(`light:${key}`, tint));
        });
        if (t !== 'other') {
          const tint = tintColor(v, c);
          w.forEach(key => selected.set(`window:${key}`, tint));
          l.forEach(key => selected.set(`light:${key}`, tint));
        }
        const clear = new THREE.Color(0xffffff);
        Object.entries(windows).forEach(([key, material]) => {
          material.color.copy(selected.get(`window:${key}`) || clear);
        });
        const headlightTint = selected.get('light:headlights');
        headlightMaterial.color.copy(headlightTint || clear);
        headlightMaterial.emissive.copy(headlightTint || clear);
        headlightMaterial.emissiveIntensity = headlightTint ? .02 : .2;
        const taillightTint = selected.get('light:taillights');
        taillightMaterial.color.copy(taillightTint || clear);
        taillightMaterial.emissive.copy(taillightTint || clear);
        taillightMaterial.emissiveIntensity = taillightTint ? .02 : .2;
        dirty = true;
      }, reset() { az = -.9; ph = 1.15; dirty = true; } };

      const fit = () => {
        ren.setSize(el.clientWidth, el.clientHeight, false);
        cam.aspect = el.clientWidth / el.clientHeight;
        cam.updateProjectionMatrix();
        dirty = true;
      };
      const ro = new ResizeObserver(fit);
      ro.observe(el);
      const c = ren.domElement;
      c.onpointerdown = e => { drag = true; auto = false; px = e.clientX; py = e.clientY; c.setPointerCapture(e.pointerId); };
      c.onpointermove = e => {
        if (!drag) return;
        az -= (e.clientX - px) * .008;
        ph = Math.min(1.35, Math.max(.25, ph - (e.clientY - py) * .006));
        px = e.clientX;
        py = e.clientY;
        dirty = true;
      };
      c.onpointerup = c.onpointercancel = () => { drag = false; };
      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (auto) { az += .003; dirty = true; }
        if (!dirty || !vehicle) return;
        dirty = false;
        const distance = CAR_LENGTH * 1.3 + 1.5;
        cam.position.set(distance * Math.sin(ph) * Math.cos(az), distance * Math.cos(ph), distance * Math.sin(ph) * Math.sin(az));
        cam.lookAt(0, .7, 0);
        ren.render(sc, cam);
      };
      fit();
      loop();
      return () => {
        disposed = true;
        cancelAnimationFrame(raf);
        ro.disconnect();
        if (vehicle) disposeVehicle(vehicle);
        sh.geometry.dispose();
        sh.material.map.dispose();
        sh.material.dispose();
        materials.forEach(material => material.dispose());
        ren.dispose();
        ren.domElement.remove();
      };
    } catch (error) {
      console.error('Не удалось инициализировать 3D-модель седана.', error);
      setBad(true);
    }
  }, []);

  useEffect(() => { api.current?.sync(type, wins, lights, vlt, color, cart); }, [type, wins, lights, vlt, color, cart]);
  return <div className="sticky"><div className="stage" ref={host}>
    {bad && <div className="poster">3D недоступно в этом браузере.<br />Выбор и заказ работают как обычно.</div>}
    {modelStatus === 'loading' && <div className="model-status" role="status">Загружается модель седана…</div>}
    {modelStatus === 'error' && <div className="model-status model-status-error" role="alert">Не удалось загрузить модель седана.</div>}
  </div>
    <div className="row" style={{ marginTop: '.5rem' }}><span className="mute">Для всех типов кузова показана одна модель седана; цвет кузова и дисков фиксированный, тонировка стёкол соответствует текущей позиции и выбору в заказе.</span><button className="chip" onClick={() => api.current?.reset()}>Сбросить ракурс</button></div>
  </div>;
}
