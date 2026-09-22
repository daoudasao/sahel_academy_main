import 'package:intl/intl.dart';

final NumberFormat _decimal = NumberFormat.decimalPattern('fr_FR');

/// Formate un montant en francs CFA. Ex : 15000 -> "15 000 FCFA".
String formatFcfa(num montant) => '${_decimal.format(montant)} FCFA';

/// Formate une date complète. Ex : "20 août 2026".
String formatDate(DateTime date) => DateFormat('d MMM yyyy', 'fr_FR').format(date);

/// Créneau court pour une puce. Ex : "lun. 8 sept. · 09:00".
String formatCreneau(DateTime d) =>
    '${DateFormat('EEE d MMM', 'fr_FR').format(d)} · '
    '${DateFormat('HH:mm', 'fr_FR').format(d)}';

/// Créneau complet. Ex : "lundi 8 septembre à 09h00".
String formatCreneauLong(DateTime d) =>
    DateFormat("EEEE d MMMM 'à' HH'h'mm", 'fr_FR').format(d);

/// Renvoie une durée relative lisible. Ex : "il y a 2 h", "à l'instant".
String tempsEcoule(DateTime date) {
  final diff = DateTime.now().difference(date);
  if (diff.inMinutes < 1) return "à l'instant";
  if (diff.inHours < 1) return 'il y a ${diff.inMinutes} min';
  if (diff.inDays < 1) return 'il y a ${diff.inHours} h';
  if (diff.inDays < 7) return 'il y a ${diff.inDays} j';
  return DateFormat('d MMM', 'fr_FR').format(date);
}
