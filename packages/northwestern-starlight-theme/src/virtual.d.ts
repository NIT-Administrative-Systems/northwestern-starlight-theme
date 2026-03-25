declare module "virtual:northwestern-theme/config" {
    const config: {
        homepage: {
            layout: "centered" | "split";
            showTitle: boolean;
            imageWidth: string;
        };
    };
    export default config;
}
