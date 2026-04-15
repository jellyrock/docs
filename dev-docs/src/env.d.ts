/* eslint-disable @typescript-eslint/triple-slash-reference -- Starlight declares
   its Search virtual module inside an internal .d.ts file that isn't reachable
   via the package's public "exports" map, so `import` style resolution can't
   reach it. Reference it directly so `astro check` can resolve the import in
   our Header override (src/components/Header.astro). */
/// <reference types="astro/client" />
/// <reference path="../../node_modules/@astrojs/starlight/virtual-internal.d.ts" />
