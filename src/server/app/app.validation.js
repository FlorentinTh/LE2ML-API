import { check } from 'express-validator';

const validation = {
  addOrUpdate: [
    check('name').notEmpty().isString().isLowercase(),
    check('description').notEmpty().isString().isLowercase().isLength({ max: 50 })
  ]
};

export default validation;
