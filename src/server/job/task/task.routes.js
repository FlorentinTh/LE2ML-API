import express from 'express';
import JobController from '../job.controller';
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
    TaskController.startTask,
    JobController.completeJob,
    TaskController.failTask
  );

router
  .route('/:id/tasks/error')
  .post(Authority.allowOnlyTrustedApp(), TaskController.failTask);

export default router;
