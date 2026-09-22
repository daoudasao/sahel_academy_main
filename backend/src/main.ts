import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { appOrigins } from './auth/auth';
import basicAuth from 'express-basic-auth';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');
  const isProd = process.env.NODE_ENV === 'production';

  // L'API tourne derrière des proxys (Cloudflare + Render) : on fait confiance
  // à X-Forwarded-* pour retrouver l'adresse et le protocole du client.
  app.set('trust proxy', true);

  // ─── En-têtes de sécurité ───
  app.use(
    helmet({
      // API JSON : la CSP par défaut casserait l'interface Swagger.
      contentSecurityPolicy: false,
      // Les réponses sont lues par des frontends hébergés sur d'autres domaines.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // Laisse fonctionner les fenêtres de connexion Google.
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    }),
  );

  // ─── CORS ───
  app.enableCors({
    origin: appOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    // better-auth (plugin bearer) renvoie le token de session dans cet en-tete ;
    // le navigateur ne peut le lire que s'il est explicitement expose.
    exposedHeaders: ['set-auth-token'],
  });
  logger.log(`Origines autorisées : ${appOrigins.join(', ') || '(aucune)'}`);

  // ─── Global Prefix ───
  app.setGlobalPrefix('api/v1');

  // ─── Validation ───
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // strip unknown props
      forbidNonWhitelisted: true,
      transform: true,          // auto-transform payloads to DTOs
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── Swagger ───
  // Protégé par mot de passe. Sans identifiants configurés, il n'est exposé
  // qu'en développement.
  const swaggerUser = process.env.SWAGGER_USER;
  const swaggerPassword = process.env.SWAGGER_PASSWORD;
  const swaggerProtege = !!swaggerUser && !!swaggerPassword;

  if (swaggerProtege || !isProd) {
    const config = new DocumentBuilder()
      .setTitle('Sahel Academy API')
      .setDescription('Documentation de l\'API backend de Sahel Academy')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addTag('auth', 'Authentification')
      .addTag('users', 'Utilisateurs')
      .addTag('departements', 'Départements')
      .addTag('centres', 'Centres')
      .addTag('formations', 'Formations')
      .addTag('formateurs', 'Formateurs & Salaires')
      .addTag('bourses', 'Bourses & Candidatures')
      .addTag('paiements', 'Paiements & Échéances')
      .addTag('actualites', 'Actualités')
      .addTag('notifications', 'Notifications')
      .addTag('classes', 'Classes (messages & documents)')
      .addTag('support', 'Chat support')
      .addTag('upload', 'Upload Fichiers (Bunny.net)')
      .build();

    const document = SwaggerModule.createDocument(app, config);

    if (swaggerProtege) {
      app.use(
        ['/api/docs', '/api/docs-json'],
        basicAuth({
          challenge: true,
          users: { [swaggerUser]: swaggerPassword },
        }),
      );
    } else {
      logger.warn('Swagger sans mot de passe (développement uniquement).');
    }

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  } else {
    logger.warn('Swagger désactivé : SWAGGER_USER / SWAGGER_PASSWORD non définis.');
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  logger.log(`🚀 Sahel Academy API : http://localhost:${port}/api/v1`);
}

bootstrap();
