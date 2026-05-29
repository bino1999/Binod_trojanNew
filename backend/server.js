require('dotenv').config()
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const routes = require('./src/routes')

const app = express()
const PORT = process.env.PORT || 3003

app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(morgan('dev'))

app.use('/api', routes)

app.use((req, res) => res.status(404).json({ error: 'Not found' }))

app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => console.log(`IMS backend running on http://localhost:${PORT}`))
