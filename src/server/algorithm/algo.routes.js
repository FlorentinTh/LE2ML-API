import express from 'express';
import passport from 'passport';
import AlgoController from './algo.controller';
import validation from './algo.validation';
import Authority from '@Authority';
import { role } from '../user/role';

const router = express.Router();

router
  .route('/')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    AlgoController.getAlgos
  );

router
  .route('/')
  .put(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    validation.add,
    AlgoController.addAlgo
  );

export default router;
