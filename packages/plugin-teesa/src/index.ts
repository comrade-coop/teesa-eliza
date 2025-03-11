import type { Plugin } from "@elizaos/core";
import { gameProvider } from "./providers";

export * as providers from "./providers";

export const teesaPlugin: Plugin = {
    name: "teesa",
    description: "Plugin for Teesa",
    actions: [ ],
    evaluators: [ ],
    providers: [
        gameProvider,
    ],
};
export default teesaPlugin;
