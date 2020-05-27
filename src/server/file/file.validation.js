import { check } from 'express-validator';
import fileType from './file.type';

const validation = {
  renameFile: [
    check('oldFilename')
      .notEmpty()
      .isString(),
    check('newFilename')
      .notEmpty()
      .isString(),
    check('fileType')
      .notEmpty()
      .isIn([fileType.MODEL, fileType.INPUT])
  ],
  removeFile: [
    check('filename')
      .notEmpty()
      .isString(),
    check('fileType')
      .notEmpty()
      .isIn([fileType.MODEL, fileType.INPUT])
  ]
};

export default validation;
