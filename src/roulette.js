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
        this.isSpinning = false;
        this.spinSpeed = 0;

        // Physics
        this.physicsWorld = null;
        this.rigidBodies = [];
        this.ballRigidBody = null;
        this.tmpTransform = null;
        this.Ammo = null;

        // Roulette numbers
        this.rouletteNumbers = this.generateRouletteNumbers();

        // Surface height
        this.surfaceHeight = -0.135;

        this.initAmmo();
    }

    async initAmmo() {
        // Wait for Ammo.js to be loaded from CDN
        if (typeof Ammo === 'function') {
            this.Ammo = await Ammo();
            this.initPhysics();
            this.init();
        } else {
            console.error('Ammo.js not loaded!');
            // Fallback: init without physics
            this.init();
        }
    }

    initPhysics() {
        // Physics configuration
        const collisionConfiguration = new this.Ammo.btDefaultCollisionConfiguration();
        const dispatcher = new this.Ammo.btCollisionDispatcher(collisionConfiguration);
        const broadphase = new this.Ammo.btDbvtBroadphase();
        const solver = new this.Ammo.btSequentialImpulseConstraintSolver();

        this.physicsWorld = new this.Ammo.btDiscreteDynamicsWorld(
            dispatcher, broadphase, solver, collisionConfiguration
        );
        this.physicsWorld.setGravity(new this.Ammo.btVector3(0, -9.8, 0));

        this.tmpTransform = new this.Ammo.btTransform();
    }

    init() {
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0.5, 0.8);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Scene background
        this.scene.background = new THREE.Color(0x1a1a2e);

        // Lights
        this.setupLights();

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 0.3;
        this.controls.maxDistance = 2;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.minPolarAngle = 0.1;

        // Load models
        this.loadRoulette();

        // Resize handler
        window.addEventListener('resize', () => this.onWindowResize());

        // Start animation
        this.previousTime = performance.now();
        this.animate();
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 1);
        mainLight.position.set(5, 10, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        this.scene.add(mainLight);

        const fillLight = new THREE.DirectionalLight(0x4488ff, 0.5);
        fillLight.position.set(-5, 5, -5);
        this.scene.add(fillLight);

        const backLight = new THREE.DirectionalLight(0xff8844, 0.3);
        backLight.position.set(0, 5, -10);
        this.scene.add(backLight);
    }

    generateRouletteNumbers() {
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

    createPhysicsGround() {
        if (!this.Ammo) {
            console.warn('Ammo not ready for physics ground');
            return;
        }
        // Create invisible ground plane for physics at surface height
        const groundShape = new this.Ammo.btStaticPlaneShape(
            new this.Ammo.btVector3(0, 1, 0), 0
        );

        const groundTransform = new this.Ammo.btTransform();
        groundTransform.setIdentity();
        groundTransform.setOrigin(new this.Ammo.btVector3(0, this.surfaceHeight, 0));

        const groundMotionState = new this.Ammo.btDefaultMotionState(groundTransform);
        const groundInfo = new this.Ammo.btRigidBodyConstructionInfo(
            0, groundMotionState, groundShape, new this.Ammo.btVector3(0, 0, 0)
        );
        const groundBody = new this.Ammo.btRigidBody(groundInfo);
        groundBody.setRestitution(0.5);
        groundBody.setFriction(0.8);

        this.physicsWorld.addRigidBody(groundBody);

        // Create invisible walls (cylinder shape approximation with boxes)
        this.createRouletteWalls();
    }

    createRouletteWalls() {
        const wallHeight = 0.1;
        const outerRadius = 0.24;
        const innerRadius = 0.08;
        const numSegments = 32;

        // Create outer wall segments
        for (let i = 0; i < numSegments; i++) {
            const angle = (i / numSegments) * Math.PI * 2;
            const nextAngle = ((i + 1) / numSegments) * Math.PI * 2;

            const x = Math.cos(angle) * outerRadius;
            const z = Math.sin(angle) * outerRadius;

            const wallShape = new this.Ammo.btBoxShape(
                new this.Ammo.btVector3(0.02, wallHeight / 2, 0.02)
            );

            const wallTransform = new this.Ammo.btTransform();
            wallTransform.setIdentity();
            wallTransform.setOrigin(new this.Ammo.btVector3(x, this.surfaceHeight + wallHeight / 2, z));

            const wallMotionState = new this.Ammo.btDefaultMotionState(wallTransform);
            const wallInfo = new this.Ammo.btRigidBodyConstructionInfo(
                0, wallMotionState, wallShape, new this.Ammo.btVector3(0, 0, 0)
            );
            const wallBody = new this.Ammo.btRigidBody(wallInfo);
            wallBody.setRestitution(0.7);
            wallBody.setFriction(0.3);

            this.physicsWorld.addRigidBody(wallBody);
        }

        // Create inner wall (center cone)
        const innerWallShape = new this.Ammo.btCylinderShape(
            new this.Ammo.btVector3(innerRadius, wallHeight, innerRadius)
        );

        const innerWallTransform = new this.Ammo.btTransform();
        innerWallTransform.setIdentity();
        innerWallTransform.setOrigin(new this.Ammo.btVector3(0, this.surfaceHeight + wallHeight / 2, 0));

        const innerWallMotionState = new this.Ammo.btDefaultMotionState(innerWallTransform);
        const innerWallInfo = new this.Ammo.btRigidBodyConstructionInfo(
            0, innerWallMotionState, innerWallShape, new this.Ammo.btVector3(0, 0, 0)
        );
        const innerWallBody = new this.Ammo.btRigidBody(innerWallInfo);
        innerWallBody.setRestitution(0.6);
        innerWallBody.setFriction(0.5);

        this.physicsWorld.addRigidBody(innerWallBody);
    }

    createBallPhysics() {
        if (!this.ball || !this.Ammo) {
            console.warn('Ball or Ammo not ready');
            return;
        }

        // Remove existing ball physics if any
        if (this.ballRigidBody) {
            this.physicsWorld.removeRigidBody(this.ballRigidBody.body);
        }

        const ballRadius = 0.012;
        const ballMass = 0.1;

        // Random start position on the edge
        const startAngle = Math.random() * Math.PI * 2;
        const startRadius = 0.20;
        const startX = Math.cos(startAngle) * startRadius;
        const startZ = Math.sin(startAngle) * startRadius;
        const startY = this.surfaceHeight + 0.15; // Above the surface

        const ballShape = new this.Ammo.btSphereShape(ballRadius);
        ballShape.setMargin(0.005);

        const ballTransform = new this.Ammo.btTransform();
        ballTransform.setIdentity();
        ballTransform.setOrigin(new this.Ammo.btVector3(startX, startY, startZ));

        const ballInertia = new this.Ammo.btVector3(0, 0, 0);
        ballShape.calculateLocalInertia(ballMass, ballInertia);

        const ballMotionState = new this.Ammo.btDefaultMotionState(ballTransform);
        const ballInfo = new this.Ammo.btRigidBodyConstructionInfo(
            ballMass, ballMotionState, ballShape, ballInertia
        );
        const ballBody = new this.Ammo.btRigidBody(ballInfo);

        ballBody.setRestitution(0.6);
        ballBody.setFriction(0.4);
        ballBody.setRollingFriction(0.1);

        // Give initial velocity (tangential, opposite to roulette spin)
        const tangentAngle = startAngle - Math.PI / 2;
        const initialSpeed = 1.5 + Math.random() * 0.5;
        ballBody.setLinearVelocity(new this.Ammo.btVector3(
            Math.cos(tangentAngle) * initialSpeed,
            -0.5, // Slight downward velocity
            Math.sin(tangentAngle) * initialSpeed
        ));

        this.physicsWorld.addRigidBody(ballBody);

        this.ballRigidBody = {
            body: ballBody,
            mesh: this.ball
        };

        // Update ball visual position
        this.ball.position.set(startX, startY, startZ);
        this.ball.visible = true;
    }

    loadRoulette() {
        const loader = new GLTFLoader();

        loader.load(
            '/assets/scene.gltf',
            (gltf) => {
                this.roulette = gltf.scene;

                console.log('Structure de la roulette:');
                this.roulette.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                    console.log(`- ${child.name} (type: ${child.type})`);
                });

                const box = new THREE.Box3().setFromObject(this.roulette);
                const center = box.getCenter(new THREE.Vector3());

                this.roulette.position.x = -center.x;
                this.roulette.position.y = -center.y;
                this.roulette.position.z = -center.z;

                this.scene.add(this.roulette);

                // Create physics ground after roulette is loaded
                this.createPhysicsGround();

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

        loader.load(
            '/assets/ball/scene.gltf',
            (gltf) => {
                this.ball = gltf.scene;
                this.ball.scale.set(0.002, 0.002, 0.002);
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

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updatePhysics(deltaTime) {
        if (!this.physicsWorld) return;

        this.physicsWorld.stepSimulation(deltaTime, 10);

        // Update ball mesh position from physics
        if (this.ballRigidBody && this.ball) {
            const motionState = this.ballRigidBody.body.getMotionState();
            if (motionState) {
                motionState.getWorldTransform(this.tmpTransform);
                const pos = this.tmpTransform.getOrigin();
                const quat = this.tmpTransform.getRotation();

                this.ball.position.set(pos.x(), pos.y(), pos.z());
                this.ball.quaternion.set(quat.x(), quat.y(), quat.z(), quat.w());
            }

            // Check if ball has stopped
            const velocity = this.ballRigidBody.body.getLinearVelocity();
            const speed = Math.sqrt(
                velocity.x() * velocity.x() +
                velocity.y() * velocity.y() +
                velocity.z() * velocity.z()
            );

            if (this.isSpinning && speed < 0.05 && this.spinSpeed < 0.005) {
                this.isSpinning = false;
                this.showResult();
            }
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.previousTime) / 1000;
        this.previousTime = currentTime;

        if (this.isSpinning && this.roulette) {
            this.roulette.rotation.y += this.spinSpeed;
            this.spinSpeed *= 0.998;

            if (this.spinSpeed < 0.001) {
                this.spinSpeed = 0;
            }
        }

        // Update physics
        this.updatePhysics(deltaTime);

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    showResult() {
        // Calculate result based on ball position
        const ballX = this.ball.position.x;
        const ballZ = this.ball.position.z;
        const ballAngle = Math.atan2(ballZ, ballX);

        const relativeAngle = ballAngle - this.roulette.rotation.y;
        const normalizedAngle = ((relativeAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

        const numSlots = 37;
        const slotAngle = (Math.PI * 2) / numSlots;
        const slotIndex = Math.floor(normalizedAngle / slotAngle);

        const result = this.rouletteNumbers[slotIndex % this.rouletteNumbers.length];

        console.log(`Résultat: ${result.num} ${result.color}`);

        const resultDiv = document.getElementById('result');
        if (resultDiv) {
            resultDiv.textContent = `${result.num} ${result.color}`;
            resultDiv.style.display = 'block';

            if (result.color === 'ROUGE') {
                resultDiv.style.color = '#ff4444';
            } else if (result.color === 'NOIR') {
                resultDiv.style.color = '#ffffff';
            } else {
                resultDiv.style.color = '#44ff44';
            }
        }

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

        const spinButton = document.getElementById('spinButton');
        if (spinButton) {
            spinButton.disabled = true;
            spinButton.style.opacity = '0.5';
        }

        const resultDiv = document.getElementById('result');
        if (resultDiv) {
            resultDiv.style.display = 'none';
        }

        this.isSpinning = true;
        this.spinSpeed = 0.08 + Math.random() * 0.04;

        // Create ball with physics
        this.createBallPhysics();
    }
}
