import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreModule } from '@notification-service/core';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthModule } from './health/health.module';
import configuration, { validationSchema } from './config/configuration';

/**
 * Main application module
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    CoreModule,
    NotificationsModule,
    HealthModule,
  ],
})
export class AppModule {}
