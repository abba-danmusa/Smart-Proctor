// Chakra UI v3+ Theme System (No extendTheme)
import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: "#f5f3ff" },
          100: { value: "#ede9fe" },
          200: { value: "#ddd6fe" },
          300: { value: "#c4b5fd" },
          400: { value: "#a78bfa" },
          500: { value: "#8b5cf6" },
          600: { value: "#7c3aed" },
          700: { value: "#6d28d9" },
          800: { value: "#5b21b6" },
          900: { value: "#4c1d95" },
        },
      },
    },

    semanticTokens: {
      colors: {
        bg: {
          DEFAULT: { value: "white" },
        },
        text: {
          DEFAULT: { value: "gray.800" },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);