const express = require('express')
const cors = require('cors')
const app = express();
const cookieParser = require('cookie-parser')

//middlewares
app.use(cors());
app.use(express.json());
app.use(cookieParser())

app.get('/', (req, res) => {
    res.send('hello')
})

module.exports = app;