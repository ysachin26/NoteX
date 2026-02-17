const UserModel = require('../models/user.model')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')
dotenv.config()



async function registerUser(req, res) {

    try{
 const { name, email, password } = req.body;

    const isUserAlreadyExist = await UserModel.findOne(
        {
            email
        }
    )

    //checking if user already exists in database

    if (isUserAlreadyExist) {
        return res.status(400).json({
            message: "user already exists"
        })
    }

    //hashing password before registering a user

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await UserModel.create(
        {
            name,
            email,
            password: hashedPassword
        }
    )

    //creating token
    const token = jwt.sign(
        {
            id: user._id,
        }, '5elFdNSt9K5yyQyfmhIvjhWxZhdGVf5ziNg7nrUoHmb'
    )

    res.cookie("token", token)

    res.status(201).json(
        {
            message: "user created successfully",
            user:
            {
                _id: user._id,
                email: user.email,
                name: user.name
            }
        }

    )
    }catch(error)
    {
        res.send( 
            console.log(error)
         )
    }
   
}

async function loginUser(req, res) {

}

module.exports = {
    registerUser,
    loginUser,
}