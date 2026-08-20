import { defineNorthwesternConfig } from "@nu-appdev/northwestern-starlight-theme/config";
import starlightImageZoom from "starlight-image-zoom";
import starlightLinksValidator from "starlight-links-validator";

export default defineNorthwesternConfig({
    site: "https://example.northwestern.edu",
    starlight: {
        title: "Links Validation Fixture",
    },
    plugins: [starlightLinksValidator(), starlightImageZoom()],
});
