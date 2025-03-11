import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  format: ['esm'],
  external: [
    'dotenv',
    'fs',
    'path',
    'better-sqlite3',
    '@elizaos/core',
    '@elizaos/client-direct',
    '@elizaos/plugin-bootstrap',
    '@elizaos-plugins/adapter-postgres',
    '@elizaos-plugins/adapter-sqlite',
    '@elizaos-plugins/client-twitter',
    '@elizaos/plugin-teesa',
    'json5',
    'yargs'
  ]
}) 