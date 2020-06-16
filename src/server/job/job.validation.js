import { check } from 'express-validator';

const validation = {
  startJob: [
    check('label')
      .notEmpty()
      .isString()
  ]
};

export default validation;
