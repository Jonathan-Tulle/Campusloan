'use strict';

const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/auth');

// POST /api/v1/auth/login — endpoint publik, tidak memerlukan token
router.post('/login', authCtrl.login);

module.exports = router;
