import Joi from '@hapi/joi';
import dotenv from 'dotenv';

dotenv.config();

const envValidation = Joi.object({
	NODE_ENV: Joi.string()
		.allow(['development', 'production'])
		.default('development'),
	PORT: Joi.number().default(3000),
	JWT_SECRET: Joi.string().required(),
	MONGO_HOST: Joi.string().required(),
	MONGO_PORT: Joi.number()
		.required()
		.default(27017),
	MONGO_DB: Joi.string().required(),
	MONGO_USER: Joi.string().required(),
	MONGO_PASSWORD: Joi.string().required()
})
	.unknown()
	.required();

const { error, value: env } = Joi.validate(process.env, envValidation);

if (error) {
	throw new Error(`Config validation error: ${error.message}`);
}

const config = {
	env: env.NODE_ENV,
	port: env.PORT,
	jwtSecret: env.JWT_SECRET,
	mongo: {
		host: env.MONGO_HOST,
		port: env.MONGO_PORT,
		db: env.MONGO_DB,
		user: env.MONGO_USER,
		password: env.MONGO_PASSWORD
	}
};

module.exports = config;
