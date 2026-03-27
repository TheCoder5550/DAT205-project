import Renderer from './renderer';
import './style.css'

const app = document.querySelector('#app');
if (!app) {
  throw new Error("Missing #app element in index.html");
}

const canvas = document.createElement("canvas");
app.appendChild(canvas);

const renderer = new Renderer({
  canvas
});
await renderer.initialize();