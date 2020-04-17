import { check } from 'express-validator';
import { role } from '../../user/role';

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
      .isIn([role.ADMIN, role.USER])
  ],
  updateRole: [
    check('role')
      .notEmpty()
      .isString()
      .isIn([role.ADMIN, role.USER])
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
