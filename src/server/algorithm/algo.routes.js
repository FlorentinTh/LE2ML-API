import express from 'express';
import passport from 'passport';
import AlgoController from './algo.controller';
import validation from './algo.validation';
import Authority from '@Authority';
import { role } from '../user/user.role';

const router = express.Router();

router
  .route('/')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    AlgoController.getAlgos
  );

router
  .route('/params/conf/:file')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    AlgoController.getParamsConf
  );

router
  .route('/')
  .put(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    validation.addAlgo,
    AlgoController.addAlgo
  );

router
  .route('/:id')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    validation.updateAlgo,
    AlgoController.updateAlgo
  );

router
  .route('/:id')
  .delete(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    AlgoController.removeAlgo
  );

export default router;
