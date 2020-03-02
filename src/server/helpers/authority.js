import APIError from '@APIError';
import httpStatus from "http-status";


class Authority {

	static allowOnly(...roles) {
		return (req, res, next) => {
			const hasRole = roles.find(role => req.user.role === role);

			if(!hasRole) {
				return next(new APIError('user does not have sufficient privileges', httpStatus.UNAUTHORIZED));
			}

			next();
		};
	}
}

export default Authority;
