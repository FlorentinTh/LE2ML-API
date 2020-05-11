import { check } from 'express-validator';

const validation = {
  add: [
    check('label')
      .notEmpty()
      .isString(),
    check('type')
      .notEmpty()
      .isString()
      .isIn('supervised', 'unsupervised'),
    check('enable')
      .notEmpty()
      .isBoolean(),
    check('container')
      .notEmpty()
      .isString()
  ]
};

export default validation;
