import { DirectClient } from "@elizaos/client-direct";
import {
    type Adapter,
    AgentRuntime,
    CacheManager,
    type Character,
    type ClientInstance,
    DbCacheAdapter,
    elizaLogger,
    type IAgentRuntime,
    type IDatabaseAdapter,
    type IDatabaseCacheAdapter,
    ModelProviderName,
    parseBooleanFromText,
    settings,
    stringToUuid
} from "@elizaos/core";
import { bootstrapPlugin } from "@elizaos/plugin-bootstrap";
import net from "net";
import { teesaCharacter } from "./character/teesa.js";

export const wait = (minTime = 1000, maxTime = 3000) => {
    const waitTime = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
    return new Promise((resolve) => setTimeout(resolve, waitTime));
};

const logFetch = async (url: string, options: any) => {
    elizaLogger.debug(`Fetching ${url}`);
    return fetch(url, options);
};

export function getTokenForProvider(
    provider: ModelProviderName,
    character: Character
): string | undefined {
    switch (provider) {
        case ModelProviderName.OPENROUTER:
            return character.settings?.secrets?.OPENROUTER_API_KEY || settings.OPENROUTER_API_KEY;
        default:
            const errorMessage = `Failed to get token - unsupported model provider: ${provider}`;
            elizaLogger.error(errorMessage);
            throw new Error(errorMessage);
    }
}

export async function initializeClients(
    character: Character,
    runtime: IAgentRuntime
) {
    const clients: ClientInstance[] = [];

    if (character.plugins?.length > 0) {
        for (const plugin of character.plugins) {
            if (plugin.clients) {
                for (const client of plugin.clients) {
                    const startedClient = await client.start(runtime);
                    elizaLogger.debug(`Initializing client: ${client.name}`);
                    clients.push(startedClient);
                }
            }
        }
    }

    return clients;
}

export async function createAgent(
    character: Character,
    token: string
): Promise<AgentRuntime> {
    elizaLogger.log(`Creating runtime for character ${character.name}`);
    return new AgentRuntime({
        token,
        modelProvider: character.modelProvider,
        evaluators: [],
        character,
        plugins: [bootstrapPlugin].flat().filter(Boolean),
        providers: [],
        managers: [],
        fetch: logFetch,
    });
}

function initializeDbCache(character: Character, db: IDatabaseCacheAdapter) {
    if (!character?.id) {
        throw new Error("initializeDbCache requires id to be set in character definition");
    }
    return new CacheManager(new DbCacheAdapter(db, character.id));
}

async function findDatabaseAdapter(runtime: AgentRuntime) {
    const { adapters } = runtime;
    let adapter: Adapter | undefined = adapters[0];

    if (!adapter) {
        const sqliteAdapterPlugin = await import('@elizaos-plugins/adapter-sqlite');
        const sqliteAdapterPluginDefault = sqliteAdapterPlugin.default;
        adapter = sqliteAdapterPluginDefault?.adapters?.[0];
        if (!adapter) {
            throw new Error("Internal error: No database adapter found for default adapter-sqlite");
        }
    }

    const adapterInterface = (adapter as Adapter).init(runtime);
    if (!adapterInterface) {
        throw new Error("Failed to initialize database adapter");
    }
    return adapterInterface;
}

async function startAgent(
    character: Character,
    directClient: DirectClient
): Promise<AgentRuntime> {
    let db: IDatabaseAdapter & IDatabaseCacheAdapter | undefined = undefined;
    try {
        character.id ??= stringToUuid(character.name);
        character.username ??= character.name;

        const token = getTokenForProvider(character.modelProvider, character);
        const runtime: AgentRuntime = await createAgent(character, token || "");

        db = await findDatabaseAdapter(runtime);
        runtime.databaseAdapter = db;

        const cache = initializeDbCache(character, db);
        runtime.cacheManager = cache;

        await runtime.initialize();
        runtime.clients = await initializeClients(character, runtime);
        directClient.registerAgent(runtime);

        elizaLogger.debug(`Started ${character.name} as ${runtime.agentId}`);
        return runtime;
    } catch (error) {
        elizaLogger.error(`Error starting agent for character ${character.name}:`, error);
        if (db) {
            await db.close();
        }
        throw error;
    }
}

const checkPortAvailable = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once("error", (err: NodeJS.ErrnoException) => {
            if (err.code === "EADDRINUSE") {
                resolve(false);
            }
        });
        server.once("listening", () => {
            server.close();
            resolve(true);
        });
        server.listen(port);
    });
};

const startAgents = async () => {
    const directClient = new DirectClient();
    let serverPort = Number.parseInt(settings.SERVER_PORT || "3000");
    const characters = [teesaCharacter];

    try {
        for (const character of characters) {
            await startAgent(character, directClient);
        }
    } catch (error) {
        elizaLogger.error("Error starting agents:", error);
    }

    while (!(await checkPortAvailable(serverPort))) {
        elizaLogger.warn(`Port ${serverPort} is in use, trying ${serverPort + 1}`);
        serverPort++;
    }

    directClient.startAgent = async (character: Character) => {
        return startAgent(character, directClient);
    };

    directClient.start(serverPort);

    if (serverPort !== Number.parseInt(settings.SERVER_PORT || "3000")) {
        elizaLogger.log(`Server started on alternate port ${serverPort}`);
    }
};

startAgents().catch((error) => {
    elizaLogger.error("Unhandled error in startAgents:", error);
    process.exit(1);
});

if (process.env.PREVENT_UNHANDLED_EXIT && parseBooleanFromText(process.env.PREVENT_UNHANDLED_EXIT)) {
    process.on("uncaughtException", (err) => {
        console.error("uncaughtException", err);
    });
    process.on("unhandledRejection", (err) => {
        console.error("unhandledRejection", err);
    });
}