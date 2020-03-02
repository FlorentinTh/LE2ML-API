import { Schema, model } from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Config from '@Config';

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
				email: {
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
		user.methods.isAuthenticated = this.isAuthenticated;
	}

	async setPassword(password) {
		const salt = await bcrypt.genSalt(10);
		const hash = await bcrypt.hash(password, salt);
		this.salt = salt;
		this.hash = hash;
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
			uid: this._id,
			token: token
		};
	}
}

module.exports = model('User', new User());
