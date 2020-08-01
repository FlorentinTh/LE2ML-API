import { check } from 'express-validator';
import { FileType } from '../file.enums';

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
      .isIn([FileType.MODEL, FileType.RAW, FileType.FEATURES])
  ],

  removeFile: [
    check('filename')
      .notEmpty()
      .isString(),
    check('fileType')
      .notEmpty()
      .isIn([FileType.MODEL, FileType.RAW, FileType.FEATURES])
  ]
};

export default validation;
