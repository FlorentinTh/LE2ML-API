import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import httpStatus from 'http-status';
import User from '../server/user/user.model';
import APIError from '@APIError';
import Config from '@Config';

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: Config.getConfig().jwtSecret
    },
    async (payload, done) => {
      try {
        const user = await User.findOne().where('_id').in([payload._id]).exec();

        if (!user) {
          return done(new APIError('Authentication failed', httpStatus.UNAUTHORIZED));
        }

        return done(null, user);
      } catch (error) {
        done(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR));
      }
    }
  )
);
