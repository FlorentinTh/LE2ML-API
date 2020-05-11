import { check } from 'express-validator';

const validation = {
  add: [
    check('label')
      .notEmpty()
      .isString(),
    check('domain')
      .notEmpty()
      .isString()
      .isIn('time', 'frequential'),
    check('enable')
      .notEmpty()
      .isBoolean(),
    check('container')
      .notEmpty()
      .isString()
  ]
};

export default validation;
