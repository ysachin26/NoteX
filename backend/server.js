const dotenv = require('dotenv')
dotenv.config()
const express = require('express')

const connectDB = require('./src/config/db')

connectDB();
const app = require('./src/App')
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`)
     

})