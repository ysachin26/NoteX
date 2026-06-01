// @ts-check

const UserModel = require('../models/user.model')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const sendOTP = require('../service/sendOTP.js')
const generateOTP = require('../utility/generateOTP.js')
const hashingOTP = require('../utility/hashingOTP.js')
const dotenv = require('dotenv')
const { OAuth2Client } = require('google-auth-library')
const { query } = require('express-validator');
dotenv.config()

function createJwtToken(user) {
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
        return null
    }
    return jwt.sign(
        {
            id: user._id,
        },
        jwtSecret
    )
}

function buildGoogleRedirectUri(req) {
    return process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/user/google/callback`
}

function getGoogleOAuthClient(req) {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    if (!clientId || !clientSecret) {
        return null
    }
    return new OAuth2Client(clientId, clientSecret, buildGoogleRedirectUri(req))
}

/**
 * @typedef {{ name: string, email: string, password: string, otp?: string }} RegisterBody
 * @typedef {{ id: string }} AuthUser
 * @typedef {import('express').Request & { user?: AuthUser }} AuthenticatedRequest
 */

/**
 * @param {import('express').Request<{}, any, RegisterBody>} req
 * @param {import('express').Response} res
 *  
 * @returns 
 */
async function registerUser(req, res) {

    try {
        const { name, email, password } = req.body;


        const isUserAlreadyExist = await UserModel.findOne(
            {
                email
            }
        )

        //checking if user already exists in database
        if (isUserAlreadyExist) {
            // If account exists but email not verified, resend OTP instead of blocking
            if (!isUserAlreadyExist.isVerified) {
                const otp = generateOTP();
                const hashedOtp = hashingOTP(otp)
                isUserAlreadyExist.otp = hashedOtp;
                isUserAlreadyExist.otpExpire = new Date(Date.now() + 10 * 60 * 1000);
                await isUserAlreadyExist.save();
                await sendOTP(email, String(otp));
                return res.status(200).json({
                    message: "Account exists but not verified. A new OTP has been sent to your email."
                })
            }
            return res.status(400).json({
                message: "user already exists"
            })
        }

        //otp generation
        const otp = generateOTP();
        const hashedOtp = hashingOTP(otp)
        //hashing password before registering a user
        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await UserModel.create(
            {
                name,
                email,
                password: hashedPassword,
                otp: hashedOtp,
                otpExpire: new Date(Date.now() + 10 * 60 * 1000)
            }
        )

        await sendOTP(email, String(otp));

        // No cookie here — user must verify OTP before getting a session
        res.status(201).json(
            {
                message: "user created successfully please verify your otp",
            }
        )
    } catch (error) {
        res.status(400).json(
            {
                message: `Internal Server Error ${error}`,

            })
    }

}

/**
 * 
 * @param {import('express').Request<{},any , RegisterBody>} req 
 * @param {import('express').Response} res 
 * @returns 
 */
async function loginUser(req, res) {

    try {
        const { email, password } = req.body;


        const user = await UserModel.findOne(
            {
                email
            }
        )

        if (!user) {
            return res.status(400).json({
                message: "Invalid email or password"
            })
        }

        if (!user.isVerified) {
            console.log("verify your email to login")
            return res.status(403).json({
                message: "Please verify email first"

            });

        }

        if (!user.password) {
            return res.status(400).json({
                message: "Use Google sign-in for this account"
            })
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(400).json({
                message: "Invalid email or password"
            })
        }

        const token = createJwtToken(user)
        if (!token) {
            return res.status(500).json({
                message: "JWT_SECRET is not configured"
            })
        }

        res.cookie("token", token)
        res.status(200).json({
            message: "user logged in successfully",
            user:
            {
                _id: user._id,
                email: user.email,
                name: user.name
            }
        })
    }
    catch (error) {
        res.status(400).json(
            {
                message: `Internal Server Error ${error}`,

            })
    }
}
/**
 * @param {import('express').Request<{}, any, RegisterBody>} req
 * @param {import('express').Response} res
 * @returns 
 */
function logoutUser(req, res) {
    res.clearCookie("token");
    res.status(200).json({
        message: "user logged out successfully"
    })
}
/**
 * @param {AuthenticatedRequest} req
 * @param {import('express').Response} res
 * @returns 
 */
async function getMe(req, res) {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "login first" })
        }

        const user = await UserModel.findById(req.user.id).select('_id email name')
        if (!user) {
            return res.status(404).json({ message: "user not found" })
        }

        return res.status(200).json({ user })
    } catch (error) {
        return res.status(400).json({ message: `Internal Server Error ${error}` })
    }
}
/**
 * @param {import('express').Request<{}, any, RegisterBody>} req
 * @param {import('express').Response} res
 * @returns 
 */
async function verifyOtp(req, res) {

    const { email, otp } = req.body;

    const user = await UserModel.findOne(
        {
            email
        }
    )
    if (!user) return res.status(404).json({ message: "user not found" });

    if (!user.otp || !user.otpExpire) {
        return res.status(400).json({ message: "otp not set" });
    }

    if (user.otpExpire < new Date())
        return res.status(400).json({ message: "otp expired" });


    const hashedOtp = hashingOTP(otp)
    if (String(user.otp) !== String(hashedOtp))
        return res.status(400).json({ message: "invalid otp" });

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();
    return res.status(200).json({ message: "otp verified" });
}

/**
 * @param {import('express').Request<{}, any, { email: string }>} req
 * @param {import('express').Response} res
 * @returns
 */
async function resendRegisterOtp(req, res) {
    try {
        const { email } = req.body

        if (!email) {
            return res.status(400).json({ message: 'email is required' })
        }

        const user = await UserModel.findOne({ email })
        if (!user) {
            return res.status(404).json({ message: 'user not found' })
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'user already verified' })
        }

        const otp = generateOTP()
        const hashedOtp = hashingOTP(otp)
        user.otp = hashedOtp
        user.otpExpire = new Date(Date.now() + 10 * 60 * 1000)
        await user.save()

        await sendOTP(email, String(otp))
        return res.status(200).json({ message: 'OTP resent successfully' })
    } catch (error) {
        return res.status(400).json({
            message: `Internal Server Error ${error}`,
        })
    }
}
/**
 * @param {import('express').Request<{}, any, RegisterBody>} req
 * @param {import('express').Response} res
 * @returns 
 */

async function forgotPassword(req, res) {
    try {
        const { email } = req.body;

        const validUser = await UserModel.findOne(
            {
                email
            }
        )
        if (!validUser) {
            return res.status(400).json({
                message: "User does not exist"
            })
        }

        const otp = generateOTP();
        const hashedOTP = hashingOTP(otp)
        validUser.otp = hashedOTP;
        validUser.otpExpire = new Date(Date.now() + 10 * 60 * 1000);
        validUser.resetOtpVerified = false;

        await validUser.save();

        await sendOTP(email, String(otp));

        return res.status(200).json({
            message: "OTP sent to your email"
        })
    } catch (error) {
        return res.status(400).json({
            message: `Internal Server Error ${error}`,
        })
    }


}
/**
 * @param {import('express').Request<{}, any, RegisterBody>} req
 * @param {import('express').Response} res
 * @returns 
 */
async function verifyResetOtp(req, res) {
    try {
        const { email, otp } = req.body;

        const user = await UserModel.findOne({ email })
        if (!user) {
            return res.status(404).json({ message: "user not found" });
        }

        if (!user.otp || !user.otpExpire) {
            return res.status(400).json({ message: "otp not set" });
        }

        if (user.otpExpire < new Date()) {
            return res.status(400).json({ message: "otp expired" });
        }

        const hashedOtp = hashingOTP(otp)
        if (String(user.otp) !== String(hashedOtp)) {
            return res.status(400).json({ message: "invalid otp" });
        }

        user.resetOtpVerified = true;
        user.otp = undefined;
        user.otpExpire = undefined;
        await user.save();

        return res.status(200).json({ message: "reset otp verified" });
    } catch (error) {
        return res.status(400).json({
            message: `Internal Server Error ${error}`,
        })
    }
}
/**
 * @param {import('express').Request<{}, any, RegisterBody>} req
 * @param {import('express').Response} res
 * @returns 
 */
const resetPassword = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "email and password are required" })
        }

        const user = await UserModel.findOne(
            {
                email
            }
        )

        if (!user) {
            return res.status(404).json({ message: "user not found" })
        }

        if (!user.resetOtpVerified) {
            return res.status(403).json({ message: "verify reset otp first" })
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        user.password = hashedPassword;
        user.resetOtpVerified = false;
        user.otp = undefined;
        user.otpExpire = undefined;
        await user.save();
        return res.status(200).json({
            message: "password reset successful"
        })
    } catch (error) {
        return res.status(400).json({
            message: `Internal Server Error ${error}`,
        })
    }
}


/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns
 */
async function googleOAuthRedirect(req, res) {
    const client = getGoogleOAuthClient(req)
    if (!client) {
        return res.status(500).json({ message: 'Google OAuth is not configured' })
    }

    const authUrl = client.generateAuthUrl({
        scope: ['openid', 'email', 'profile'],
        prompt: 'select_account',
    })

    return res.redirect(authUrl)
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns
 */
async function googleOAuthCallback(req, res) {
    try {
        const { code } = req.query
        if (!code || typeof code !== 'string') {
            return res.status(400).json({ message: 'missing authorization code' })
        }

        const client = getGoogleOAuthClient(req)
        if (!client) {
            return res.status(500).json({ message: 'Google OAuth is not configured' })
        }

        const { tokens } = await client.getToken(code)
        if (!tokens || !tokens.id_token) {
            return res.status(400).json({ message: 'missing id token from Google' })
        }

        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        })

        const payload = ticket.getPayload()
        if (!payload || !payload.email || !payload.sub) {
            return res.status(400).json({ message: 'unable to read Google profile' })
        }

        const email = payload.email
        const name = payload.name || payload.given_name || 'Google User'
        const googleId = payload.sub

        let user = await UserModel.findOne({ email })
        if (user) {
            let updated = false
            if (!user.googleId) {
                user.googleId = googleId
                updated = true
            }
            if (!user.isVerified) {
                user.isVerified = true
                updated = true
            }
            if (!user.authProvider) {
                user.authProvider = 'local'
                updated = true
            }
            if (updated) {
                await user.save()
            }
        } else {
            user = await UserModel.create({
                name,
                email,
                googleId,
                authProvider: 'google',
                isVerified: true,
            })
        }

        const token = createJwtToken(user)
        if (!token) {
            return res.status(500).json({ message: 'JWT_SECRET is not configured' })
        }

        res.cookie('token', token)
        const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
        return res.redirect(redirectUrl)
    } catch (error) {
        return res.status(400).json({
            message: `Internal Server Error ${error}`,
        })
    }
}

module.exports = {
    registerUser,
    loginUser, logoutUser, verifyOtp, resendRegisterOtp, forgotPassword, verifyResetOtp, getMe, resetPassword,
    googleOAuthRedirect, googleOAuthCallback
}