import express from 'express';
import swaggerUI from 'swagger-ui-express';

import validation from './auth.validation';
import AuthController from './auth.controller';
import DocumentationBuilder from '../../../doc/doc.builder';

const router = express.Router();

router.route('/register').put(validation.register, AuthController.register);
router.route('/login').post(validation.login, AuthController.login);

const documentationBuilder = new DocumentationBuilder('v1');
const documentationFile = documentationBuilder.build();
router.use('/api-doc', swaggerUI.serve, swaggerUI.setup(documentationFile));

export default router;
