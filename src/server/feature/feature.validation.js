import { check } from 'express-validator';
import { domain } from './domain';

const validation = {
  addFeature: [
    check('label')
      .notEmpty()
      .isString(),
    check('domain')
      .notEmpty()
      .isString()
      .isIn([domain.TIME, domain.FREQ]),
    check('enabled')
      .notEmpty()
      .isBoolean(),
    check('container')
      .notEmpty()
      .isString()
  ],
  updateFeature: [
    check('label')
      .notEmpty()
      .isString(),
    check('domain')
      .notEmpty()
      .isString()
      .isIn([domain.TIME, domain.FREQ]),
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
