import express from 'express';
import passport from 'passport';
import validation from './feature.validation';
import FeatureController from './feature.controller';
import Authority from '@Authority';
import { role } from '../user/role';

const router = express.Router();

router
  .route('/')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    FeatureController.getFeatures
  );

router
  .route('/')
  .put(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    validation.add,
    FeatureController.addFeature
  );

router
  .route('/:domain')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    FeatureController.getFeaturesByDomain
  );

export default router;
