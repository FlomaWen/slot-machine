import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class RouletteScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.roulette = null;
    this.ball = null;
    this.rouletteSurface = null;
    this.isSpinning = false;
    this.spinSpeed = 0;
    this.ballPosition = new THREE.Vector3(0, 2, 0);
    this.ballVelocity = new THREE.Vector3(0, 0, 0);
    this.gravity = -0.0003;
    this.friction = 0.98;
    this.rouletteNumbers = this.generateRouletteNumbers();

    this.init();
  }

  init() {
    // Configuration de la caméra
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 3, 6);

    // Configuration du renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Configuration de la scène
    this.scene.background = new THREE.Color(0x1a1a2e);

    // Lumières
    this.setupLights();

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 0;
    this.controls.maxDistance = 0.8;

    // Limiter la rotation verticale (empêcher de voir en dessous)
    this.controls.maxPolarAngle = Math.PI / 2; // 90 degrés maximum (vue de côté)
    this.controls.minPolarAngle = 0; // 0 degré minimum (vue du dessus)

    // Charger le modèle 3D
    this.loadRoulette();

    // Gestion du redimensionnement
    window.addEventListener('resize', () => this.onWindowResize());

    // Démarrer l'animation
    this.animate();
  }

  setupLights() {
    // Lumière ambiante
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Lumière directionnelle principale
    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    this.scene.add(mainLight);

    // Lumière d'appoint
    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.5);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);

    // Lumière de fond
    const backLight = new THREE.DirectionalLight(0xff8844, 0.3);
    backLight.position.set(0, 5, -10);
    this.scene.add(backLight);
  }

  generateRouletteNumbers() {
    // Numéros de la roulette européenne avec leurs couleurs
    return [
      { num: 0, color: 'VERT' },
      { num: 32, color: 'ROUGE' }, { num: 15, color: 'NOIR' }, { num: 19, color: 'ROUGE' },
      { num: 4, color: 'NOIR' }, { num: 21, color: 'ROUGE' }, { num: 2, color: 'NOIR' },
      { num: 25, color: 'ROUGE' }, { num: 17, color: 'NOIR' }, { num: 34, color: 'ROUGE' },
      { num: 6, color: 'NOIR' }, { num: 27, color: 'ROUGE' }, { num: 13, color: 'NOIR' },
      { num: 36, color: 'ROUGE' }, { num: 11, color: 'NOIR' }, { num: 30, color: 'ROUGE' },
      { num: 8, color: 'NOIR' }, { num: 23, color: 'ROUGE' }, { num: 10, color: 'NOIR' },
      { num: 5, color: 'ROUGE' }, { num: 24, color: 'NOIR' }, { num: 16, color: 'ROUGE' },
      { num: 33, color: 'NOIR' }, { num: 1, color: 'ROUGE' }, { num: 20, color: 'NOIR' },
      { num: 14, color: 'ROUGE' }, { num: 31, color: 'NOIR' }, { num: 9, color: 'ROUGE' },
      { num: 22, color: 'NOIR' }, { num: 18, color: 'ROUGE' }, { num: 29, color: 'NOIR' },
      { num: 7, color: 'ROUGE' }, { num: 28, color: 'NOIR' }, { num: 12, color: 'ROUGE' },
      { num: 35, color: 'NOIR' }, { num: 3, color: 'ROUGE' }, { num: 26, color: 'NOIR' }
    ];
  }

  loadRoulette() {
    const loader = new GLTFLoader();

    // Charger la roulette
    loader.load(
      '/assets/scene.gltf',
      (gltf) => {
        this.roulette = gltf.scene;

        // Afficher la structure du modèle
        console.log('Structure de la roulette:');
        this.roulette.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
          console.log(`- ${child.name} (type: ${child.type})`);
        });

        // Centrer et ajuster l'échelle si nécessaire
        const box = new THREE.Box3().setFromObject(this.roulette);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        console.log(`Taille de la roulette: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);

        // Centrer le modèle
        this.roulette.position.x = -center.x;
        this.roulette.position.y = -center.y;
        this.roulette.position.z = -center.z;

        this.scene.add(this.roulette);

        // Créer une surface invisible pour la physique de la boule
        this.createRouletteSurface();

        console.log('Roulette chargée avec succès!');
      },
      (progress) => {
        const percent = (progress.loaded / progress.total) * 100;
        console.log(`Chargement roulette: ${percent.toFixed(2)}%`);
      },
      (error) => {
        console.error('Erreur lors du chargement de la roulette:', error);
      }
    );

    // Charger la boule
    loader.load(
      '/assets/ball/scene.gltf',
      (gltf) => {
        this.ball = gltf.scene;

        // Ajuster la taille de la boule
        this.ball.scale.set(0.002, 0.002, 0.002);

        // Position initiale (au-dessus et invisible)
        this.ball.position.set(0, 5, 0);
        this.ball.visible = false;

        this.ball.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        this.scene.add(this.ball);
        console.log('Boule chargée avec succès!');
      },
      (progress) => {
        const percent = (progress.loaded / progress.total) * 100;
        console.log(`Chargement boule: ${percent.toFixed(2)}%`);
      },
      (error) => {
        console.error('Erreur lors du chargement de la boule:', error);
      }
    );
  }

  createRouletteSurface() {
    // Créer un disque invisible qui servira de surface pour la boule
    const geometry = new THREE.CylinderGeometry(0.25, 0.25, 0.01, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0,
      wireframe: false
    });
    this.rouletteSurface = new THREE.Mesh(geometry, material);
    this.rouletteSurface.position.set(0, 0.03, 0); // Ajuster selon la hauteur de votre roulette
    this.rouletteSurface.rotation.x = 0;

    this.scene.add(this.rouletteSurface);
    console.log('Surface de collision créée');
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Animation de la roulette
    if (this.isSpinning && this.roulette) {
      this.roulette.rotation.y += this.spinSpeed;

      // Ralentir progressivement
      this.spinSpeed *= 0.995;

      // Animation de la boule
      if (this.ball && this.ball.visible && this.rouletteSurface) {
        // Appliquer la gravité
        this.ballVelocity.y += this.gravity;

        // Hauteur de la surface de la roulette
        const surfaceHeight = this.rouletteSurface.position.y + 0.015;

        // Vérifier si la boule est sur la surface
        const isOnSurface = this.ball.position.y <= surfaceHeight;

        if (isOnSurface) {
          this.ball.position.y = surfaceHeight;

          // Rebond avec perte d'énergie
          if (this.ballVelocity.y < -0.001) {
            this.ballVelocity.y = -this.ballVelocity.y * 0.5; // Rebond à 50%
          } else {
            this.ballVelocity.y = 0;
          }

          // Distance du centre
          const distanceFromCenter = Math.sqrt(
            this.ball.position.x * this.ball.position.x +
            this.ball.position.z * this.ball.position.z
          );

          // Force centrifuge de la roulette qui tourne (très réduite)
          const angle = Math.atan2(this.ball.position.z, this.ball.position.x);
          const centrifugalStrength = this.spinSpeed * distanceFromCenter * 0.3;

          this.ballVelocity.x += Math.cos(angle) * centrifugalStrength;
          this.ballVelocity.z += Math.sin(angle) * centrifugalStrength;

          // Force de Coriolis (la roulette tourne donc la boule est déviée) - très réduite
          const coriolisX = -this.ballVelocity.z * this.spinSpeed * 0.5;
          const coriolisZ = this.ballVelocity.x * this.spinSpeed * 0.5;
          this.ballVelocity.x += coriolisX;
          this.ballVelocity.z += coriolisZ;

          // Limiter la boule au rayon de la roulette avec collision
          const maxRadius = 0.24;
          if (distanceFromCenter > maxRadius) {
            // Replacer à la limite
            const normalizedAngle = Math.atan2(this.ball.position.z, this.ball.position.x);
            this.ball.position.x = Math.cos(normalizedAngle) * maxRadius;
            this.ball.position.z = Math.sin(normalizedAngle) * maxRadius;

            // Réflexion de la vélocité (rebond élastique)
            const normalX = -Math.cos(normalizedAngle);
            const normalZ = -Math.sin(normalizedAngle);

            const dotProduct = this.ballVelocity.x * normalX + this.ballVelocity.z * normalZ;
            this.ballVelocity.x -= 2 * dotProduct * normalX * 0.7; // 70% de rebond
            this.ballVelocity.z -= 2 * dotProduct * normalZ * 0.7;
          }

          // Friction forte sur la surface
          this.ballVelocity.x *= 0.99;
          this.ballVelocity.z *= 0.99;

          // Arrêter complètement si trop lent
          const speed = Math.sqrt(
            this.ballVelocity.x * this.ballVelocity.x +
            this.ballVelocity.z * this.ballVelocity.z
          );
          if (speed < 0.0001) {
            this.ballVelocity.x = 0;
            this.ballVelocity.z = 0;
          }
        }

        // Mettre à jour la position
        this.ball.position.add(this.ballVelocity);

        // Rotation réaliste de la boule basée sur son mouvement
        const ballSpeed = Math.sqrt(
          this.ballVelocity.x * this.ballVelocity.x +
          this.ballVelocity.z * this.ballVelocity.z
        );
        if (ballSpeed > 0.0001) {
          const ballRadius = 0.015; // Rayon approximatif de la boule
          const rotationSpeed = ballSpeed / ballRadius;

          // Calculer l'axe perpendiculaire au mouvement
          const moveAngle = Math.atan2(this.ballVelocity.z, this.ballVelocity.x);
          this.ball.rotation.z += Math.cos(moveAngle) * rotationSpeed;
          this.ball.rotation.x += Math.sin(moveAngle) * rotationSpeed;
        }
      }

      // Faire tourner la surface avec la roulette
      if (this.rouletteSurface) {
        this.rouletteSurface.rotation.y = this.roulette.rotation.y;
      }

      // Arrêter quand la vitesse est très faible
      if (this.spinSpeed < 0.0005) {
        this.spinSpeed = 0;
        this.isSpinning = false;
        this.showResult();
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  showResult() {
    // Choisir un résultat aléatoire
    const result = this.rouletteNumbers[Math.floor(Math.random() * this.rouletteNumbers.length)];

    console.log(`Résultat: ${result.num} ${result.color}`);

    // Afficher le résultat à l'utilisateur
    const resultDiv = document.getElementById('result');
    if (resultDiv) {
      resultDiv.textContent = `Résultat: ${result.num} ${result.color}`;
      resultDiv.style.display = 'block';
    }

    // Réactiver le bouton spin
    const spinButton = document.getElementById('spinButton');
    if (spinButton) {
      spinButton.disabled = false;
      spinButton.style.opacity = '1';
    }
  }

  spin() {
    if (this.isSpinning) {
      console.log('La roulette tourne déjà!');
      return;
    }

    if (!this.roulette || !this.ball) {
      console.warn('La roulette ou la boule n\'est pas encore chargée!');
      return;
    }

    console.log('SPIN! - Lancement de la roulette...');

    // Désactiver le bouton spin
    const spinButton = document.getElementById('spinButton');
    if (spinButton) {
      spinButton.disabled = true;
      spinButton.style.opacity = '0.5';
    }

    // Cacher le résultat précédent
    const resultDiv = document.getElementById('result');
    if (resultDiv) {
      resultDiv.style.display = 'none';
    }

    // Lancer la roulette
    this.isSpinning = true;
    this.spinSpeed = 0.2 + Math.random() * 0.1;

    // Réinitialiser et afficher la boule (lancée depuis le bord supérieur)
    const startAngle = Math.random() * Math.PI * 2;
    const startRadius = 0.18;
    this.ball.position.set(
      Math.cos(startAngle) * startRadius,
      0.2,
      Math.sin(startAngle) * startRadius
    );
    this.ball.visible = true;

    // Donner une vélocité tangentielle inversée par rapport à la rotation
    // (comme une vraie roulette où la boule va dans le sens inverse)
    const tangentAngle = startAngle - Math.PI / 2; // Sens inverse de la rotation
    const initialSpeed = 0.008 + Math.random() * 0.004;
    this.ballVelocity.set(
      Math.cos(tangentAngle) * initialSpeed,
      -0.002, // Petite vélocité vers le bas
      Math.sin(tangentAngle) * initialSpeed
    );
  }
}
