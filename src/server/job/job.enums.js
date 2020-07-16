export const JobState = {
  STARTED: 'started',
  COMPLETED: 'completed',
  CANCELED: 'canceled'
};

export const TaskState = {
  QUEUED: 'queued',
  STARTED: 'started',
  COMPLETED: 'completed',
  CANCELED: 'canceled'
};

export const JobPipeline = {
  ML: 'machine_learning',
  DL: 'deep_learning'
};

export const JobProcess = {
  TRAINING: 'training',
  TESTING: 'testing',
  NONE: 'none'
};
