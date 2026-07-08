import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from '../config/db';

const router = express.Router();

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000
}

const generateToken = (id) => {
    return jwt.sign({id}, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
}

router.post('/register', async (req, res) => {


})