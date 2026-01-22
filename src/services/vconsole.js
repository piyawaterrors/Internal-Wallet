import VConsole from "vconsole";

let vConsole = null;

export const initVConsole = () => {
  if (!vConsole && import.meta.env.DEV) {
    vConsole = new VConsole();
    console.log("✅ VConsole initialized");
  }
  return vConsole;
};

export const destroyVConsole = () => {
  if (vConsole) {
    vConsole.destroy();
    vConsole = null;
    console.log("❌ VConsole destroyed");
  }
};

export default vConsole;
