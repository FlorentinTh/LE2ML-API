export const JobState = {
  STARTED: 'started',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
  ERROR: 'error'
};

export const TaskState = {
  QUEUED: 'queued',
  STARTED: 'started',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
  FAILED: 'failed'
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
