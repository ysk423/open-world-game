import "./style.css";
import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";
import { setJoinInfo } from "./net/joinInfo";

const INTERNAL_WIDTH = 384;
const INTERNAL_HEIGHT = 216;

function startGame(): void {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: "app",
    backgroundColor: "#1a1a1a",
    pixelArt: true,
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: INTERNAL_WIDTH,
      height: INTERNAL_HEIGHT,
    },
    scene: [GameScene],
  };

  new Phaser.Game(config);
}

function setupJoinForm(): void {
  const joinScreen = document.querySelector<HTMLDivElement>("#join-screen")!;
  const form = document.querySelector<HTMLFormElement>("#join-form")!;
  const nameInput = document.querySelector<HTMLInputElement>("#name-input")!;
  const roomInput = document.querySelector<HTMLInputElement>("#room-input")!;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    const roomId = roomInput.value.trim();
    if (!name || !roomId) return;

    setJoinInfo({ name, roomId });
    joinScreen.remove();
    startGame();
  });
}

setupJoinForm();
