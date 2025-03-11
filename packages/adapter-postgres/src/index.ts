import { postgresAdapter } from "./client";

const postgresPlugin = {
    name: "postgres",
    description: "PostgreSQL database adapter plugin",
    adapters: [postgresAdapter],
};
export default postgresPlugin;
