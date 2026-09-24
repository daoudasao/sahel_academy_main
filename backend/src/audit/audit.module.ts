import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditController } from './audit.controller';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';
import { SuperAdminBootstrap } from './super-admin.bootstrap';

/**
 * Journal d'audit. Global : RolesGuard (utilisé dans tous les modules) s'en
 * sert pour tracer les tentatives refusées.
 */
@Global()
@Module({
  controllers: [AuditController],
  providers: [
    AuditService,
    SuperAdminBootstrap,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AuditService],
})
export class AuditModule {}
