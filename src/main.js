import './style.css'
import { RouletteScene } from './roulette.js'

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', () => {
  // Récupérer le canvas
  const canvas = document.getElementById('canvas3d');

  // Initialiser la scène 3D
  const scene = new RouletteScene(canvas);

  // Gérer le bouton SPIN
  const spinButton = document.getElementById('spinButton');
  spinButton.addEventListener('click', () => {
    scene.spin();
  });
});
