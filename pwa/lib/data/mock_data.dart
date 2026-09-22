import '../models/action_post.dart';
import '../models/classe_message.dart';
import '../models/departement.dart';
import '../models/formation.dart';
import '../models/post.dart';

/// Fausses données utilisées tant que le backend NestJS n'est pas prêt.
///
/// Quand l'API sera disponible, ce fichier sera remplacé par de vrais appels
/// réseau (dans les repositories) — SANS toucher aux écrans.
class MockData {
  static const List<Departement> departements = [
    Departement(
      id: 'info',
      nom: 'Informatique',
      description: 'Développement, réseaux, bureautique',
      nombreFormations: 4,
    ),
    Departement(
      id: 'compta',
      nom: 'Comptabilité',
      description: 'Gestion, finance, fiscalité',
      nombreFormations: 2,
    ),
    Departement(
      id: 'langues',
      nom: 'Langues',
      description: 'Anglais, arabe, français',
      nombreFormations: 2,
    ),
    Departement(
      id: 'marketing',
      nom: 'Marketing',
      description: 'Marketing digital, community management',
      nombreFormations: 2,
    ),
  ];

  static final List<Formation> formations = [
    Formation(
      id: 'f1',
      titre: 'Développement Web (HTML, CSS, JS)',
      description:
          'Apprenez à créer des sites web modernes de A à Z : structure HTML, '
          'mise en forme CSS et interactivité avec JavaScript.',
      departementId: 'info',
      formateurNom: 'M. Diallo',
      prixInscription: 10000,
      prixMensualite: 15000,
      dureeMois: 4,
      niveau: 'Débutant',
    ),
    Formation(
      id: 'f2',
      titre: 'Bureautique (Word, Excel, PowerPoint)',
      description:
          'Maîtrisez les outils bureautiques indispensables en entreprise.',
      departementId: 'info',
      formateurNom: 'Mme Bâ',
      prixInscription: 5000,
      prixMensualite: 10000,
      dureeMois: 2,
      niveau: 'Débutant',
    ),
    Formation(
      id: 'f3',
      titre: 'Réseaux & Maintenance informatique',
      description:
          'Installation, configuration et dépannage de réseaux et de postes.',
      departementId: 'info',
      formateurNom: 'M. Traoré',
      prixInscription: 10000,
      prixMensualite: 20000,
      dureeMois: 5,
      niveau: 'Intermédiaire',
    ),
    Formation(
      id: 'f4',
      titre: 'Python & Data (Bourse)',
      description:
          'Programmation Python et introduction à l\'analyse de données.',
      departementId: 'info',
      formateurNom: 'M. Diallo',
      prixInscription: 0,
      prixMensualite: 0,
      dureeMois: 3,
      niveau: 'Intermédiaire',
      estBourse: true,
      datePublication: DateTime(2026, 8, 10),
      dateLimite: DateTime(2026, 8, 30),
    ),
    Formation(
      id: 'f5',
      titre: 'Comptabilité générale',
      description: 'Les bases de la comptabilité et de la tenue des comptes.',
      departementId: 'compta',
      formateurNom: 'M. Sow',
      prixInscription: 8000,
      prixMensualite: 12000,
      dureeMois: 4,
      niveau: 'Débutant',
    ),
    Formation(
      id: 'f6',
      titre: 'Gestion & Fiscalité',
      description: 'Gestion d\'entreprise, déclarations et fiscalité.',
      departementId: 'compta',
      formateurNom: 'Mme Camara',
      prixInscription: 10000,
      prixMensualite: 15000,
      dureeMois: 3,
      niveau: 'Avancé',
    ),
    Formation(
      id: 'f7',
      titre: 'Anglais professionnel',
      description: 'Communiquer avec aisance en anglais dans un cadre pro.',
      departementId: 'langues',
      formateurNom: 'Mr. Johnson',
      prixInscription: 5000,
      prixMensualite: 8000,
      dureeMois: 6,
      niveau: 'Débutant',
    ),
    Formation(
      id: 'f8',
      titre: 'Arabe',
      description: 'Lecture, écriture et expression en langue arabe.',
      departementId: 'langues',
      formateurNom: 'M. Haidara',
      prixInscription: 5000,
      prixMensualite: 8000,
      dureeMois: 6,
      niveau: 'Débutant',
    ),
    Formation(
      id: 'f9',
      titre: 'Marketing digital (Bourse)',
      description:
          'Publicité en ligne, réseaux sociaux et stratégie digitale.',
      departementId: 'marketing',
      formateurNom: 'Mme Ndiaye',
      prixInscription: 0,
      prixMensualite: 0,
      dureeMois: 2,
      niveau: 'Débutant',
      estBourse: true,
      datePublication: DateTime(2026, 8, 10),
      dateLimite: DateTime(2026, 8, 30),
    ),
    Formation(
      id: 'f10',
      titre: 'Community Management',
      description: 'Animer et développer une communauté sur les réseaux.',
      departementId: 'marketing',
      formateurNom: 'M. Fall',
      prixInscription: 5000,
      prixMensualite: 10000,
      dureeMois: 2,
      niveau: 'Débutant',
    ),
  ];

  static final List<Post> posts = [
    Post(
      id: 'p0',
      auteurNom: 'Sahel Academy',
      auteurRole: 'Admin',
      contenu:
          '📊 Les résultats de la session de septembre sont disponibles !\n'
          'Clique sur le bouton ci-dessous pour vérifier ton statut.',
      date: _ilYA(hours: 1),
      likes: 12,
      actions: const [
        ActionPost(
          label: 'Vérifier mon statut',
          route: '/resultats/sept-2026',
          icone: 'verifier',
        ),
      ],
    ),
    Post(
      id: 'p1',
      auteurNom: 'Sahel Academy',
      auteurRole: 'Admin',
      contenu:
          'Bienvenue sur la nouvelle application de Sahel Academy ! 🎉\n'
          'Fini les groupes WhatsApp : retrouvez ici toutes les infos, '
          'formations et documents au même endroit.',
      date: _ilYA(hours: 3),
      likes: 24,
      commentaires: [
        Commentaire(
          id: 'k1',
          auteurNom: 'Fatou Sow',
          auteurRole: 'Élève',
          contenu: 'Enfin ! C\'était compliqué sur WhatsApp 😅',
          date: _ilYA(hours: 2),
          reponses: [
            Commentaire(
              id: 'k1r1',
              auteurNom: 'Sahel Academy',
              auteurRole: 'Admin',
              contenu: 'Merci Fatou ! 🙌',
              date: _ilYA(hours: 2),
            ),
          ],
        ),
        Commentaire(
          id: 'k2',
          auteurNom: 'Amadou Traoré',
          auteurRole: 'Élève',
          contenu: 'Super initiative 👍',
          date: _ilYA(hours: 2),
        ),
      ],
    ),
    Post(
      id: 'p2',
      auteurNom: 'Sahel Academy',
      auteurRole: 'Admin',
      contenu:
          '📢 Les inscriptions pour la session de septembre sont ouvertes !\n'
          'Places limitées pour la formation Développement Web.\n'
          'Toutes les infos ici : https://sahel-academy.org/inscriptions',
      date: _ilYA(days: 1),
      likes: 42,
      documentNom: 'Calendrier_session_septembre.pdf',
      actions: const [
        ActionPost(
          label: 'Voir la formation Développement Web',
          route: '/formation/f1',
          icone: 'formation',
        ),
      ],
      commentaires: [
        Commentaire(
          id: 'k3',
          auteurNom: 'Aïcha Diop',
          auteurRole: 'Élève',
          contenu: 'Je me suis inscrite, hâte de commencer !',
          date: _ilYA(hours: 22),
        ),
        Commentaire(
          id: 'k4',
          auteurNom: 'Moussa Koné',
          auteurRole: 'Élève',
          contenu: 'Le lien marche bien, merci 👌 https://sahel-academy.org',
          date: _ilYA(hours: 20),
        ),
      ],
    ),
    Post(
      id: 'p3',
      auteurNom: 'M. Diallo',
      auteurRole: 'Formateur',
      contenu:
          'Support du cours d\'introduction à HTML disponible ci-dessous.\n'
          'Pour approfondir : https://developer.mozilla.org/fr/docs/Web/HTML 📚',
      date: _ilYA(days: 3),
      likes: 18,
      documentNom: 'Cours_HTML_intro.pdf',
      commentaires: [
        Commentaire(
          id: 'k5',
          auteurNom: 'Fatou Sow',
          auteurRole: 'Élève',
          contenu: 'Merci monsieur 🙏',
          date: _ilYA(days: 2),
        ),
      ],
    ),
    Post(
      id: 'p4',
      auteurNom: 'Sahel Academy',
      auteurRole: 'Admin',
      contenu:
          '🎓 2 nouvelles bourses de formation disponibles en Python et '
          'Marketing digital. Candidatez avant le 30 août !',
      date: _ilYA(days: 5),
      likes: 56,
      actions: const [
        ActionPost(
          label: 'Voir les bourses',
          route: '/bourses',
          icone: 'bourse',
        ),
      ],
    ),
  ];

  static DateTime _ilYA({int days = 0, int hours = 0}) =>
      DateTime.now().subtract(Duration(days: days, hours: hours));
}
