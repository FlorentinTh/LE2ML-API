import { check } from 'express-validator';
import { type } from './type';

const validation = {
  addAlgo: [
    check('label')
      .notEmpty()
      .isString(),
    check('type')
      .notEmpty()
      .isString()
      .isIn([type.SUPERVISED, type.UNSUPERVISED]),
    check('enabled')
      .notEmpty()
      .isBoolean(),
    check('container')
      .notEmpty()
      .isString()
  ],
  updateAlgo: [
    check('label')
      .notEmpty()
      .isString(),
    check('type')
      .notEmpty()
      .isString()
      .isIn([type.SUPERVISED, type.UNSUPERVISED]),
    check('enabled')
      .notEmpty()
      .isBoolean(),
    check('container')
      .notEmpty()
      .isString()
  ],
  updateState: [
    check('enabled')
      .notEmpty()
      .isBoolean()
  ]
};

export default validation;
