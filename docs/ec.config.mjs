import { defineEcConfig } from "@astrojs/starlight/expressive-code";
import { northwesternExpressiveCode } from "@nu-appdev/northwestern-starlight-theme/expressive-code";

export default defineEcConfig(
    northwesternExpressiveCode({
        themes: ["github-dark", "github-light"],
        useStarlightUiThemeColors: true,
    }),
);
