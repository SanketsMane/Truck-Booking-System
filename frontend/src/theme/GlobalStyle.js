import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
  }

  html, body, #root {
    height: 100%;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    margin: 0;
    background: ${({ theme }) => theme.color.bg};
    color: ${({ theme }) => theme.color.text};
    font-family: ${({ theme }) => theme.font.family};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    line-height: 1.5;
    /* Native-app feel on mobile: no pull-to-refresh tint, no long-press callouts. */
    overscroll-behavior-y: none;
    -webkit-tap-highlight-color: transparent;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  button, input, select, textarea {
    font-family: inherit;
    font-size: inherit;
    color: inherit;
  }

  // Every button in this codebase is a styled-component that defines its
  // own background/border/padding — without this reset, the browser's
  // native button chrome (a gray gradient fill + inset border + default
  // padding) shows through underneath on any button whose styles don't
  // happen to override all three, which is exactly what was happening to
  // icon-only buttons like the password-visibility toggle.
  button {
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    appearance: none;
    -webkit-appearance: none;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  img, svg {
    display: block;
    max-width: 100%;
  }

  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.accent};
    outline-offset: 2px;
  }

  ::selection {
    background: ${({ theme }) => theme.color.accentSoft};
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

export default GlobalStyle;
