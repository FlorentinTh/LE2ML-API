import { check } from 'express-validator';
import { roles } from './../user/roles/roles';

const validation = {
  updateUser: [
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
      .isString()
      .isLength({ min: 8 }),
    check('passwordConfirm')
      .notEmpty()
      .isString()
      .isLength({ min: 8 })
  ],
  changePassword: [
    check('currentPassword')
      .notEmpty()
      .isString()
      .isLength({ min: 8 }),
    check('newPassword')
      .notEmpty()
      .isString()
      .isLength({ min: 8 }),
    check('newPasswordConfirm')
      .notEmpty()
      .isString()
      .isLength({ min: 8 })
  ]
};

export default validation;
