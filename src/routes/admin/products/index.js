const express = require('express');
const { uploadProductFiles } = require('../../../middleware/upload');
const { list } = require('./list');
const { newForm, create } = require('./create');
const { editForm, update } = require('./edit');
const { remove } = require('./delete');

const router = express.Router();

router.get('/', list);
router.get('/new', newForm);
router.post('/', uploadProductFiles, create);
router.get('/:id/edit', editForm);
router.post('/:id', uploadProductFiles, update);
router.post('/:id/delete', remove);

module.exports = router;
