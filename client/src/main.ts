import "./style.css";
import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";
import { setJoinInfo } from "./net/joinInfo";

// タイル/スプライトを32px(16pxの倍)に上げたのに合わせて、内部解像度も倍にして
// 画面に映るタイル数(ズーム感)を変えないようにしている。
const INTERNAL_WIDTH = 768;
const INTERNAL_HEIGHT = 432;

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

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;

    setJoinInfo({ name });
    joinScreen.remove();
    startGame();
  });
}

setupJoinForm();
