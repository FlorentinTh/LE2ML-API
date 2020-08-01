import express from 'express';
import passport from 'passport';
import validation from './feature.validation';
import FeatureController from './feature.controller';
import Authority from '@Authority';
import { role } from '../user/user.role';

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
    validation.addFeature,
    FeatureController.addFeature
  );

router
  .route('/:id')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    validation.updateFeature,
    FeatureController.updateFeature
  );

router
  .route('/:id/state')
  .post(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    validation.updateState,
    FeatureController.updateFeature
  );

router
  .route('/:domain')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    FeatureController.getFeaturesByDomain
  );

router
  .route('/:id')
  .delete(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN),
    FeatureController.removeFeature
  );

export default router;
