import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FaceLandmarker, HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export default function XRayMirror({ isActive, mode = 'skull', onStreamReady }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const compositeCanvasRef = useRef(null); // WebRTC-তে পাঠানোর জন্য অফ-স্ক্রিন ক্যানভাস
  const [status, setStatus] = useState('Initializing AI X-Ray...');

  useEffect(() => {
    if (!isActive) return;

    let animationFrameId;
    let faceLandmarker;
    let handLandmarker;
    let stream;

    const initXRay = async () => {
      try {
        // ১. MediaPipe Vision মডেল লোড করা
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numFaces: 1
        });

        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numHands: 2
        });

        // ২. ওয়েবক্যাম চালু করা
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // ৩. Three.js স্বচ্ছ ক্যানভাস সেটআপ
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, 640 / 480, 0.1, 100);
        camera.position.z = 5;

        const renderer = new THREE.WebGLRenderer({
          canvas: canvasRef.current,
          alpha: true,
          antialias: true
        });
        renderer.setSize(640, 480);

        // এক্স-রে ইফেক্টের জন্য সায়ান-হোয়াইট লাইটিং
        const ambientLight = new THREE.AmbientLight(0x88ccff, 1.5);
        const dirLight = new THREE.DirectionalLight(0xffffff, 2);
        dirLight.position.set(0, 2, 5);
        scene.add(ambientLight, dirLight);

        // ৪. 3D মডেল লোড করা
        const loader = new GLTFLoader();
        let activeModel = null;
        const modelPath = mode === 'skull' ? '/models/skull.glb' : '/models/hand_bones.glb';

        loader.load(modelPath, (gltf) => {
          activeModel = gltf.scene;
          activeModel.scale.set(1.2, 1.2, 1.2);
          scene.add(activeModel);
          setStatus('AI X-Ray Active');
        });

        // ৫. প্রতি ফ্রেমে ট্র্যাকিং ও 3D মডেল আপডেট
        const compCtx = compositeCanvasRef.current?.getContext('2d');

        // WebRTC-তে কম্বাইন্ড স্ট্রিম পাঠানো (যাতে শিক্ষার্থীরাও দেখতে পায়)
        if (compositeCanvasRef.current && onStreamReady) {
          const combinedStream = compositeCanvasRef.current.captureStream(30);
          onStreamReady(combinedStream);
        }

        const renderLoop = () => {
          const video = videoRef.current;
          if (video && video.readyState >= 2) {
            const now = performance.now();

            if (mode === 'skull' && faceLandmarker && activeModel) {
              const faceResult = faceLandmarker.detectForVideo(video, now);
              if (faceResult.faceLandmarks?.length > 0) {
                const nose = faceResult.faceLandmarks[0][1]; // নাকের ডগা
                activeModel.position.set((0.5 - nose.x) * 4.5, (0.5 - nose.y) * 3.5, 0);
              }
            } else if (mode === 'hand' && handLandmarker && activeModel) {
              const handResult = handLandmarker.detectForVideo(video, now);
              if (handResult.landmarks?.length > 0) {
                const palm = handResult.landmarks[0][9]; // হাতের তালুর কেন্দ্র
                activeModel.position.set((0.5 - palm.x) * 4.5, (0.5 - palm.y) * 3.5, 0);
              }
            }

            renderer.render(scene, camera);

            // ভিডিও + 3D এক্স-রে লেয়ার একসাথে অফ-স্ক্রিন ক্যানভাসে আঁকা
            if (compCtx && canvasRef.current) {
              compCtx.save();
              compCtx.scale(-1, 1);
              compCtx.drawImage(video, -640, 0, 640, 480);
              compCtx.restore();
              compCtx.drawImage(canvasRef.current, 0, 0, 640, 480);
            }
          }
          animationFrameId = requestAnimationFrame(renderLoop);
        };

        renderLoop();
      } catch (err) {
        console.error('X-Ray Mirror Error:', err);
        setStatus('Camera or Model Load Failed');
      }
    };

    initXRay();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [isActive, mode]);

  if (!isActive) return null;

  return (
    <div style={{ position: 'relative', width: '640px', height: '480px', borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
      <span style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, background: 'rgba(0,0,0,0.6)', color: '#38bdf8', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>
        {status}
      </span>

      {/* শিক্ষকের লাইভ ক্যামেরা */}
      <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />

      {/* ওপরে স্বচ্ছ 3D X-Ray লেয়ার */}
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />

      {/* WebRTC স্ট্রিমিংয়ের জন্য হিডেন ক্যানভাস */}
      <canvas ref={compositeCanvasRef} width={640} height={480} style={{ display: 'none' }} />
    </div>
  );
}