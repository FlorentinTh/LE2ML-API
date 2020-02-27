import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import User from '@Server/user/user.model';
import APIError from '@APIError';
import httpStatus from 'http-status';

passport.use(
	new LocalStrategy(
		{ usernameField: user[courriel], passwordField: user[password] },
		async (courriel, password, done) => {
			try {
				const user = await User.findOne().where('courriel').in([ courriel ]).exec();
				if (!user || !user.validatePassword(password)) {
					const error = new APIError('email or password is invalid', httpStatus.UNAUTHORIZED, true);
					return done(error);
				}

				return done(null, user);
			} catch (err) {
				const error = new APIError(err, httpStatus.INTERNAL_SERVER_ERROR, true);
				done(error);
			}
		}
	)
);
