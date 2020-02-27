import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import User from '../server/user/user.model';
import APIError from '@APIError';
import httpStatus from 'http-status';

passport.use(
	new LocalStrategy(
		{ usernameField: 'courriel', passwordField: 'password' },
		async (courriel, password, done) => {
			try {
				const user = await User.findOne()
					.where('courriel')
					.in([courriel])
					.exec();

				if (!user || !user.validatePassword(password)) {
					return done(new APIError('email or password is invalid', httpStatus.UNAUTHORIZED));
				}

				return done(null, user);
			}
			catch (err) {
				done(new APIError(error, httpStatus.INTERNAL_SERVER_ERROR));
			}
		}
	)
);
