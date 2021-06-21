import { defineConfig } from "vite";
import reactRefresh from "@vitejs/plugin-react-refresh";
// import analyze from 'rollup-plugin-analyzer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [reactRefresh()],
  publicDir: "./public",
  base: "/",
  resolve: {
    alias: {
      "mapbox-gl": "maplibre-gl",
    },
  },
  build: {
    cssCodeSplit: false,
    //   rollupOptions: {
    //     plugins: [
    //       analyze()
    //     ]
    //   }
  },
});
