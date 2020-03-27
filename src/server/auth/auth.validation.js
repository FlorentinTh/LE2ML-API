import { check } from 'express-validator';

const validation = {
  register: [
    check('lastname')
      .notEmpty()
      .isString()
      .isLowercase(),
    check('firstname')
      .notEmpty()
      .isString()
      .isLowercase(),
    check('email')
      .notEmpty()
      .isEmail()
      .isLowercase(),
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
      .isEmail()
      .isLowercase(),
    check('password')
      .notEmpty()
      .isString()
      .isLength({ min: 8 })
  ]
};

export default validation;
