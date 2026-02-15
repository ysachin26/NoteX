const { Schema, model } = require('mongoose');

const user = new Schema
    (
        {
            name: {
                type: String,
                require: true,
                maxlength: 50
            },
            email: {
                type: String,
                required: true,
                maxlength: 50
            },
            password: {
                type: String,
                required: true,
            },
            createdAt: {
                type: Date,
                default: Date.now,
            }
        },
    )

    const userModel = model("user", user)
    module.exports = userModel;