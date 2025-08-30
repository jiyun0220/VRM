import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRMHumanBoneName } from '@pixiv/three-vrm';

export class VrmManager {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this.currentVrm = null;
    this.frameId = null;
    this.blinkState = {
      time: 0,
      nextBlink: 0,
      isBlinking: false,
      startOfBlink: 0,
      blinkDuration: 0.15,
    };

    // 립싱크 상태 관리
    this.audioContext = null;
    this.audioAnalyser = null;
    this.audioDataArray = null;
  }

  initialize(canvas) {
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({ 
      canvas, 
      alpha: true,
      antialias: true 
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.camera = new THREE.PerspectiveCamera(
      30.0,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      20.0
    );
    this.camera.position.set(0.0, 1.0, 5.0);
    this.camera.lookAt(0.0, 1.0, 0.0);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
    directionalLight.position.set(1, 1, 1).normalize();
    this.scene.add(directionalLight);
    this.animate();
  }

  animate = () => {
    this.frameId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    if (this.currentVrm) {
      this.currentVrm.update(delta);
      this.setRestingPose(this.currentVrm);
      this.handleBlinking(delta);
      this.handleLipSync(); // 립싱크 처리
    }
    this.renderer.render(this.scene, this.camera);
  }

  loadVrm(url) {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(
      url,
      (gltf) => {
        const vrm = gltf.userData.vrm;
        if (this.currentVrm) {
          this.scene.remove(this.currentVrm.scene);
        }
        this.scene.add(vrm.scene);
        this.currentVrm = vrm;
        console.log('VRM 모델 로드 성공');
        this.resetBlinkTimer();
        this.updateCameraPosition(vrm);
      },
      (progress) => console.log('모델 로딩 중...', 100.0 * (progress.loaded / progress.total), '%'),
      (error) => console.error('모델 로드 실패:', error)
    );
  }

  setRestingPose(vrm) {
    if (!vrm) return;

    const leftUpperArm = vrm.humanoid.getRawBoneNode(VRMHumanBoneName.LeftUpperArm);
    if (leftUpperArm) {
      leftUpperArm.rotation.z = THREE.MathUtils.degToRad(-80);
    }

    const rightUpperArm = vrm.humanoid.getRawBoneNode(VRMHumanBoneName.RightUpperArm);
    if (rightUpperArm) {
      rightUpperArm.rotation.z = THREE.MathUtils.degToRad(80);
    }
  }

  updateCameraPosition(vrm) {
    if (!vrm) return;
    const headBone = vrm.humanoid.getRawBoneNode(VRMHumanBoneName.Head) ?? vrm.humanoid.getRawBoneNode(VRMHumanBoneName.Neck);
    if (!headBone) {
      console.warn('모델에서 머리 또는 목 뼈를 찾을 수 없습니다.');
      return;
    }
    const headWorldPosition = new THREE.Vector3();
    headBone.getWorldPosition(headWorldPosition);
    const lookAtTarget = headWorldPosition;
    const cameraOffset = new THREE.Vector3(0, 0.05, 0.9);
    const cameraPosition = new THREE.Vector3().copy(headWorldPosition).add(cameraOffset);
    this.camera.position.copy(cameraPosition);
    this.camera.lookAt(lookAtTarget);
  }

  resetBlinkTimer() {
    this.blinkState.nextBlink = this.blinkState.time + 2.0 + Math.random() * 8.0;
  }

  handleBlinking(delta) {
    if (!this.currentVrm) return;
    this.blinkState.time += delta;
    const expressionManager = this.currentVrm.expressionManager;
    if (this.blinkState.isBlinking) {
      if (this.blinkState.time - this.blinkState.startOfBlink > this.blinkState.blinkDuration) {
        expressionManager.setValue('blink', 0.0);
        this.blinkState.isBlinking = false;
        this.resetBlinkTimer();
      }
    } else {
      if (this.blinkState.time > this.blinkState.nextBlink) {
        this.blinkState.isBlinking = true;
        this.blinkState.startOfBlink = this.blinkState.time;
        expressionManager.setValue('blink', 1.0);
      }
    }
  }

  setupLipSync(audio) {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    const source = this.audioContext.createMediaElementSource(audio);
    this.audioAnalyser = this.audioContext.createAnalyser();
    this.audioAnalyser.fftSize = 256;

    source.connect(this.audioAnalyser);
    this.audioAnalyser.connect(this.audioContext.destination);

    const bufferLength = this.audioAnalyser.frequencyBinCount;
    this.audioDataArray = new Uint8Array(bufferLength);

    console.log('립싱크가 설정되었습니다.');
  }

  handleLipSync() {
    if (!this.currentVrm || !this.audioAnalyser || !this.audioDataArray) {
      return;
    }

    this.audioAnalyser.getByteFrequencyData(this.audioDataArray);

    let sum = 0;
    for (let i = 0; i < this.audioDataArray.length; i++) {
      sum += this.audioDataArray[i];
    }
    const average = sum / this.audioDataArray.length;

    const volume = Math.min(1.0, (average / 128) * 1.5); 
    
    if (this.currentVrm.expressionManager) {
      this.currentVrm.expressionManager.setValue('a', volume);
    }
  }

  dispose() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    console.log('VrmManager 리소스 정리');
  }
}