import express from 'express';
import passport from 'passport';
import FileController from './file.controller';
import Authority from '@Authority';
import { role } from '../user/user.role';

const router = express.Router();

router
  .route('/')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    FileController.getFiles
  );

router
  .route('/exists')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    FileController.fileExists
  );

router
  .route('/upload')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    FileController.uploadFile,
    FileController.uploadFileDone
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

export default router;
