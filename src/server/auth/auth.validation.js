import { check } from 'express-validator';

const validation = {
  register: [
    check('lastname')
      .notEmpty()
      .isString(),
    check('firstname')
      .notEmpty()
      .isString(),
    check('email')
      .notEmpty()
      .isEmail(),
    check('password')
      .notEmpty()
      .isLength({ min: 8 }),
    check('passwordConfirm')
      .notEmpty()
      .isLength({ min: 8 })
  ],
  login: [
    check('email')
      .notEmpty()
      .isEmail(),
    check('password').notEmpty()
  ]
};

export default validation;
