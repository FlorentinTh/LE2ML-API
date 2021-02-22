import { check } from 'express-validator';
import { AlgoType } from './algo.enums';

const validation = {
  addAlgo: [
    check('label').notEmpty().isString(),
    check('type')
      .notEmpty()
      .isString()
      .isIn([AlgoType.SUPERVISED, AlgoType.UNSUPERVISED]),
    check('enabled').notEmpty().isBoolean(),
    check('container').notEmpty().isString()
  ],
  updateAlgo: [
    check('label').notEmpty().isString(),
    check('type')
      .notEmpty()
      .isString()
      .isIn([AlgoType.SUPERVISED, AlgoType.UNSUPERVISED]),
    check('enabled').notEmpty().isBoolean(),
    check('container').notEmpty().isString()
  ],
  updateState: [check('enabled').notEmpty().isBoolean()]
};

export default validation;
