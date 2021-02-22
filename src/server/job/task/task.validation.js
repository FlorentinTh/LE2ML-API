import { check } from 'express-validator';
import { TasksList, TaskState } from './task.enums';

const validation = {
  update: [
    check('task')
      .notEmpty()
      .isString()
      .isIn([TasksList.WINDOWING, TasksList.FEATURES, TasksList.LEARNING]),
    check('state').notEmpty().isString().equals(TaskState.COMPLETED),
    check('token').notEmpty().isString()
  ]
};

export default validation;
