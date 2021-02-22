import { check } from 'express-validator';

const validation = {
  addDataSource: [
    check('label').notEmpty().isString(),
    check('enabled').notEmpty().isBoolean(),
    check('editableFiles').notEmpty().isBoolean()
  ],
  updateState: [check('enabled').notEmpty().isBoolean()]
};

export default validation;
