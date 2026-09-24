import 'package:flutter_test/flutter_test.dart';
import 'package:sahel_academy/models/notification_item.dart';

NotificationItem notif(Map<String, dynamic> j) =>
    NotificationItem.fromJson({'id': 'n1', 'titre': '', 'message': '', ...j});

void main() {
  group('route fournie par le serveur', () {
    test('est utilisée telle quelle', () {
      expect(
        notif({'type': 'actualite', 'route': '/post/p1'}).route,
        '/post/p1',
      );
      expect(
        notif({
          'type': 'systeme',
          'cible': 'support',
          'route': '/support',
        }).route,
        '/support',
      );
    });
    test('un lien externe ou suspect est ignoré', () {
      expect(NotificationItem.routeServeur('https://evil.example'), isNull);
      expect(NotificationItem.routeServeur('//evil.example'), isNull);
      expect(NotificationItem.routeServeur('/post/p1?x=1'), isNull);
      expect(NotificationItem.routeServeur(null), isNull);
    });
  });

  group('anciennes notifications (sans route)', () {
    test('message du support', () {
      expect(
        notif({
          'type': 'systeme',
          'cible': 'support',
          'titre': 'Nouveau message du Support',
        }).route,
        '/support',
      );
    });
    test('résultat de bourse (type classe, cible bourse)', () {
      expect(
        notif({'type': 'classe', 'cible': 'bourse', 'cibleId': 'b1'}).route,
        '/bourse/b1/resultat',
      );
    });
    test('bourse ouverte (type actualité, globale, avec id)', () {
      expect(
        notif({'type': 'actualite', 'cible': 'global', 'cibleId': 'b1'}).route,
        '/bourse/b1',
      );
    });
    test('actualité sans id → fil', () {
      expect(
        notif({'type': 'actualite', 'cible': 'global'}).route,
        '/actualite',
      );
    });
    test('inscription validée → classe', () {
      expect(
        notif({'type': 'classe', 'cible': 'classe', 'cibleId': 'f1'}).route,
        '/classe/f1',
      );
    });
    test('paiement', () {
      expect(
        notif({'type': 'paiement', 'cible': 'paiement', 'cibleId': 'e1'}).route,
        '/paiements',
      );
    });
    test('message individuel du dashboard : pas de fausse fiche formation', () {
      expect(
        notif({
          'type': 'systeme',
          'cible': 'individuel',
          'cibleId': 'u1',
          'titre': 'Rappel',
        }).route,
        isNull,
      );
    });
  });
}
