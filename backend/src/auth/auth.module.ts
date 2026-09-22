import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { OAuthWebController } from './oauth-web.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OAuthWebController, AuthController],
})
export class AuthModule {}
