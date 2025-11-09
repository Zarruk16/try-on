import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Button } from "@/components/ui/button";

interface ArSceneProps {
  isCameraFlipped?: boolean;
  modelUrl?: string;
  placeOnDetection?: boolean;
  onSessionChange?: (active: boolean) => void;
  anchorHintNDC?: { x: number; y: number } | null;
}

export default function ArScene({ isCameraFlipped = false, modelUrl, placeOnDetection = false, onSessionChange, anchorHintNDC = null }: ArSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<THREE.Group | null>(null); // Changed to Group for wrapper
  const markerRef = useRef<THREE.Group | null>(null);
  const hitTestSourceRef = useRef<XRHitTestSource | null>(null);
  const hitTestSourceRequestedRef = useRef<boolean>(false);
  const referenceSpaceRef = useRef<XRReferenceSpace | null>(null);
  const hitTestReferenceSpaceRef = useRef<XRReferenceSpace | null>(null);
  const hasPlacedRef = useRef<boolean>(false);
  const [hasPlaced, setHasPlaced] = useState<boolean>(false);
  const autoPlaceStartRef = useRef<number | null>(null);
  const controllerRef = useRef<THREE.XRTargetRaySpace | null>(null);
  const [isARSupported, setIsARSupported] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isARSessionActive, setIsARSessionActive] = useState<boolean>(false);
  const prevMarkerPosRef = useRef<THREE.Vector3 | null>(null);
  const prevMarkerQuatRef = useRef<THREE.Quaternion | null>(null);

  const startARSession = async () => {
    if (!navigator.xr) {
      setErrorMessage('WebXR not available.');
      return;
    }
  
    try {
      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay', 'local-floor', 'bounded-floor'],
        domOverlay: { root: document.body },
      });
  
      if (rendererRef.current) {
        rendererRef.current.xr.setSession(session);
      }
  
      // Try different reference spaces
      const referenceSpaceTypes = ['local-floor', 'bounded-floor', 'local', 'viewer'];
      let refSpace = null;
      
      for (const type of referenceSpaceTypes) {
        try {
          refSpace = await session.requestReferenceSpace(type as XRReferenceSpaceType);
          console.log(`Using reference space: ${type}`);
          break;
        } catch (e) {
          console.log(`Reference space ${type} not supported`);
        }
      }
      
      if (!refSpace) {
        throw new Error('No supported reference space found');
      }
      
      referenceSpaceRef.current = refSpace;

      try {
        if (typeof session.requestHitTestSource === 'function') {
          // Prefer viewer space for hit testing on mobile AR
          const viewerSpace = await session.requestReferenceSpace('viewer');
          hitTestReferenceSpaceRef.current = viewerSpace;
          const source = await session.requestHitTestSource({
            space: viewerSpace,
          });
          if (source) {
            hitTestSourceRef.current = source;
            hitTestSourceRequestedRef.current = true;
          }
        }
      } catch (err) {
        console.error('Hit test source error:', err);
        setErrorMessage('Could not initialize hit testing.');
      }
    } catch (err) {
      console.error('Failed to start AR session:', err);
      setErrorMessage('Could not start AR session.');
    }
  };

  const stopARSession = () => {
    if (rendererRef.current) {
      rendererRef.current.xr.getSession()?.end();
    }
  };

  useEffect(() => {
    // Check for WebXR support
    if ('xr' in navigator) {
      navigator.xr?.isSessionSupported('immersive-ar').then((supported) => {
        setIsARSupported(supported);
        if (!supported) {
          setErrorMessage('AR is not supported on your device.');
        }
      }).catch((error) => {
        console.error('Error checking AR support:', error);
        setErrorMessage('Error checking AR support.');
      });
    } else {
      setErrorMessage('WebXR is not supported in your browser.');
    }

    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 0.1;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    // Reduce internal resolution to fight camera lag on mobile AR
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = false;
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);
    controllerRef.current = controller;

    // Create marker
    const markerGroup = new THREE.Group();
    const footShape = new THREE.Shape();
    footShape.moveTo(0, 0);
    footShape.bezierCurveTo(0.1, 0, 0.2, 0.1, 0.2, 0.2);
    footShape.lineTo(0.2, 0.4);
    footShape.bezierCurveTo(0.2, 0.5, 0.1, 0.5, 0, 0.5);
    footShape.lineTo(0, 0);
    const footGeometry = new THREE.ShapeGeometry(footShape);
    const footMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    const footMesh = new THREE.Mesh(footGeometry, footMaterial);
    footMesh.rotateX(-Math.PI / 2);
    footMesh.scale.set(0.2, 0.2, 0.2);
    markerGroup.add(footMesh);
    const outlineGeometry = new THREE.EdgesGeometry(footGeometry);
    const outlineMaterial = new THREE.LineBasicMaterial({ 
      color: 0xffffff,
      linewidth: 2
    });
    const outline = new THREE.LineSegments(outlineGeometry, outlineMaterial);
    outline.rotateX(-Math.PI / 2);
    outline.scale.set(0.2, 0.2, 0.2);
    markerGroup.add(outline);

    const pulseAnimation = () => {
      if (markerRef.current) {
        const scale = 1 + Math.sin(Date.now() * 0.005) * 0.1;
        markerRef.current.scale.set(scale, scale, scale);
        const opacity = 0.5 + Math.sin(Date.now() * 0.005) * 0.2;
        markerRef.current.children.forEach(child => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
            child.material.opacity = opacity;
          }
        });
      }
    };

    markerGroup.visible = false;
    scene.add(markerGroup);
    markerRef.current = markerGroup;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Remove any previous model before loading a new one
    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current = null;
    }

    // Load 3D model
    const loader = new GLTFLoader();
    loader.setCrossOrigin('anonymous');
    // Integrate Draco and Meshopt to speed up loading if the asset is encoded
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    dracoLoader.setDecoderConfig({ type: 'js' });
    loader.setDRACOLoader(dracoLoader);
    loader.setMeshoptDecoder(MeshoptDecoder);
    const url = modelUrl && modelUrl.trim().length > 0 ? modelUrl : '/model/sneaker.glb';
    console.log('Starting to load model from URL:', url);
    loader.load(
      url,
      (gltf) => {
        console.log('Model loaded, processing...');
        const model = gltf.scene;

        // --- FIX: Wrapper Group for Centering ---
        const wrapper = new THREE.Group();
        
        // Center the model *inside* the wrapper
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        wrapper.add(model); // Add model to wrapper
        
        // Apply scale to the wrapper
        wrapper.scale.set(0.1, 0.1, 0.1);
        
        // Add wrapper to scene and store wrapper in ref
        scene.add(wrapper);
        modelRef.current = wrapper; // <-- Store the wrapper, not the model
        console.log('Model (wrapped) added to scene successfully');

        // --- FIX: Race Condition Check ---
        // Check if AR is ALREADY active when the model finishes loading
        if (rendererRef.current?.xr.isPresenting) {
          console.log('Model loaded during active AR session. Hiding.');
          wrapper.visible = false;
          wrapper.position.set(0, 0, -0.5); // "waiting" position
        } else {
          // If not in AR, show it for the main screen view
          console.log('Model loaded in non-AR view. Showing.');
          wrapper.visible = true;
          wrapper.position.set(0, 0, 0); // Position for non-AR view
          
          // Only set camera if not in AR
          camera.position.set(0, 0, 1);
          camera.lookAt(wrapper.position); // Look at the wrapper's position
        }
      },
      (progress) => {
        console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
      },
      (error) => {
        console.error('Error loading model:', error);
      }
    );

    // Handle AR session
    renderer.xr.addEventListener('sessionstart', () => {
      console.log('AR session started');
      setIsARSessionActive(true);
      onSessionChange?.(true);
      hitTestSourceRequestedRef.current = false;
      hasPlacedRef.current = false;
      setHasPlaced(false);
      autoPlaceStartRef.current = null;
      
      if (modelRef.current) {
        console.log('Resetting model for AR session');
        modelRef.current.visible = false;
        modelRef.current.position.set(0, 0, -0.5);
      } else {
        console.warn('Model not available during AR session start');
      }
    });

    renderer.xr.addEventListener('sessionend', () => {
      console.log('AR session ended');
      setIsARSessionActive(false);
      onSessionChange?.(false);
      hasPlacedRef.current = false;
      setHasPlaced(false);
      if (modelRef.current) {
        modelRef.current.visible = true;
        // Position for non-AR view
        modelRef.current.position.set(0, 0, 0); 
        modelRef.current.rotation.set(0, 0, 0);
        camera.position.set(0, 0, 1);
        camera.lookAt(modelRef.current.position);
      }
      if (markerRef.current) {
        markerRef.current.visible = false;
      }
    });

    function onSelect() {
      console.log('Selection event triggered');
      if (modelRef.current && markerRef.current?.visible) {
        console.log('Placing model at marker position');
        modelRef.current.position.copy(markerRef.current.position);
        modelRef.current.quaternion.copy(markerRef.current.quaternion);
        
        modelRef.current.visible = true;
        // modelRef.current.position.y += 0.05; // Optional: lift slightly
        hasPlacedRef.current = true;
        setHasPlaced(true);
        
        console.log('Model placed at:', {
          position: modelRef.current.position,
          visible: modelRef.current.visible
        });
      } else {
        console.log('Cannot place model:', {
          modelExists: !!modelRef.current,
          markerVisible: markerRef.current?.visible
        });
      }
    }

    const onXRFrame = (time: number, frame: XRFrame) => {
      if (hitTestSourceRef.current && markerRef.current && hitTestReferenceSpaceRef.current) {
        const hitTestResults = frame.getHitTestResults(hitTestSourceRef.current);
        if (hitTestResults.length > 0) {
          // If we have an anchor hint (in NDC), prefer the hit whose projected screen position is closest to the hint
          let hit = hitTestResults[0];
          if (anchorHintNDC && renderer.xr.isPresenting) {
            const xrCam = renderer.xr.getCamera();
            let bestIdx = 0;
            let bestDist = Number.POSITIVE_INFINITY;
            for (let i = 0; i < hitTestResults.length; i++) {
              const pose = hitTestResults[i].getPose(hitTestReferenceSpaceRef.current!);
              if (!pose) continue;
              const m = new THREE.Matrix4().fromArray(pose.transform.matrix);
              const pos = new THREE.Vector3().setFromMatrixPosition(m);
              const ndc = pos.clone().project(xrCam);
              const dx = ndc.x - anchorHintNDC.x;
              const dy = ndc.y - anchorHintNDC.y;
              const dist = dx * dx + dy * dy;
              if (dist < bestDist) {
                bestDist = dist;
                bestIdx = i;
              }
            }
            hit = hitTestResults[bestIdx];
          }
          const pose = hit.getPose(hitTestReferenceSpaceRef.current);
          if (pose) {
            markerRef.current.visible = true;
            const m = new THREE.Matrix4().fromArray(pose.transform.matrix);
            const p = new THREE.Vector3();
            const q = new THREE.Quaternion();
            const s = new THREE.Vector3();
            m.decompose(p, q, s);
            // Smooth position and rotation to reduce jitter
            const alpha = 0.35;
            if (!prevMarkerPosRef.current) prevMarkerPosRef.current = p.clone();
            if (!prevMarkerQuatRef.current) prevMarkerQuatRef.current = q.clone();
            markerRef.current.position.lerpVectors(prevMarkerPosRef.current, p, alpha);
            // Use instance method for TS compatibility
            markerRef.current.quaternion.slerpQuaternions(prevMarkerQuatRef.current, q, alpha);
            prevMarkerPosRef.current.copy(markerRef.current.position);
            prevMarkerQuatRef.current.copy(markerRef.current.quaternion);
            markerRef.current.updateMatrixWorld();
            pulseAnimation();

            // Auto-place after marker is visible for a short time
            if (!hasPlacedRef.current && modelRef.current) {
              // Immediate place if external detection requests it
              if (placeOnDetection) {
                modelRef.current.position.copy(markerRef.current.position);
                modelRef.current.quaternion.copy(markerRef.current.quaternion);
                modelRef.current.visible = true;
                hasPlacedRef.current = true;
                setHasPlaced(true);
              } else {
                if (autoPlaceStartRef.current == null) {
                  autoPlaceStartRef.current = time;
                } else if (time - autoPlaceStartRef.current > 1200) {
                  modelRef.current.position.copy(markerRef.current.position);
                  modelRef.current.quaternion.copy(markerRef.current.quaternion);
                  modelRef.current.visible = true;
                  hasPlacedRef.current = true;
                  setHasPlaced(true);
                }
              }
            }
          }
        } else {
          markerRef.current.visible = false;
          autoPlaceStartRef.current = null;
        }
      }
    };

    // Remove controls to avoid unnecessary overhead during AR
    const controls: OrbitControls | null = null;

    // --- FIX: Animation Loop ---
    renderer.setAnimationLoop((time, frame) => {
      if (frame) onXRFrame(time, frame);
      
      const isPresenting = renderer.xr.isPresenting;
      
      renderer.render(scene, camera);
    });

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current || !containerRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (controllerRef.current) {
        controllerRef.current.removeEventListener('select', onSelect);
      }
      if (containerRef.current && rendererRef.current) {
        // Check if parentNode exists before removing
        if (containerRef.current.contains(rendererRef.current.domElement)) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
      }
      rendererRef.current?.dispose();
    };
  }, [isCameraFlipped, isARSupported, modelUrl, placeOnDetection, anchorHintNDC]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 50,
        overflow: 'hidden'
      }}
    >
      {isARSupported && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2
        }}>
          <Button
            onClick={isARSessionActive ? stopARSession : startARSession}
            variant={isARSessionActive ? "destructive" : "default"}
            size="lg"
            className="px-8 py-6 text-lg font-semibold"
          >
            {isARSessionActive ? 'Stop AR' : 'Start AR'}
          </Button>
        </div>
      )}
      {isARSessionActive && !hasPlaced && (
        <div style={{
          position: 'absolute',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          color: 'white',
          padding: '10px 16px',
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          Move phone to find a surface. Tap to place.
        </div>
      )}
      {errorMessage && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          textAlign: 'center',
          maxWidth: '80%',
          zIndex: 2
        }}>
          {errorMessage}
        </div>
      )}
    </div>
  );
}