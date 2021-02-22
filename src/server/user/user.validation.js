import { check } from 'express-validator';

const validation = {
  updateUser: [
    check('lastname').notEmpty().isString().isLowercase(),
    check('firstname').notEmpty().isString().isLowercase(),
    check('email').notEmpty().isEmail().isLowercase(),
    check('password').notEmpty().isString().isLength({ min: 8 }),
    check('passwordConfirm').notEmpty().isString().isLength({ min: 8 })
  ],
  changePassword: [
    check('currentPassword').notEmpty().isString().isLength({ min: 8 }),
    check('newPassword').notEmpty().isString().isLength({ min: 8 }),
    check('newPasswordConfirm').notEmpty().isString().isLength({ min: 8 })
  ]
};

export default validation;
