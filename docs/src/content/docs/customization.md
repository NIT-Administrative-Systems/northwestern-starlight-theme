---
title: Customization
description: How to customize the Northwestern Starlight Theme.
---

## Homepage Hero

The theme provides a branded Hero component for splash pages. Configure it through standard Starlight frontmatter in your `index.mdx`:

```yaml
---
title: My Docs Site
template: splash
hero:
    tagline: A description of your project
    image:
        file: ../../assets/logo.png
    actions:
        - text: Get Started
          link: /getting-started/
          icon: right-arrow
          variant: primary
        - text: GitHub
          link: https://github.com/your-org/your-repo
          icon: github
          variant: minimal
---
```

Any content below the frontmatter in `index.mdx` renders normally after the hero.

### Layout Options

The hero supports two layouts, configured through the plugin:

```ts
// Centered (default) — image above title, everything centered
northwesternTheme({
    homepage: { layout: "centered" },
})

// Split — text and buttons on the left, image on the right (60/40)
northwesternTheme({
    homepage: { layout: "split" },
})
```

When no image is provided in frontmatter, the hero renders the title, tagline, and buttons in a centered layout regardless of the `layout` setting.

### Hiding the Title

If your hero image is a lockup that already contains the project name, hide the title to avoid redundancy:

```ts
northwesternTheme({
    homepage: {
        layout: "centered",
        showTitle: false,
    },
})
```

### Dark/Light Image Variants

Use separate images for each theme:

```yaml
hero:
    image:
        dark: ../../assets/logo-dark.png
        light: ../../assets/logo-light.png
        alt: Project logo
```

### Custom Hero Override

If you need a completely custom hero, override it in your Starlight config. The theme will not replace it:

```ts
starlight({
    components: {
        Hero: "./src/components/MyHero.astro",
    },
    plugins: [northwesternTheme()],
});
```

## Component Overrides

The theme overrides three Starlight components by default:

| Component | Theme Version | Purpose |
|-----------|---------------|---------|
| `Hero` | Centered layout with wide image support | Branded splash page |
| `EditLink` | ConditionalEditLink | Hides edit link on homepage |
| `ThemeSelect` | ThemeToggle | Animated sun/moon toggle |

All three respect existing overrides. If you set `Hero`, `EditLink`, or `ThemeSelect` in your Starlight `components` config, the theme keeps your version.

## Mermaid Diagrams

Mermaid support is opt-in. Install `astro-mermaid` and `mermaid`, then add the integration:

```diff lang="ts"
+import { northwesternMermaid } from "@nu-appdev/northwestern-starlight-theme/mermaid";

export default defineConfig({
    integrations: [
+        northwesternMermaid(),
        starlight({
            plugins: [northwesternTheme()],
        }),
    ],
});
```

Pass options to override defaults:

```ts
northwesternMermaid({
    mermaidConfig: {
        themeVariables: {
            fontSize: "16px",
        },
    },
});
```

## Expressive Code

The theme configures GitHub syntax highlighting themes (`github-dark` / `github-light`) by default.

For opt-in line numbers, create `ec.config.mjs` at your docs project root:

```js
import { defineEcConfig } from "@astrojs/starlight/expressive-code";
import { northwesternExpressiveCode } from "@nu-appdev/northwestern-starlight-theme/expressive-code";

export default defineEcConfig(northwesternExpressiveCode());
```

Then use `showLineNumbers` on individual code blocks:

````md
```ts showLineNumbers title="example.ts"
const x = 1;
```
````

## Custom CSS

The theme loads its CSS before your project's `customCss`, so you can override any token or style in your own CSS files.

```ts
starlight({
    plugins: [northwesternTheme()],
    customCss: ["./src/styles/overrides.css"],
});
```

## Available CSS Variables

The theme defines Northwestern design tokens as CSS custom properties. You can reference or override these in your own styles:

### Purple Scale

| Variable          | Value     | Usage                 |
| ----------------- | --------- | --------------------- |
| `--nu-purple-100` | `#4e2a84` | Brand primary         |
| `--nu-purple-120` | `#401f68` | Navigation background |
| `--nu-purple-40`  | `#a495c3` | Dark mode accent      |

See `src/styles/variables.css` in the theme package for the full token list.

### Typography

| Variable            | Value                                  |
| ------------------- | -------------------------------------- |
| `--nu-font-body`    | Akkurat Pro, system fallbacks          |
| `--nu-font-heading` | Poppins, Akkurat Pro, system fallbacks |

### Semantic Colors

| Variable             | Value     | Usage          |
| -------------------- | --------- | -------------- |
| `--nu-color-success` | `#008656` | Success states |
| `--nu-color-info`    | `#5091cd` | Info states    |
| `--nu-color-warning` | `#ffc520` | Warning states |
| `--nu-color-danger`  | `#ef553f` | Danger states  |
