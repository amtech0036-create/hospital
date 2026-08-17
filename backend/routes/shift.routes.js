const express = require('express');
const router = express.Router();
const ShiftController = require('../controllers/shift.controller');
const authenticate = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', (req, res, next) => ShiftController.list(req, res, next));
router.get('/:id', (req, res, next) => ShiftController.getById(req, res, next));
router.post('/', (req, res, next) => ShiftController.create(req, res, next));
router.put('/:id', (req, res, next) => ShiftController.update(req, res, next));
router.delete('/:id', (req, res, next) => ShiftController.remove(req, res, next));

module.exports = router;
