import 'dotenv/config'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { promises as fs } from 'fs'
import {
    RunnablePassthrough,
    RunnableSequence,
} from 'langchain/schema/runnable'
import { PromptTemplate } from '@langchain/core/prompts'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { ChatOpenAI } from 'langchain/chat_models/openai'
import { StringOutputParser } from 'langchain/schema/output_parser'
import {
    answerTemplate,
    combineDocuments,
    standaloneQuestionTemplate,
} from '../utils/utils.js'
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector'
import pg from 'pg'
import { createPgVectorExtensionAndTable } from './pgvector.js'
const { Pool } = pg
const tableName = 'monyble'
const dimensions = 1536
// Configuration for PostgreSQL connection
const pgPoolConfig = {
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: parseInt(process.env.PG_PORT, 10),
    tableName: 'testlangchain',
    columns: {
        idColumnName: 'id',
        vectorColumnName: 'vector',
        contentColumnName: 'content',
        metadataColumnName: 'metadata',
    },
    distanceStrategy: 'cosine', // Supported strategies: cosine (default), innerProduct, euclidean
}

const OPEN_AI_KEY = process.env.OPEN_AI_KEY

// Initialize PGVectorStore
const pgPool = new Pool(pgPoolConfig)
const embeddings = new OpenAIEmbeddings({ openAIApiKey: OPEN_AI_KEY })
const config = {
    postgresConnectionOptions: {
        type: 'postgres',
        user: process.env.PG_USER,
        host: process.env.PG_HOST,
        database: process.env.PG_DATABASE,
        password: process.env.PG_PASSWORD,
        port: parseInt(process.env.PG_PORT, 10),
        tableName: tableName,
    },
    tableName: tableName,
    columns: {
        idColumnName: 'id',
        vectorColumnName: 'vector',
        contentColumnName: 'content',
        metadataColumnName: 'metadata',
    },
    // supported distance strategies: cosine (default), innerProduct, or euclidean
    distanceStrategy: 'cosine',
}
export const cachedData = []
const pgvectorStore = new PGVectorStore(embeddings, config)
export const createEmbeddingsFromTxtFile = async (
    textdata,
    filePath,
    tableName
) => {
    // const pgvectorStore = await InitializePGVector(tableName)
    try {
        //const text = await fs.readFile('./trainingData/data.txt', 'utf8')
        const text = textdata ?? (await fs.readFile(filePath, 'utf8'))

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 500,
            separators: ['\n\n', '\n', ' ', ''],
            chunkOverlap: 50,
        })
        const documents = await splitter.createDocuments([text])
        // Store documents in PGVectorStore
        await pgvectorStore.addDocuments(documents)
        console.log('Success')
    } catch (error) {
        console.log(error)
    }
}
// createEmbeddingsFromTxtFile('tablename')

export const fetchAnswerFromVectorStore = async (question, tableName) => {
    const pgvectorStore = await InitializePGVector(tableName)
    const llm = new ChatOpenAI({ openAIApiKey: OPEN_AI_KEY })
    const vectorStoreRetriever = pgvectorStore.asRetriever()

    const answerPrompt = PromptTemplate.fromTemplate(answerTemplate(tableName))
    const standaloneQuestionPrompt = PromptTemplate.fromTemplate(
        standaloneQuestionTemplate
    )

    const standaloneQuestionChain = standaloneQuestionPrompt
        .pipe(llm)
        .pipe(new StringOutputParser())

    const retrieverChain = RunnableSequence.from([
        (prevResult) => prevResult.standalone_question,
        vectorStoreRetriever,
        combineDocuments,
    ])

    const answerChain = answerPrompt.pipe(llm).pipe(new StringOutputParser())

    const chain = RunnableSequence.from([
        {
            standalone_question: standaloneQuestionChain,
            original_input: new RunnablePassthrough(),
        },
        {
            context: retrieverChain,
            question: ({ original_input }) => original_input.question,
        },
        answerChain,
    ])

    try {
        const response = await chain.invoke({ question: question })
        cachedData.push({ question: question, answer: response })
        return response
    } catch (error) {
        console.log(error)
    }
}

// createPgVectorExtensionAndTable(tableName, dimensions)
