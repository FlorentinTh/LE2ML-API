import { check } from 'express-validator';

const validation = {
  addWindow: [
    check('label')
      .notEmpty()
      .isString(),
    check('enabled')
      .notEmpty()
      .isBoolean(),
    check('container')
      .notEmpty()
      .isString()
  ],
  updateWindow: [
    check('label')
      .notEmpty()
      .isString(),
    check('enabled')
      .notEmpty()
      .isBoolean(),
    check('container')
      .notEmpty()
      .isString()
  ],
  updateState: [
    check('enabled')
      .notEmpty()
      .isBoolean()
  ]
};

export default validation;
