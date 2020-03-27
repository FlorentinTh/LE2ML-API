import { check } from 'express-validator';
import { roles } from '../../user/roles/roles';

const validation = {
  updateUser: [
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
    check('role')
      .notEmpty()
      .isString()
      .isIn([roles.ADMIN, roles.USER])
  ],
  updateRole: [
    check('role')
      .notEmpty()
      .isString()
      .isIn([roles.ADMIN, roles.USER])
  ],
  setTempPassword: [
    check('email')
      .notEmpty()
      .isEmail()
      .isLowercase(),
    check('tempPassword')
      .notEmpty()
      .isString()
      .isLength({ min: 8 }),
    check('tempPasswordConfirm')
      .notEmpty()
      .isString()
      .isLength({ min: 8 })
  ]
};

export default validation;
