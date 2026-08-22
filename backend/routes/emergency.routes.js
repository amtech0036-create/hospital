const express = require('express');
const router = express.Router();
const controller = require('../controllers/emergency.controller');

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', controller.create);
router.put('/:id', controller.update);

module.exports = router;
