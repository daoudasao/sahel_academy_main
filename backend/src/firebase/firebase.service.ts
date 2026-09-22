import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private firebaseApp: admin.app.App | null = null;

  onModuleInit() {
    this.initFirebase();
  }

  private initFirebase() {
    if (admin.apps.length > 0) {
      this.firebaseApp = admin.app();
      return;
    }

    const base64Config =
      process.env.FIREBASE_ADMIN_CREDENTIALS_BASE64 ||
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

    if (base64Config) {
      try {
        const decodedJson = Buffer.from(base64Config, 'base64').toString('utf-8');
        const serviceAccount = JSON.parse(decodedJson);

        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });

        this.logger.log('Firebase Admin SDK initialisé avec succès depuis Base64 (env)');
        return;
      } catch (error) {
        this.logger.error(
          'Erreur lors du décodage du FIREBASE_ADMIN_CREDENTIALS_BASE64:',
          error,
        );
      }
    }

    if (process.env.FIREBASE_ADMIN_CREDENTIALS_PATH) {
      try {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(process.env.FIREBASE_ADMIN_CREDENTIALS_PATH),
        });
        this.logger.log('Firebase Admin SDK initialisé depuis le fichier JSON');
        return;
      } catch (error) {
        this.logger.error('Erreur initialisation Firebase depuis le fichier:', error);
      }
    }

    this.logger.warn(
      'FIREBASE_ADMIN_CREDENTIALS_BASE64 non fourni dans .env. Firebase Admin en mode passif.',
    );
  }

  get messaging(): admin.messaging.Messaging | null {
    if (this.firebaseApp) {
      return admin.messaging(this.firebaseApp);
    }
    return null;
  }

  /// Envoie un message Push FCM à un token d'appareil ou un topic
  async sendPushNotification(
    targetTokenOrTopic: { token?: string; topic?: string },
    notification: { titre: string; message: string; data?: Record<string, string> },
  ) {
    if (!this.messaging) {
      this.logger.warn('FCM non disponible (Firebase Admin non initialisé)');
      return null;
    }

    try {
      let payload: admin.messaging.Message;

      if (targetTokenOrTopic.token) {
        payload = {
          token: targetTokenOrTopic.token,
          notification: {
            title: notification.titre,
            body: notification.message,
          },
          data: notification.data,
        };
      } else if (targetTokenOrTopic.topic) {
        payload = {
          topic: targetTokenOrTopic.topic,
          notification: {
            title: notification.titre,
            body: notification.message,
          },
          data: notification.data,
        };
      } else {
        this.logger.warn('Ni token ni topic fourni pour l’envoi FCM');
        return null;
      }

      const response = await this.messaging.send(payload);
      this.logger.log(`Push notification envoyée via FCM: ${response}`);
      return response;
    } catch (error) {
      this.logger.error('Erreur lors de l’envoi de la notification FCM:', error);
      return null;
    }
  }
}
