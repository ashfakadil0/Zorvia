import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

export default defineConfig({
  // Zorvia is hosted at https://ashfakadil0.github.io/Zorvia/
  base: "/Zorvia/",
  tanstackStart: {
    server: { entry: "server" },
    prerender: {
      enabled: true,
      autoSubfolderIndex: true,
      autoStaticPathsDiscovery: true,
      crawlLinks: true,
      failOnError: true,
    },
  },
  vite: {
    plugins: [nitro({ preset: "node-server" })],
  },
});
