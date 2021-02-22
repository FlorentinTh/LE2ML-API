import { check } from 'express-validator';
import { FeatureDomain } from './feature.enums';

const validation = {
  addFeature: [
    check('label').notEmpty().isString(),
    check('domain').notEmpty().isString().isIn([FeatureDomain.TIME, FeatureDomain.FREQ]),
    check('enabled').notEmpty().isBoolean(),
    check('container').notEmpty().isString()
  ],

  updateFeature: [
    check('label').notEmpty().isString(),
    check('domain').notEmpty().isString().isIn([FeatureDomain.TIME, FeatureDomain.FREQ]),
    check('enabled').notEmpty().isBoolean(),
    check('container').notEmpty().isString()
  ],

  updateState: [check('enabled').notEmpty().isBoolean()]
};

export default validation;
