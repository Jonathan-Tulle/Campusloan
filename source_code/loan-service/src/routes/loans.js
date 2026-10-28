'use strict';

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const loanCtrl = require('../controllers/loan');

// Seluruh rute peminjaman dilindungi middleware verifikasi JWT
router.post('/', verifyToken, loanCtrl.createLoan);
router.get('/', verifyToken, loanCtrl.listLoans);
router.get('/:id', verifyToken, loanCtrl.getLoanById);
router.patch('/:id', verifyToken, loanCtrl.updateLoanStatus);

module.exports = router;
