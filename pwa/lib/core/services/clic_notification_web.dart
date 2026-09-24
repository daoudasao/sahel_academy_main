// Point d'entrée multiplateforme : écoute des clics sur les notifications
// signalés par le service worker web (no-op sur mobile / desktop).
export 'clic_notification_web_stub.dart'
    if (dart.library.js_interop) 'clic_notification_web_impl.dart';
