/// Représente l'utilisateur connecté à l'application.
class AppUser {
  final String id;
  final String nom;
  final String email;
  final String telephone;
  final String? avatarUrl;
  final String role;

  const AppUser({
    required this.id,
    required this.nom,
    required this.email,
    required this.telephone,
    this.avatarUrl,
    this.role = 'ETUDIANT',
  });

  /// Le prénom (premier mot du nom complet).
  String get prenom => nom.trim().split(RegExp(r'\s+')).first;

  /// Indique si l'utilisateur connecté est un formateur.
  bool get estFormateur => role.toUpperCase() == 'FORMATEUR';

  Map<String, dynamic> toJson() => {
        'id': id,
        'nom': nom,
        'email': email,
        'telephone': telephone,
        'avatarUrl': avatarUrl,
        'role': role,
      };

  AppUser copyWith({
    String? id,
    String? nom,
    String? email,
    String? telephone,
    String? avatarUrl,
    String? role,
  }) {
    return AppUser(
      id: id ?? this.id,
      nom: nom ?? this.nom,
      email: email ?? this.email,
      telephone: telephone ?? this.telephone,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      role: role ?? this.role,
    );
  }

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: (json['id'] ?? '').toString(),
      nom: (json['nom'] ?? json['name'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      telephone: (json['telephone'] ?? '').toString(),
      avatarUrl: json['avatarUrl']?.toString() ?? json['image']?.toString(),
      role: (json['role'] ?? 'ETUDIANT').toString(),
    );
  }
}
