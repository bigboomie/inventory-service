import passport from 'passport';
import HTTPStatus from 'http-status';
import LocalStrategy from 'passport-local';
import { Strategy as JWTStrategy, ExtractJwt } from 'passport-jwt';
import jwt from 'jsonwebtoken';
import constants from '../config/constants';

import User from '../module/user/user.model';

const localOpts = {
  usernameField: 'username',
};
const localStrategy = new LocalStrategy(
  localOpts,
  async (username, password, done) => {
    try {
      const user = await User.findOne({ username });

      if (!user) {
        return done(null, false);
      }
      if (!user.validatePassword(password)) {
        return done(null, false);
      }

      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }
);

passport.use(localStrategy);

export const authLocal = async (req, res, next) =>
  passport.authenticate('local', { session: false }, (err, user) => {
    if (err) {
      return res
        .status(HTTPStatus.UNAUTHORIZED)
        .json('Invalid username or password');
    }
    if (!user) {
      return res
        .status(HTTPStatus.UNAUTHORIZED)
        .json('Invalid username or password');
    }

    return res.status(HTTPStatus.OK).json(user.toAuthJSON());
  })(req, res, next);

const jwtOpts = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    ExtractJwt.fromHeader('token'),
    req => req.params.token,
  ]),
  secretOrKey: constants.JWT_SECRET,
};

const jwtStrategy = new JWTStrategy(jwtOpts, async (payload, done) => {
  try {
    const user = await User.findOne({ _id: payload._id });
    if (!user) {
      return done(null, false);
    }
    return done(null, user);
  } catch (e) {
    return done(e, false);
  }
});

passport.use(jwtStrategy);

export const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      return res.status(HTTPStatus.UNAUTHORIZED).json('Unnauthorized');
    }

    const token = authHeader.replace('Bearer ', '');

    let decodedToken;

    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(HTTPStatus.UNAUTHORIZED).json('Unauthorized');
    }

    const { _id } = decodedToken;

    if (!decodedToken || !_id) {
      return res.status(HTTPStatus.UNAUTHORIZED);
    }

    const user = await User.findOne({ _id, isActive: true });
    req.user = user;

    return next();
  } catch (error) {
    next(error);
  }
};

export const authJwt = passport.authenticate('jwt', { session: false });
