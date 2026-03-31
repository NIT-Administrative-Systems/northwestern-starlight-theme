declare global {
    var __nuPropertySlugs:
        | {
              page: string;
              counts: Map<string, number>;
          }
        | undefined;
}

declare module "virtual:northwestern-theme/config" {
    const config: {
        homepage: {
            layout: "centered" | "split";
            showTitle: boolean;
            imageWidth: string;
        };
        ogImage: {
            enabled: boolean;
            siteTitle: string;
            logoPath: string;
        };
    };
    export default config;
}

export {};
