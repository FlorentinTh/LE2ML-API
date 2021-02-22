import APIError from '@APIError';
import httpStatus from 'http-status';
import App from '../server/app/app.model';

class Authority {
  static allowSameIdentity() {
    return (req, res, next) => {
      if (!(req.params.id === req.user.id)) {
        return next(new APIError('User not authorized', httpStatus.UNAUTHORIZED));
      }

      next();
    };
  }

  static allowOnlyRoles(...roles) {
    return (req, res, next) => {
      const hasRole = roles.find(role => req.user.role === role);

      if (!hasRole) {
        return next(
          new APIError('User does not have sufficient privileges', httpStatus.FORBIDDEN)
        );
      }

      next();
    };
  }

  static allowOnlyTrustedApp() {
    return async (req, res, next) => {
      const key = req.headers['app-key'];

      try {
        const apps = await App.find().select().exec();

        if (!apps) {
          return next(new APIError('No matching key found', httpStatus.UNAUTHORIZED));
        }

        let validKey;
        for (let i = 0; i < apps.length; ++i) {
          const appKey = new App(apps[i]);
          const isValidKey = await appKey.validateKey(key);

          if (isValidKey) {
            validKey = appKey;
            break;
          }
        }

        if (validKey === undefined) {
          return next(new APIError('No matching key found', httpStatus.UNAUTHORIZED));
        }

        next();
      } catch (error) {
        next(
          new APIError(
            'Error occurs while trying to validate app key',
            httpStatus.UNAUTHORIZED
          )
        );
      }
    };
  }
}

export default Authority;
