import type { Config } from "tailwindcss";

const rgb = (v: string) => `rgb(var(--${v}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: rgb("paper"),
        surface: rgb("surface"),
        line: rgb("line"),
        "line-strong": rgb("line-strong"),
        rule: rgb("rule"),
        "paper-edge": rgb("line"),
        ink: rgb("ink"),
        muted: rgb("muted"),
        faint: rgb("faint"),
        highlight: rgb("highlight"),
        sticky: rgb("sticky"),
        pen: { DEFAULT: rgb("pen"), deep: rgb("pen-deep"), soft: rgb("pen-soft") },
        accent: { DEFAULT: rgb("pen"), deep: rgb("pen-deep"), soft: rgb("pen-soft") },
        marker: { DEFAULT: rgb("marker"), deep: rgb("marker-deep"), soft: rgb("marker-soft") },
        success: { DEFAULT: rgb("success"), soft: rgb("success-soft") },
        go: { DEFAULT: rgb("success"), soft: rgb("success-soft") },
        warn: { DEFAULT: rgb("warning"), soft: rgb("warning-soft") },
        danger: { DEFAULT: rgb("danger"), soft: rgb("danger-soft") },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        hand: ["var(--font-hand)", "Comic Sans MS", "cursive"],
      },
      animation: {
        "fade-up": "fade-up 0.4s ease both",
        "pop-in": "pop-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 0.25s ease both",
      },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "pop-in": { from: { opacity: "0", transform: "translateY(12px) scale(0.97)" }, to: { opacity: "1", transform: "none" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
      },
    },
  },
  plugins: [],
};
export default config;
