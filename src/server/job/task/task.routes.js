import express from 'express';
import TaskController from './task.controller';
import Authority from '@Authority';

const router = express.Router();

router
  .route('/:id/tasks/start')
  .post(Authority.allowOnlyTrustedApp(), TaskController.startTask);

router
  .route('/:id/tasks/error')
  .post(Authority.allowOnlyTrustedApp(), TaskController.failTask);

export default router;
