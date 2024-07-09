import 'dotenv/config'
import express from 'express'
import { cachedData, fetchAnswerFromVectorStore } from './library/index.js'
import path from 'path'
import { fileURLToPath } from 'url'
const app = express()
const PORT = process.env.PORT || 8080
import cors from 'cors'
import {
    ValidateApiKeyAndFetchTableName,
    createPgVectorExtensionAndTable,
} from './library/pgvector.js'
app.use(cors('*'))
// Middleware to parse JSON bodies
app.use(express.json())
// To simulate __dirname behavior in ES Module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// app.use(express.static(path.join(__dirname, 'build')))

// Handles any requests that don't match the ones above
// app.get('/iframe', (req, res) => {
//     res.sendFile(path.join(__dirname, 'build', 'index.html'))
// })

// Root route
app.get('/', (req, res) => {
    res.send('access denied')
})

app.get('/registerChatBot/:tableName', async (req, res) => {
    const { tableName } = req.params
    const result = await createPgVectorExtensionAndTable(
        tableName.trim().toLowerCase(),
        1536
    )
    res.send(result)
})

app.post('/trainBot/:apiKey', async (req, res) => {
    const { apiKey } = req.params
    const tableName = await ValidateApiKeyAndFetchTableName(apiKey)

    res.send(result)
})

app.post('/api/chatbot/:apiKey', async (req, res) => {
    const { apiKey } = req.params
    const { prompt } = req.body
    const tableName = await ValidateApiKeyAndFetchTableName(apiKey)
    if (tableName) {
        const responseExist = cachedData.filter((e) => e.question === prompt)
        if (responseExist && responseExist.length > 0) {
            res.json(responseExist[0].answer)
        } else {
            const answer = await fetchAnswerFromVectorStore(prompt, tableName)
            res.json(answer)
        }
    } else {
        res.json({ message: 'Invalid Api Key' })
    }
})

app.get('/embed/chatbot', (req, res) => {
    res.type('text/javascript')
    res.send(`
        (function() {
            var iframe = document.createElement('iframe');
            iframe.style.cssText = "position:fixed; bottom:20px; right:20px; width:70px; height:130px; border:none; border-radius:10px; z-index:1000;";
            iframe.src = "${req.protocol}://${req.get('host')}/iframe";
            iframe.id = "chatbotIframe";
            document.body.appendChild(iframe);

            window.addEventListener('message', function(event) {
                // Always verify the origin
             

                if (event.data.type === 'resizeIframe') {
                    if (event.data.state === 'closed') {
                       
                        // Minimize
                        iframe.style.width = '70px';
                        iframe.style.height = '130px';
                    } else if (event.data.state === 'open') {
                      
                        // Expand
                        iframe.style.width = '373px';
                        iframe.style.height = '500px';
                    
                    }
                }
            }, false);
        })();
    `)
})
// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
