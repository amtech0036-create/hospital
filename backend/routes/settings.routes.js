const express = require('express');
const router = express.Router();

const controller = require('../controllers/settings.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { settingsUpdateRules, userCreateRules, userUpdateRules } = require('../validators/settings.validator');

router.use(authenticate);

router.get('/', controller.getSettings);
router.put('/', authorize('Admin', 'Manager'), settingsUpdateRules, validate, controller.updateSettings);

router.get('/users', authorize('Admin'), controller.listUsers);
router.post('/users', authorize('Admin'), userCreateRules, validate, controller.createUser);
router.put('/users/:id', authorize('Admin'), userUpdateRules, validate, controller.updateUser);
router.delete('/users/:id', authorize('Admin'), controller.deactivateUser);

module.exports = router;
