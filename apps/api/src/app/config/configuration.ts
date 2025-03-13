import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  NOTIFICATION_PROVIDER: Joi.string().valid('sns', 'sqs').required(),
  AWS_REGION: Joi.string().required(),
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  AWS_ENDPOINT: Joi.string().optional(),
  SNS_TOPIC_APPLICATION_UPDATE: Joi.string().required(),
  SNS_TOPIC_APPLICATION_CREATE: Joi.string().required(),
  SNS_TOPIC_USER_UPDATE: Joi.string().required(),
});

export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  notificationProvider: process.env.NOTIFICATION_PROVIDER,
  aws: {
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    endpoint: process.env.AWS_ENDPOINT,
  },
  sns: {
    topics: {
      applicationUpdate: process.env.SNS_TOPIC_APPLICATION_UPDATE,
      applicationCreate: process.env.SNS_TOPIC_APPLICATION_CREATE,
      userUpdate: process.env.SNS_TOPIC_USER_UPDATE,
    },
  },
});
