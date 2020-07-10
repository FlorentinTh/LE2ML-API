import { check } from 'express-validator';

const validation = {
  start: [
    check('label')
      .notEmpty()
      .isString()
  ]
};

export default validation;
