import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

const Interactive3DCanvas = () => {
  const mountRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    let isMounted = true;
    let cameraUtils = null;
    let hands = null;

    // 1. Three.js Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    // 2. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // Transparent Background
    mountRef.current.appendChild(renderer.domElement);

    // 3. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight1.position.set(5, 10, 7.5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x3b82f6, 1.0);
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    // 4. 3D Model Loading
    let model = null;

    const loader = new GLTFLoader();
    loader.load(
      '/models/brain.glb', // প্রজেক্টের public/models/brain.glb পাথ
      (gltf) => {
        if (!isMounted) return;
        model = gltf.scene;
        model.scale.set(2, 2, 2);
        scene.add(model);
      },
      undefined,
      (error) => {
        if (!isMounted) return;
        console.warn('3D Model not found, loading fallback shape.');
        const geometry = new THREE.TorusKnotGeometry(1, 0.3, 100, 16);
        const material = new THREE.MeshStandardMaterial({
          color: 0x00ffcc,
          roughness: 0.2,
          metalness: 0.5,
        });
        model = new THREE.Mesh(geometry, material);
        scene.add(model);
      }
    );

    // 5. MediaPipe Hands Setup (সঠিক ভার্সন সিডিএন সহ)
    hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results) => {
      if (!isMounted) return;
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0 && model) {
        const landmarks = results.multiHandLandmarks[0];
        
        // তর্জনীর ডগা (Index Finger Tip - Landmark 8)
        const indexTip = landmarks[8];

        // হাতের ইশারায় একপাশ থেকে অন্যপাশে সরানো (Position Tracking)
        const targetX = (0.5 - indexTip.x) * 8;
        const targetY = (0.5 - indexTip.y) * 6;

        // স্মুথ মুভমেন্ট (Lerp)
        model.position.x += (targetX - model.position.x) * 0.1;
        model.position.y += (targetY - model.position.y) * 0.1;

        // স্মুথ রোটেশন
        model.rotation.y = targetX * 0.5;
        model.rotation.x = targetY * 0.5;
      }
    });

    // 6. Webcam Feed Start
    if (videoRef.current) {
      cameraUtils = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && hands) {
            await hands.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });
      cameraUtils.start();
    }

    // 7. Animation Loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // 8. Cleanup (মেমোরি লিক ও ওয়েবক্যাম হ্যাং হওয়া রোধে)
    return () => {
      isMounted = false;
      cancelAnimationFrame(animationFrameId);

      if (cameraUtils) {
        cameraUtils.stop();
      }

      if (hands) {
        hands.close();
      }

      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <video ref={videoRef} style={{ display: 'none' }} playsInline />
      <div
        ref={mountRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />
    </div>
  );
};

export default Interactive3DCanvas;