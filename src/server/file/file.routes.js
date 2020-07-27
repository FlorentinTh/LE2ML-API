import express from 'express';
import passport from 'passport';
import FileController from './file.controller';
import Authority from '@Authority';
import { role } from '../user/user.role';
import validation from './file.validation';

const router = express.Router();

router
  .route('/')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    FileController.getFiles
  );

router
  .route('/stream/data/:file')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    FileController.streamDataFile
  );

router
  .route('/exists/:file')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    FileController.fileExists
  );

router
  .route('/download/:file')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    FileController.downloadFile
  );

router
  .route('/headers/:file')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    FileController.getFileHeaders
  );

router
  .route('/upload/inertial')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    FileController.uploadInertialFile,
    FileController.convertInertialFile,
    FileController.validInertialFile
  );

router
  .route('/import/conf')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    FileController.importConfig,
    FileController.processConfig
  );

router
  .route('/convert/conf')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    FileController.convertConfig
  );

router
  .route('/rename')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    validation.renameFile,
    FileController.renameFile
  );

router
  .route('/edit/:file')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    FileController.removeAttributes,
    FileController.renameAttributes,
    FileController.editDone
  );

router
  .route('/')
  .delete(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    validation.removeFile,
    FileController.removeFile
  );

export default router;
