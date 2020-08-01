import Docker from 'dockerode';
import path from 'path';
import Config from '@Config';

const config = Config.getConfig();

class ContainerHelper {
  static async startContainer(image, token, jobId, userId) {
    if (!(image.constructor === String)) {
      throw new Error('Expected type for argument image is String');
    }

    if (!(token.constructor === String)) {
      throw new Error('Expected type for argument token is String');
    }

    if (!(jobId.constructor === String)) {
      throw new Error('Expected type for argument jobId is String');
    }

    if (!(userId.constructor === String)) {
      throw new Error('Expected type for argument userId is String');
    }

    const docker = new Docker();

    const basePath = config.data.base_path;
    const jobFolderPath = path.join(basePath, userId, 'jobs', jobId);
    const containerConf = {
      Image: image,
      Env: [`JOB=${jobId}`, `USER=${userId}`, `TOKEN=${token}`],
      HostConfig: {
        AutoRemove: true,
        Binds: [`${jobFolderPath}:/usr/src/app/job`]
      }
    };

    let container;
    try {
      container = await docker.createContainer(containerConf);
      await container.start();
    } catch (error) {
      throw new Error('Container failed to start');
    }

    return container.id;
  }

  static async stopContainer(id) {
    if (!(id.constructor === String)) {
      throw new Error('Expected type for argument id is String');
    }

    const docker = new Docker();

    try {
      const container = docker.getContainer(id);
      await container.stop();
    } catch (error) {
      throw new Error('Container not found');
    }
  }
}

export default ContainerHelper;
