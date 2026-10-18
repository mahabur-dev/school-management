import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableShutdownHooks();
  configureApp(app);

  const config = app.get(ConfigService);
  if (!config.getOrThrow<boolean>('app.isProduction')) {
    setupSwagger(app, config.getOrThrow<string>('app.name'));
  }

  const port = config.getOrThrow<number>('app.port');
  await app.listen(port, '0.0.0.0');
  console.log(`API running on http://localhost:${port}`);
}

void bootstrap();
