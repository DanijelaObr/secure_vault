import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

// HTTPS lokalno — koristi mkcert sertifikat iz ../certs
// Imena fajlova prilagodi onome što ti je mkcert generisao.
const certDir = path.resolve(__dirname, "../certs");

export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync(path.join(certDir, "localhost+1-key.pem")),
      cert: fs.readFileSync(path.join(certDir, "localhost+1.pem")),
    },
    port: 5173,
  },
});
