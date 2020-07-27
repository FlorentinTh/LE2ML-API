import express from 'express';
import passport from 'passport';
import DataSourceController from './data-source.controller';
import validation from './data-source.validation';
import Authority from '@Authority';
import { role } from '../user/user.role';

const router = express.Router();

router
  .route('/')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    DataSourceController.getDataSources
  );

router
  .route('/')
  .put(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    validation.addDataSource,
    DataSourceController.addDataSource
  );

router
  .route('/state/:id')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    validation.updateState,
    DataSourceController.updateDataSource
  );

export default router;
