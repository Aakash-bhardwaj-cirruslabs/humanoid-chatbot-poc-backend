import 'dotenv/config'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector'
import pg from 'pg'
const { Pool } = pg
const apiRecords = [
    { apiKey: 'demo', tableName: 'demo' },
    { apiKey: 'cirrusLabs', tableName: 'cirrusLabs' },
]
// Configuration for PostgreSQL connection
const pgPoolConfig = {
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: parseInt(process.env.PG_PORT, 10),
}

const pgPool = new Pool(pgPoolConfig)

const pool = pgPool

export const createPgVectorExtensionAndTable = async (
    tableName,
    dimensions
) => {
    try {
        await pool.query('CREATE EXTENSION IF NOT EXISTS vector;')

        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${tableName} (
                id SERIAL PRIMARY KEY,
                vector vector(${dimensions}),
                content TEXT,
                metadata JSONB
            );
        `)

        await pool.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM   pg_class c
                    JOIN   pg_namespace n ON n.oid = c.relnamespace
                    WHERE  c.relname = 'idx_vector'
                    AND    n.nspname = 'public'
                ) THEN
                    CREATE INDEX idx_vector ON ${tableName} USING ivfflat (vector vector_l2_ops);
                END IF;
            END
            $$;
        `)

        return `pgvector extension and ${tableName} table are set up successfully.`
    } catch (error) {
        console.error(
            `Failed to create pgvector extension or ${tableName} table:`,
            error
        )
    }
}

export const ValidateApiKeyAndFetchTableName = async (apiKey) => {
    const request_apiKey = apiKey.trim()
    const recordExists = apiRecords.find((e) => e.apiKey === request_apiKey)
    if (recordExists) {
        return recordExists.apiKey
    } else {
        return null
    }
}
