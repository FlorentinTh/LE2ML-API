import express from 'express';
import passport from 'passport';
import FileController from './file.controller';
import Authority from '@Authority';
import { role } from '../user/role';

const router = express.Router();

router
  .route('/')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    FileController.getFiles
  );

router
  .route('/')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    FileController.uploadFile
  );

export default router;
