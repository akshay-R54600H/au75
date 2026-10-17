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
        "fade-out": "fade-out 0.2s ease both",
        "page-in": "page-in 0.28s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-in-right": "slide-in-right 0.26s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-in-left": "slide-in-left 0.26s cubic-bezier(0.16, 1, 0.3, 1) both",
        // `backwards`, not `both`: once finished it must not pin transform, or the
        // inline drag offset on the sheet would be ignored.
        "sheet-up": "sheet-up 0.32s cubic-bezier(0.16, 1, 0.3, 1) backwards",
        "sheet-down": "sheet-down 0.2s ease-in both",
        "pop-out": "pop-out 0.18s ease-in both",
        shimmer: "shimmer 1.4s ease-in-out infinite",
      },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "pop-in": { from: { opacity: "0", transform: "translateY(12px) scale(0.97)" }, to: { opacity: "1", transform: "none" } },
        "pop-out": { from: { opacity: "1", transform: "none" }, to: { opacity: "0", transform: "translateY(8px) scale(0.98)" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-out": { from: { opacity: "1" }, to: { opacity: "0" } },
        "page-in": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "none" } },
        "slide-in-right": { from: { opacity: "0", transform: "translateX(28px)" }, to: { opacity: "1", transform: "none" } },
        "slide-in-left": { from: { opacity: "0", transform: "translateX(-28px)" }, to: { opacity: "1", transform: "none" } },
        "sheet-up": { from: { transform: "translateY(100%)" }, to: { transform: "none" } },
        "sheet-down": { from: { transform: "translateY(var(--sheet-drag, 0px))" }, to: { transform: "translateY(100%)" } },
        shimmer: { "0%, 100%": { opacity: "0.55" }, "50%": { opacity: "1" } },
      },
    },
  },
  // Touch screens keep :hover "stuck" after a tap — only apply hover
  // styles on devices that can actually hover.
  future: { hoverOnlyWhenSupported: true },
  plugins: [],
};
export default config;
