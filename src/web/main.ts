import { WebConfiguratorApp } from "./app";
import "./styles/web.css";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("App root not found");
}

const app = new WebConfiguratorApp(root);
void app.start();
