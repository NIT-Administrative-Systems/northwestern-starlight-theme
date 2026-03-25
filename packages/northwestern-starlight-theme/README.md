<h1 align="center">
    <img src="/art/logo.svg" width="80" alt="Northwestern Starlight Theme"><br/>
    Northwestern Starlight Theme
</h1>

<p align="center">
    <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node-22+-339933?style=flat&logo=node.js&logoColor=white" alt="Node Version"></a>
    <a href="https://astro.build"><img src="https://img.shields.io/badge/Astro-5.x+-BC52EE?style=flat&logo=astro&logoColor=white" alt="Astro Version"></a>
    <a href="https://starlight.astro.build"><img src="https://img.shields.io/badge/Starlight-0.32+-FF5D01?style=flat&logo=astro&logoColor=white" alt="Starlight Version"></a>
</p>

<p align="center">
    A branded <a href="https://starlight.astro.build">Starlight</a> theme plugin for <a href="https://www.northwestern.edu">Northwestern University</a> documentation sites.
</p>

## Quick Start

```bash
pnpm add @nu-appdev/northwestern-starlight-theme
```

```ts
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import northwesternTheme from "@nu-appdev/northwestern-starlight-theme";

export default defineConfig({
    integrations: [
        starlight({
            plugins: [northwesternTheme()],
            title: "My Docs",
        }),
    ],
});
```

The plugin applies Northwestern's purple palette, Akkurat Pro + Poppins typography, branded navigation, styled components, and full dark mode support. No additional CSS or configuration required.

See the **[documentation](https://starlight-theme.entapp.northwestern.edu)** for setup options, customization, and component examples.

## Development

```bash
pnpm install
pnpm docs:dev      # Start docs dev server
pnpm verify        # Lint, fix, and build
pnpm verify:full   # Above + accessibility tests
```

## License

The MIT License (MIT). Please see [LICENSE](LICENSE) for more information.
