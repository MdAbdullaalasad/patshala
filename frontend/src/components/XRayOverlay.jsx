import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  FaceLandmarker,
  HandLandmarker,
  PoseLandmarker,
  FilesetResolver
} from '@mediapipe/tasks-vision';

// হাতের ২১টি জয়েন্টের হাড়ের সংযোগ
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [0, 13], [13, 14], [14, 15], [15, 16],// Ring
  [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [5, 9], [9, 13], [13, 17]             // Metacarpals
];

// মাথার খুলির চোয়াল, কপাল, নাক ও গালের হাড়ের সংযোগ
const SKULL_BONE_CONNECTIONS = [
  // নিচের চোয়াল (Mandible - মুখ হাঁ করলে নিচে নামবে)
  [234, 93], [93, 132], [132, 58], [58, 172], [172, 136], [136, 150], [150, 149], [149, 176], [176, 148], [148, 152],
  [454, 323], [323, 361], [361, 288], [288, 397], [397, 365], [365, 379], [379, 378], [378, 400], [400, 377], [377, 152],
  // কপালের হাড় (Frontal Bone)
  [234, 127], [127, 162], [162, 21], [21, 54], [54, 103], [103, 67], [67, 109], [109, 10],
  [454, 356], [356, 389], [389, 251], [251, 284], [284, 332], [332, 297], [297, 338], [338, 10],
  // নাসাস্থি (Nasal Bridge)
  [168, 6], [6, 197], [197, 195], [195, 5], [5, 4], [4, 1],
  // গালের হাড় ও ওপরের চোয়াল (Zygomatic & Maxilla)
  [234, 116], [116, 123], [123, 147], [147, 213], [213, 192], [192, 214], [214, 13],
  [454, 345], [345, 352], [352, 376], [376, 433], [433, 416], [416, 434], [434, 13]
];

// ফুল বডি স্কেলিটনের হাড়ের সংযোগ
const BODY_CONNECTIONS = [
  [11, 12],             // Clavicle / Shoulders
  [11, 13], [13, 15],   // Left Arm
  [12, 14], [14, 16],   // Right Arm
  [11, 23], [12, 24],   // Torso Sides
  [23, 24],             // Pelvis
  [23, 25], [25, 27],   // Left Leg
  [24, 26], [26, 28]    // Right Leg
];

const ANATOMY_DETAILS = {
  skull: [
    { title: 'Frontal Bone (কপাল)', desc: 'মস্তিষ্কের সামনের অংশ (Frontal Lobe) সুরক্ষা দেয়।' },
    { title: 'Orbit (অক্ষিকোটর)', desc: 'চোখ ও অপটিক নার্ভকে চারদিক থেকে রক্ষা করে।' },
    { title: 'Zygomatic & Maxilla', desc: 'গালের উঁচু হাড় এবং ওপরের চোয়ালের গঠন তৈরি করে।' },
    { title: 'Mandible (নিচের চোয়াল)', desc: 'খুলির একমাত্র নড়াচড়াযোগ্য হাড়, যা কথা বলা ও চিবানোয় কাজ করে।' }
  ],
  hand: [
    { title: 'Thumb (বৃদ্ধাঙ্গুলি)', desc: '২টি Phalanges হাড় নিয়ে গঠিত, যা কোনো কিছু ধরতে সাহায্য করে।' },
    { title: 'Index, Middle, Ring, Pinky', desc: 'প্রতিটি আঙুলে ৩টি করে Phalanges হাড় থাকে।' },
    { title: 'Metacarpals (তালুর হাড়)', desc: '৫টি লম্বা হাড় যা হাতের তালুর মূল কাঠামো গঠন করে।' },
    { title: 'Carpals (কব্জির হাড়)', desc: '৮টি ছোট হাড়ের সমষ্টি যা হাতের কব্জিকে নমনীয় রাখে।' }
  ],
  body: [
    { title: 'Cranium & Cervical Spine', desc: 'মাথার খুলি ও ঘাড়ের ৭টি কশেরুকা যা মস্তিষ্ককে ধরে রাখে।' },
    { title: 'Clavicle, Sternum & Ribcage', desc: 'বক্ষপিঞ্জর যা হৃৎপিণ্ড (Heart) ও ফুসফুসকে (Lungs) সুরক্ষা দেয়।' },
    { title: 'Humerus, Radius & Ulna', desc: 'বাহুর ওপর ও নিচের হাড় যা কনুই ও হাত নাড়াতে সাহায্য করে।' },
    { title: 'Pelvis, Femur & Tibia', desc: 'শরীরের ভর বহনকারী কোমর ও পায়ের দীর্ঘতম শক্তিশালী হাড়।' }
  ]
};

export default function XRayOverlay({ isActive, mode, sourceVideoRef, onCombinedStream }) {
  const overlay3DCanvasRef = useRef(null);
  const label2DCanvasRef = useRef(null);
  const compositeCanvasRef = useRef(null);
  const modeRef = useRef(mode);
  const [loadingText, setLoadingText] = useState('Initializing AI X-Ray...');

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    if (!isActive || !sourceVideoRef?.current) return;

    let animId;
    let isDisposed = false;
    let faceLandmarker = null;
    let handLandmarker = null;
    let poseLandmarker = null;

    // দাগ টেনে নির্দিষ্ট অংশের নাম আঁকার ফাংশন (Skull, Hand, Body তিনটি মোডেই)
    const drawCalloutLines = (ctx, landmarks, currentMode, width, height, cropX, cropY) => {
      ctx.clearRect(0, 0, width, height);
      if (!landmarks) return;

      ctx.save();
      ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
      ctx.lineWidth = 1.8;

      const toScreen = (pt) => {
        const adjX = (pt.x - 0.5) * cropX + 0.5;
        const adjY = (pt.y - 0.5) * cropY + 0.5;
        return {
          x: (1 - adjX) * width,
          y: adjY * height,
          vis: pt.visibility !== undefined ? pt.visibility : 1
        };
      };

      let callouts = [];

      if (currentMode === 'skull') {
        callouts = [
          { pt: toScreen(landmarks[10]), name: '1. Frontal Bone (কপালের হাড়)', dx: 110, dy: -35 },
          { pt: toScreen(landmarks[33]), name: '2. Left Orbit (বাম চোখের কোটর)', dx: -195, dy: -22 },
          { pt: toScreen(landmarks[263]), name: '3. Right Orbit (ডান চোখের কোটর)', dx: 115, dy: -12 },
          { pt: toScreen(landmarks[1]), name: '4. Nasal Bone (নাসাস্থি)', dx: 120, dy: 12 },
          { pt: toScreen(landmarks[234]), name: '5. Zygomatic Arch (গালের হাড়)', dx: -200, dy: 12 },
          { pt: toScreen(landmarks[13]), name: '6. Maxilla (ওপরের চোয়াল)', dx: -195, dy: 42 },
          { pt: toScreen(landmarks[152]), name: '7. Mandible (নিচের চোয়াল)', dx: 110, dy: 40 }
        ];
      } else if (currentMode === 'hand') {
        callouts = [
          { pt: toScreen(landmarks[4]), name: '1. Thumb / Pollex (বৃদ্ধাঙ্গুলি)', dx: -185, dy: -15 },
          { pt: toScreen(landmarks[8]), name: '2. Index Finger (তর্জনী)', dx: -145, dy: -52 },
          { pt: toScreen(landmarks[12]), name: '3. Middle Finger (মধ্যমা)', dx: 10, dy: -62 },
          { pt: toScreen(landmarks[16]), name: '4. Ring Finger (অনামিকা)', dx: 105, dy: -45 },
          { pt: toScreen(landmarks[20]), name: '5. Pinky Finger (কনিষ্ঠা)', dx: 125, dy: -15 },
          { pt: toScreen(landmarks[6]), name: '6. Proximal Phalanges (আঙুলের হাড়)', dx: -195, dy: 18 },
          { pt: toScreen(landmarks[9]), name: '7. Metacarpals (তালুর হাড়)', dx: 125, dy: 20 },
          { pt: toScreen(landmarks[0]), name: '8. Carpals (কব্জির হাড়)', dx: 115, dy: 50 }
        ];
      } else if (currentMode === 'body') {
        const nose = toScreen(landmarks[0]);
        const mouth = toScreen(landmarks[10]);
        const lShoulder = toScreen(landmarks[11]);
        const rShoulder = toScreen(landmarks[12]);
        const lElbow = toScreen(landmarks[13]);
        const rElbow = toScreen(landmarks[14]);
        const lWrist = toScreen(landmarks[15]);
        const rWrist = toScreen(landmarks[16]);
        const lPinky = toScreen(landmarks[17]);
        const lHip = toScreen(landmarks[23]);
        const rHip = toScreen(landmarks[24]);
        const lKnee = toScreen(landmarks[25]);
        const rKnee = toScreen(landmarks[26]);
        const lAnkle = toScreen(landmarks[27]);

        const neckPt = {
          x: (lShoulder.x + rShoulder.x) / 2,
          y: (nose.y + lShoulder.y) / 2,
          vis: Math.min(lShoulder.vis, rShoulder.vis)
        };
        const chestPt = {
          x: (lShoulder.x + rShoulder.x) / 2,
          y: lShoulder.y + (lHip.y - lShoulder.y) * 0.28,
          vis: Math.min(lShoulder.vis, lHip.vis)
        };
        const spinePt = {
          x: (lHip.x + rHip.x) / 2,
          y: lShoulder.y + (lHip.y - lShoulder.y) * 0.68,
          vis: Math.min(lHip.vis, rHip.vis)
        };
        const femurPt = {
          x: (lHip.x + lKnee.x) / 2,
          y: (lHip.y + lKnee.y) / 2,
          vis: Math.min(lHip.vis, lKnee.vis)
        };
        const tibiaPt = {
          x: (lKnee.x + lAnkle.x) / 2,
          y: (lKnee.y + lAnkle.y) / 2,
          vis: Math.min(lKnee.vis, lAnkle.vis)
        };

        callouts = [
          { pt: nose, name: '1. Cranium / Skull (মাথার খুলি)', dx: 95, dy: -32 },
          { pt: neckPt, name: '2. Cervical Spine (ঘাড়ের কশেরুকা)', dx: 105, dy: -12 },
          { pt: lShoulder, name: '3. Left Clavicle (বাম কণ্ঠাস্থি)', dx: 95, dy: -5 },
          { pt: chestPt, name: '4. Sternum & Ribcage (বক্ষপিঞ্জর / পাঁজর)', dx: 105, dy: 8 },
          { pt: lElbow, name: '5. Left Humerus (বাম বাহুর হাড়)', dx: 95, dy: 0 },
          { pt: lWrist, name: '6. Radius & Ulna (সম্মুখ বাহু ও কব্জি)', dx: 95, dy: 8 },
          { pt: lPinky, name: '7. Carpals & Phalanges (হাতের আঙুল)', dx: 90, dy: 18 },
          { pt: lHip, name: '8. Pelvis / Hip Bone (শ্রোণিচক্র)', dx: 95, dy: 8 },
          { pt: femurPt, name: '9. Femur (উরুর দীর্ঘ হাড়)', dx: 95, dy: 12 },
          { pt: tibiaPt, name: '10. Tibia & Fibula (পায়ের নলার হাড়)', dx: 95, dy: 15 },
          { pt: mouth, name: '11. Mandible (নিচের চোয়াল)', dx: -175, dy: -10 },
          { pt: rShoulder, name: '12. Right Clavicle & Scapula (ডান কাঁধ)', dx: -185, dy: -12 },
          { pt: rElbow, name: '13. Right Humerus (ডান বাহুর হাড়)', dx: -175, dy: 5 },
          { pt: rWrist, name: '14. Right Radius & Ulna (ডান কব্জি)', dx: -180, dy: 18 },
          { pt: spinePt, name: '15. Lumbar Spine (কোমরের মেরুদণ্ড)', dx: -185, dy: 12 },
          { pt: rKnee, name: '16. Patella / Knee Joint (হাঁটুর মালাইচাকি)', dx: -185, dy: 15 }
        ];
      }

      callouts.forEach((item) => {
        if (!item.pt || item.pt.vis < 0.3) return;

        const { x, y } = item.pt;
        const endX = Math.max(20, Math.min(width - 20, x + item.dx));
        const endY = Math.max(22, Math.min(height - 22, y + item.dy));

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
        ctx.beginPath();
        ctx.arc(x, y, 8.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.lineTo(endX + (item.dx >= 0 ? 14 : -14), endY);
        ctx.stroke();

        const textWidth = ctx.measureText(item.name).width;
        const boxW = textWidth + 12;
        const boxH = 22;
        let boxX = item.dx >= 0 ? endX + 16 : endX - boxW - 16;
        boxX = Math.max(8, Math.min(width - boxW - 8, boxX));
        const boxY = endY - 11;

        ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
        ctx.fillRect(boxX, boxY, boxW, boxH);

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.1;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(item.name, boxX + 6, endY + 4);
      });

      ctx.restore();
    };

    const initAll = async () => {
      try {
        setLoadingText('Loading AI Vision Models...');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        if (isDisposed) return;

        const [faceLM, handLM, poseLM] = await Promise.all([
          FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'GPU'
            },
            runningMode: 'VIDEO',
            numFaces: 1
          }),
          HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'GPU'
            },
            runningMode: 'VIDEO',
            numHands: 2
          }),
          PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
              delegate: 'GPU'
            },
            runningMode: 'VIDEO',
            numPoses: 1
          })
        ]);

        if (isDisposed) return;

        faceLandmarker = faceLM;
        handLandmarker = handLM;
        poseLandmarker = poseLM;

        const canvas3D = overlay3DCanvasRef.current;
        const canvas2D = label2DCanvasRef.current;
        if (!canvas3D || !canvas2D) return;

        const scene = new THREE.Scene();
        const fov = 45;
        const camZ = 5;
        const camera = new THREE.PerspectiveCamera(fov, 16 / 9, 0.1, 100);
        camera.position.z = camZ;

        const renderer = new THREE.WebGLRenderer({
          canvas: canvas3D,
          alpha: true,
          antialias: true
        });

        const ambientLight = new THREE.AmbientLight(0x38bdf8, 2.5);
        const dirLight = new THREE.DirectionalLight(0xffffff, 2.8);
        dirLight.position.set(0, 3, 5);
        scene.add(ambientLight, dirLight);

        const xrayMaterial = new THREE.MeshPhysicalMaterial({
          color: 0xe0f2fe,
          emissive: 0x0284c7,
          emissiveIntensity: 0.65,
          roughness: 0.2,
          transparent: true,
          opacity: 0.88
        });

        // --- ১. REAL-TIME 3D SKULL (মাথার সাথে ১০০% লক করা ও চোয়াল নড়াচড়াযোগ্য) ---
        const skullGroup = new THREE.Group();
        const craniumDome = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 24), xrayMaterial);
        const leftOrbitRing = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 10, 24), xrayMaterial);
        const rightOrbitRing = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 10, 24), xrayMaterial);
        const nasalCone = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 4), xrayMaterial);
        const upperTeeth = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.14), xrayMaterial);
        const lowerTeeth = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.045, 0.12), xrayMaterial);

        const skullBones = SKULL_BONE_CONNECTIONS.map(() => {
          const m = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 1, 8), xrayMaterial);
          skullGroup.add(m);
          return m;
        });

        skullGroup.add(
          craniumDome,
          leftOrbitRing,
          rightOrbitRing,
          nasalCone,
          upperTeeth,
          lowerTeeth
        );
        skullGroup.visible = false;
        scene.add(skullGroup);

        // --- ২. HAND SKELETON (ভাঁজ করা ২১টি জয়েন্ট ও ২০টি হাড়) ---
        const handGroups = [0, 1].map(() => {
          const group = new THREE.Group();
          const joints = Array.from({ length: 21 }, () => {
            const m = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 12), xrayMaterial);
            group.add(m);
            return m;
          });
          const bones = HAND_CONNECTIONS.map(() => {
            const m = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.036, 1, 10), xrayMaterial);
            group.add(m);
            return m;
          });
          group.visible = false;
          scene.add(group);
          return { group, joints, bones };
        });

        // --- ৩. FULL BODY SKELETON ---
        const fullBodyGroup = new THREE.Group();
        const bodyJoints = Array.from({ length: 33 }, () => {
          const m = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), xrayMaterial);
          fullBodyGroup.add(m);
          return m;
        });
        const bodyBones = BODY_CONNECTIONS.map(() => {
          const m = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.044, 1, 10), xrayMaterial);
          fullBodyGroup.add(m);
          return m;
        });
        const ribRings = Array.from({ length: 5 }, () => {
          const torus = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 8, 24), xrayMaterial);
          torus.rotation.x = Math.PI / 2.2;
          fullBodyGroup.add(torus);
          return torus;
        });
        const spineMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 1, 12), xrayMaterial);
        const bodyCraniumMesh = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), xrayMaterial);
        fullBodyGroup.add(spineMesh, bodyCraniumMesh);
        fullBodyGroup.visible = false;
        scene.add(fullBodyGroup);

        setLoadingText('');

        const compCanvas = compositeCanvasRef.current;
        const compCtx = compCanvas?.getContext('2d');
        if (compCanvas && onCombinedStream) {
          onCombinedStream(compCanvas.captureStream(30));
        }

        const upVec = new THREE.Vector3(0, 1, 0);

        const renderLoop = () => {
          if (isDisposed) return;

          const video = sourceVideoRef.current;
          if (video && video.readyState >= 2 && canvas3D && canvas2D) {
            const rect = canvas3D.getBoundingClientRect();
            const cw = Math.round(rect.width) || 1280;
            const ch = Math.round(rect.height) || 720;

            if (canvas3D.width !== cw || canvas3D.height !== ch) {
              renderer.setSize(cw, ch, false);
              camera.aspect = cw / ch;
              camera.updateProjectionMatrix();
            }
            if (canvas2D.width !== cw || canvas2D.height !== ch) {
              canvas2D.width = cw;
              canvas2D.height = ch;
            }

            const vHeight = 2 * Math.tan((fov * Math.PI) / 360) * camZ;
            const vWidth = vHeight * (cw / ch);

            const vidW = video.videoWidth || 640;
            const vidH = video.videoHeight || 480;
            const vidAspect = vidW / vidH;
            const boxAspect = cw / ch;

            let cropX = 1;
            let cropY = 1;
            if (vidAspect < boxAspect) {
              cropY = boxAspect / vidAspect;
            } else {
              cropX = vidAspect / boxAspect;
            }

            const normToWorld = (nx, ny, nz = 0) => {
              const adjX = (nx - 0.5) * cropX + 0.5;
              const adjY = (ny - 0.5) * cropY + 0.5;
              const wx = (0.5 - adjX) * vWidth;
              const wy = (0.5 - adjY) * vHeight;
              const wz = -nz * 1.2;
              return new THREE.Vector3(wx, wy, wz);
            };

            const now = performance.now();
            const currentMode = modeRef.current;
            let activeLandmarks = null;

            skullGroup.visible = false;
            handGroups.forEach((hg) => (hg.group.visible = false));
            fullBodyGroup.visible = false;

            // ================= ১. SKULL MODE (মাথার জায়গায় নিখুঁতভাবে বসা ও মুভমেন্ট) =================
            if (currentMode === 'skull' && faceLandmarker) {
              const res = faceLandmarker.detectForVideo(video, now);
              if (res.faceLandmarks?.length > 0) {
                const face = res.faceLandmarks[0];
                activeLandmarks = face;
                skullGroup.visible = true;

                const worldPts = face.map((lm) => normToWorld(lm.x, lm.y, lm.z));

                const headH = worldPts[10].distanceTo(worldPts[152]);
                const headW = worldPts[234].distanceTo(worldPts[454]);

                // মাথার খুলির ওপরের অংশ (Cranium) কপালের ওপরে সঠিকভাবে বসানো
                const browCenter = worldPts[168];
                const topHead = worldPts[10];
                const upDir = new THREE.Vector3().subVectors(topHead, browCenter).normalize();
                craniumDome.position.copy(topHead).addScaledVector(upDir, headH * 0.14);
                craniumDome.scale.set(headW * 1.02, headH * 0.68, headW * 0.95);

                // চোখের কোটর (Left & Right Orbits)
                const leftEye = worldPts[159].clone().lerp(worldPts[145], 0.5);
                const rightEye = worldPts[386].clone().lerp(worldPts[374], 0.5);
                const orbitScale = headW * 0.85;
                leftOrbitRing.position.copy(leftEye);
                leftOrbitRing.scale.setScalar(orbitScale);
                rightOrbitRing.position.copy(rightEye);
                rightOrbitRing.scale.setScalar(orbitScale);

                // নাসাস্থি (Nasal Bridge)
                nasalCone.position.copy(worldPts[195]);
                nasalCone.scale.setScalar(headW * 0.85);

                // ওপরের ও নিচের দাঁতের পাটি (মুখ হাঁ করলে চোয়াল আলাদা হবে)
                upperTeeth.position.copy(worldPts[13]);
                upperTeeth.scale.setScalar(headW * 0.9);
                lowerTeeth.position.copy(worldPts[14]);
                lowerTeeth.scale.setScalar(headW * 0.9);

                // চোয়াল ও গালের হাড়ের সংযোগ
                SKULL_BONE_CONNECTIONS.forEach(([s, e], idx) => {
                  const p1 = worldPts[s];
                  const p2 = worldPts[e];
                  const bone = skullBones[idx];
                  bone.position.copy(p1).add(p2).multiplyScalar(0.5);
                  bone.scale.set(1, p1.distanceTo(p2), 1);
                  const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
                  bone.quaternion.setFromUnitVectors(upVec, dir);
                });
              }
            }

            // ================= ২. HAND MODE (হাতের সাথে ভাঁজ করা কঙ্কাল) =================
            if (currentMode === 'hand' && handLandmarker) {
              const res = handLandmarker.detectForVideo(video, now);
              if (res.landmarks?.length > 0) {
                activeLandmarks = res.landmarks[0];

                res.landmarks.forEach((landmarks, hIdx) => {
                  const hg = handGroups[hIdx];
                  if (!hg) return;
                  hg.group.visible = true;

                  const worldPts = landmarks.map((lm) => normToWorld(lm.x, lm.y, lm.z));
                  worldPts.forEach((pt, idx) => hg.joints[idx].position.copy(pt));

                  HAND_CONNECTIONS.forEach(([s, e], bIdx) => {
                    const p1 = worldPts[s];
                    const p2 = worldPts[e];
                    const bone = hg.bones[bIdx];
                    bone.position.copy(p1).add(p2).multiplyScalar(0.5);
                    bone.scale.set(1, p1.distanceTo(p2), 1);
                    const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
                    bone.quaternion.setFromUnitVectors(upVec, dir);
                  });
                });
              }
            }

            // ================= ৩. FULL BODY SKELETON MODE =================
            if (currentMode === 'body' && poseLandmarker) {
              const res = poseLandmarker.detectForVideo(video, now);
              if (res.landmarks?.length > 0) {
                const pose = res.landmarks[0];
                activeLandmarks = pose;
                fullBodyGroup.visible = true;

                const worldPts = pose.map((lm) => normToWorld(lm.x, lm.y, lm.z));

                bodyJoints.forEach((j, idx) => {
                  if (idx >= 11 && idx <= 28) {
                    j.visible = true;
                    j.position.copy(worldPts[idx]);
                  } else {
                    j.visible = false;
                  }
                });

                BODY_CONNECTIONS.forEach(([s, e], bIdx) => {
                  const p1 = worldPts[s];
                  const p2 = worldPts[e];
                  const bone = bodyBones[bIdx];
                  bone.position.copy(p1).add(p2).multiplyScalar(0.5);
                  bone.scale.set(1, p1.distanceTo(p2), 1);
                  const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
                  bone.quaternion.setFromUnitVectors(upVec, dir);
                });

                const nose = worldPts[0];
                const leftEar = worldPts[7];
                const rightEar = worldPts[8];
                const headRadius = leftEar.distanceTo(rightEar) * 0.65;
                bodyCraniumMesh.position.copy(nose).add(new THREE.Vector3(0, headRadius * 0.25, 0));
                bodyCraniumMesh.scale.set(headRadius * 4, headRadius * 4.8, headRadius * 4);

                const shoulderMid = new THREE.Vector3().addVectors(worldPts[11], worldPts[12]).multiplyScalar(0.5);
                const hipMid = new THREE.Vector3().addVectors(worldPts[23], worldPts[24]).multiplyScalar(0.5);
                const torsoHeight = shoulderMid.distanceTo(hipMid);
                const shoulderWidth = worldPts[11].distanceTo(worldPts[12]);

                spineMesh.position.copy(shoulderMid).add(hipMid).multiplyScalar(0.5);
                spineMesh.scale.set(1, torsoHeight, 1);
                const spineDir = new THREE.Vector3().subVectors(shoulderMid, hipMid).normalize();
                spineMesh.quaternion.setFromUnitVectors(upVec, spineDir);

                ribRings.forEach((ring, rIdx) => {
                  const t = 0.15 + rIdx * 0.13;
                  ring.position.lerpVectors(shoulderMid, hipMid, t);
                  const ribScale = shoulderWidth * (0.78 - rIdx * 0.04);
                  ring.scale.set(ribScale, ribScale * 0.65, 1);
                });
              }
            }

            renderer.render(scene, camera);

            // তিনটি মোডেই দাগ টেনে টেনে হাড়ের নাম আঁকা
            const ctx2D = canvas2D.getContext('2d');
            drawCalloutLines(ctx2D, activeLandmarks, currentMode, cw, ch, cropX, cropY);

            if (compCtx) {
              compCtx.clearRect(0, 0, 1280, 720);
              compCtx.save();
              compCtx.scale(-1, 1);
              compCtx.drawImage(video, -1280, 0, 1280, 720);
              compCtx.restore();
              compCtx.drawImage(canvas3D, 0, 0, 1280, 720);
              compCtx.drawImage(canvas2D, 0, 0, 1280, 720);
            }
          }

          animId = requestAnimationFrame(renderLoop);
        };

        renderLoop();
      } catch (err) {
        console.error('XRay Initialization Error:', err);
        setLoadingText('AI X-Ray Load Failed');
      }
    };

    initAll();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animId);
      if (faceLandmarker) faceLandmarker.close();
      if (handLandmarker) handLandmarker.close();
      if (poseLandmarker) poseLandmarker.close();
    };
  }, [isActive]);

  if (!isActive) return null;

  const detailsList = ANATOMY_DETAILS[mode] || [];

  return (
    <>
      {loadingText && (
        <div style={{
          position: 'absolute', top: '25px', left: '50%', transform: 'translateX(-50%)', zIndex: 50,
          background: 'rgba(15, 23, 42, 0.92)', color: '#38bdf8',
          padding: '8px 18px', borderRadius: '10px', fontSize: '13px', border: '1px solid #38bdf8'
        }}>
          {loadingText}
        </div>
      )}

      {/* ১. 3D X-Ray Overlay Canvas */}
      <canvas
        ref={overlay3DCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 15
        }}
      />

      {/* ২. দাগ টেনে নির্দিষ্ট অংশের নাম দেখানোর 2D Callout Canvas */}
      <canvas
        ref={label2DCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 18
        }}
      />

      {/* ৩. বাম পাশে ডিটেইলস অ্যানাটমি তথ্য কার্ড */}
      <div style={{
        position: 'absolute',
        top: '24px',
        left: '24px',
        width: '285px',
        background: 'rgba(9, 13, 26, 0.84)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(56, 189, 248, 0.45)',
        borderRadius: '16px',
        padding: '15px',
        color: '#f8fafc',
        zIndex: 25,
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)'
      }}>
        <div style={{ marginBottom: '10px', borderBottom: '1px solid rgba(56,189,248,0.25)', paddingBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: '800', letterSpacing: '1px', color: '#38bdf8' }}>
            AI X-RAY ANATOMY • {mode.toUpperCase()}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          {detailsList.map((item, idx) => (
            <div key={idx} style={{ background: 'rgba(56, 189, 248, 0.08)', padding: '8px 10px', borderRadius: '10px', borderLeft: '3px solid #38bdf8' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#7dd3fc', marginBottom: '2px' }}>
                {item.title}
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.35' }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ৪. WebRTC স্ট্রিমিংয়ের হিডেন কম্বাইন্ড ক্যানভাস */}
      <canvas ref={compositeCanvasRef} width={1280} height={720} style={{ display: 'none' }} />
    </>
  );
}