'use strict';

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const catalogCtrl = require('../controllers/catalog');

// Seluruh endpoint katalog dilindungi middleware JWT
router.get('/', verifyToken, catalogCtrl.listFacilities);
router.get('/:id', verifyToken, catalogCtrl.getFacility);

module.exports = router;
