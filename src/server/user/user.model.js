import { Schema, model } from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Config from '@Config';
import { roles } from './../user/roles/roles';

class User extends Schema {
  constructor() {
    const user = super(
      {
        lastname: {
          type: String,
          required: true
        },
        firstname: {
          type: String,
          required: true
        },
        dateCreated: {
          type: Date,
          default: Date.now
        },
        email: {
          type: String,
          unique: true,
          required: true
        },
        role: {
          type: String,
          enum: [roles.ADMIN, roles.USER],
          default: roles.USER
        },
        lastConnection: {
          type: Date,
          default: null,
          required: false
        },
        tmpPassword: {
          type: Boolean,
          default: false,
          required: false
        },
        hash: String,
        salt: String
      },
      { versionKey: false }
    );

    user.methods.setPassword = this.setPassword;
    user.methods.validatePassword = this.validatePassword;
    user.methods.generateJwt = this.generateJwt;
    user.methods.isAuthenticated = this.isAuthenticated;
    user.methods.checkRole = this.checkRole;
  }

  async setPassword(password, resetTmpPassword = false) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    this.salt = salt;
    this.hash = hash;

    if (resetTmpPassword && this.tmpPassword) {
      this.tmpPassword = false;
    }
  }

  async validatePassword(password) {
    const hash = await bcrypt.compare(password, this.hash);
    return (this.hash = hash);
  }

  generateJwt() {
    return jwt.sign(this.toJSON(), Config.getConfig().jwtSecret, {
      expiresIn: '2 days'
    });
  }

  isAuthenticated(token) {
    return {
      data: {
        user: {
          token: token
        }
      },
      message: 'User successfully authenticated.'
    };
  }
}

export default model('User', new User());
