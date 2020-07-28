import express from 'express';
import TaskController from './task.controller';
import validation from './task.validation';
import Authority from '@Authority';

const router = express.Router();

router
  .route('/:id/tasks/complete')
  .post(
    Authority.allowOnlyTrustedApp(),
    validation.update,
    TaskController.completeTask,
    TaskController.startTask
  );

router
  .route('/:id/tasks/error')
  .post(Authority.allowOnlyTrustedApp(), TaskController.failTask);

export default router;
