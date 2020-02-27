import { Schema, model } from 'mongoose';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import Config from '@Config';

class User extends Schema {
	constructor() {
		const user = super(
			{
				courriel: {
					type: String,
					unique: true,
					required: true
				},
				hash: String,
				salt: String
			},
			{ versionKey: false }
		);

		user.methods.setPassword = this.setPassword;
		user.methods.validatePassword = this.validatePassword;
		user.methods.generateJwt = this.generateJwt;
	}

	setPassword(password) {
		this.salt = crypto.randomBytes(16).toString('hex');
		this.hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
	}

	validatePassword(password) {
		const hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
		return (this.hash = hash);
	}

	generateJwt() {
		const expiry = new Date();
		expiry.setDate(expiry.getDate() + 2);

		return jwt.sign(
			{
				id: this._id,
				courriel: this.courriel,
				exp: parseInt(expiry.getTime() / 1000, 10)
			},
			Config.getConfig().jwtSecret
		);
	}

	toAuthJson() {
		return {
			_id: this._id,
			courriel: this.courriel,
			token: this.generateJwt()
		};
	}
}

module.exports = model('User', new User());
