import express from 'express';
import passport from 'passport';

import FeatureController from './feature.controller';
import Authority from '@Authority';
import { role } from '../user/role';

const router = express.Router();

router
  .route('/')
  .get(
    passport.authenticate('jwt', { session: false }),
    Authority.allowOnlyRoles(role.ADMIN, role.USER),
    FeatureController.getFeatures
  );

export default router;
