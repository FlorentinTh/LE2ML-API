import express from 'express';
import passport from 'passport';
import Authority from '@Authority';
import { role } from '../../user/user.role';
import validation from './data.validation';
import DataController from './data.controller';

const router = express.Router();

router
  .route('/')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    DataController.getFiles
  );

router
  .route('/:file/stream')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    DataController.streamFile
  );

router
  .route('/:file/exists')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    DataController.isFileExists
  );

router
  .route('/:file/download')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    DataController.downloadFile
  );

router
  .route('/:file/headers')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    DataController.getFileHeaders
  );

router
  .route('/rename')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    validation.renameFile,
    DataController.renameFile
  );

router
  .route('/:file/edit')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    DataController.removeAttributes,
    DataController.renameAttributes,
    DataController.editDone
  );

router
  .route('/')
  .delete(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    validation.removeFile,
    DataController.removeFile
  );

export default router;
