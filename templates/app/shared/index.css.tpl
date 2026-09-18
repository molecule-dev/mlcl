/* Global defaults for molecule.dev */
*,
*:before,
*:after,
::placeholder {
  box-sizing: border-box;
}

*:focus {
  outline: none;
}

html,
body,
#root {
  height: 100%;
  background-color: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--mol-font-sans, system-ui, sans-serif);
  margin: 0 auto;
  padding: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  touch-action: manipulation;
}

body {
  overscroll-behavior: contain;
}

a {
  color: inherit;
  text-decoration: none;
}

svg {
  fill: currentColor;
  max-width: 100%;
  max-height: 100%;
}

/* Thin scrollbars with subtle styling */
* {
  scrollbar-width: thin;
  scrollbar-color: gray transparent;
}

*::-webkit-scrollbar {
  width: 6px;
}

*::-webkit-scrollbar-track {
  background: transparent;
}

*::-webkit-scrollbar-thumb {
  background-color: gray;
  border-radius: 20px;
  border: 1.5px solid lightgray;
}

/* Hide scrollbars on small mobile */
@media (max-width: 400px) {
  html,
  body,
  #root {
    scrollbar-width: none;
    scrollbar-color: transparent;
  }
  html::-webkit-scrollbar,
  body::-webkit-scrollbar,
  #root::-webkit-scrollbar {
    width: 0;
  }
  html::-webkit-scrollbar-thumb,
  body::-webkit-scrollbar-thumb,
  #root::-webkit-scrollbar-thumb {
    background-color: transparent;
    border: 0 solid transparent;
  }
}

/* Autofill overrides for dark theme */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:active,
input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px var(--color-background-tertiary) inset !important;
  -webkit-text-fill-color: var(--color-foreground) !important;
  transition: background-color 5000s ease-in-out 0s;
}

/* Hide number input spinners */
input[type='number'] {
  -moz-appearance: textfield;
}
input[type='number']::-webkit-outer-spin-button,
input[type='number']::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
