import APIError from '@APIError';
import httpStatus from 'http-status';

class Authority {
  static allowSameIdentity() {
    return (req, res, next) => {
      if (!(req.params.id === req.user.id)) {
        return next(new APIError('User not authorized.', httpStatus.UNAUTHORIZED));
      }

      next();
    };
  }

  static allowOnlyRoles(...roles) {
    return (req, res, next) => {
      const hasRole = roles.find(role => req.user.role === role);

      if (!hasRole) {
        return next(
          new APIError('User does not have sufficient privileges.', httpStatus.FORBIDDEN)
        );
      }

      next();
    };
  }
}

export default Authority;
