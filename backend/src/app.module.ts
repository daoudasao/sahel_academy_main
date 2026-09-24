import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ClientIpThrottlerGuard } from './common/client-ip-throttler.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { DepartementsModule } from './departements/departements.module';
import { CentresModule } from './centres/centres.module';
import { FormationsModule } from './formations/formations.module';
import { FormateursModule } from './formateurs/formateurs.module';
import { BoursesModule } from './bourses/bourses.module';
import { PaiementsModule } from './paiements/paiements.module';
import { ActualitesModule } from './actualites/actualites.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UploadModule } from './upload/upload.module';
import { ClassesModule } from './classes/classes.module';
import { SupportModule } from './support/support.module';
import { EspaceFormateurModule } from './espace-formateur/espace-formateur.module';
import { FirebaseModule } from './firebase/firebase.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Limite globale volontairement large : beaucoup d'élèves partagent la
    // même adresse IP (Wi-Fi d'un centre). Les routes sensibles ont leur
    // propre limite plus stricte (@Throttle).
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 600 },
      {
        // Connexion, inscription… : limite dédiée, uniquement sur ces écritures
        // (la lecture de session, appelée à chaque ouverture d'app, reste libre).
        name: 'auth',
        ttl: 60_000,
        limit: 60,
        skipIf: (context) => {
          const req = context.switchToHttp().getRequest<{
            method?: string;
            originalUrl?: string;
          }>();
          return !(
            req?.method === 'POST' &&
            (req.originalUrl ?? '').startsWith('/api/v1/auth/')
          );
        },
      },
    ]),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    DepartementsModule,
    CentresModule,
    FormationsModule,
    FormateursModule,
    BoursesModule,
    PaiementsModule,
    ActualitesModule,
    NotificationsModule,
    UploadModule,
    ClassesModule,
    SupportModule,
    EspaceFormateurModule,
    FirebaseModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ClientIpThrottlerGuard },
  ],
})
export class AppModule {}
