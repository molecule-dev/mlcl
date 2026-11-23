@import 'tailwindcss';
@plugin "@tailwindcss/typography";

/* Scan molecule packages for Tailwind class names. The scaffolder appends a */
/* scan line after the framework line below for any selected ClassMap variant */
/* bond whose utilities live only in its own dist (e.g. app-ui-tailwind-glass). */
@source "{{NM_PREFIX}}/node_modules/@molecule/app-ui-tailwind/dist";
@source "{{NM_PREFIX}}/node_modules/@molecule/app-styling-tailwind/dist";
@source "{{NM_PREFIX}}/node_modules/@molecule/app-ui-{{FRAMEWORK}}/dist";{{EXTRA_UI_SOURCE_SCANS}}

/*
 * The molecule theme: every colour token of the ClassMap (core tokens from the
 * theme bond's --mol-color-* variables, the rest derived from them), the dark
 * variant, the safelist for the ClassMap's runtime-built classes, the
 * animations it names and the base styles. The same file every flagship
 * template imports; recolor in the theme bond (see the file's header).
 */
@import '@molecule/app-ui-tailwind/base.css';
