import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Palette de couleurs de la marque Sahel Academy (vert + jaune, comme le logo).
class AppColors {
  // Couleur principale : vert.
  static const emerald = Color(0xFF0A2D26);
  static const emeraldDark = Color(0xFF08221C);
  static const emeraldContainer = Color(0xFFDCFCE7);

  // Couleur secondaire : jaune.
  static const jaune = Color(0xFFEAB308);
  static const jauneFonce = Color(0xFFCA8A04);
  static const jauneContainer = Color(0xFFFEF9C3);

  // Alias historiques : l'accent est désormais jaune.
  static const amber = jaune;
  static const amberContainer = jauneContainer;

  // Neutres.
  static const background = Color(0xFFF5F8F2);
  static const surface = Colors.white;
  static const ink = Color(0xFF0F172A); // texte principal
}

/// Thème global de l'application.
class AppTheme {
  static ThemeData get light {
    final base = ColorScheme.fromSeed(
      seedColor: AppColors.emerald,
      brightness: Brightness.light,
    );

    final scheme = base.copyWith(
      primary: AppColors.emerald,
      onPrimary: Colors.white,
      primaryContainer: AppColors.emeraldContainer,
      onPrimaryContainer: AppColors.emeraldDark,
      tertiary: AppColors.jaune,
      onTertiary: const Color(0xFF3A2E00),
      tertiaryContainer: AppColors.jauneContainer,
      onTertiaryContainer: const Color(0xFF713F12),
      surface: AppColors.surface,
      onSurface: AppColors.ink,
    );

    final textTheme =
        GoogleFonts.plusJakartaSansTextTheme().apply(bodyColor: AppColors.ink);

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      textTheme: textTheme,
      scaffoldBackgroundColor: AppColors.background,

      appBarTheme: AppBarTheme(
        centerTitle: false,
        backgroundColor: AppColors.background,
        foregroundColor: scheme.onSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleTextStyle: GoogleFonts.plusJakartaSans(
          color: scheme.onSurface,
          fontSize: 24,
          fontWeight: FontWeight.w800,
        ),
      ),

      cardTheme: CardThemeData(
        elevation: 0,
        color: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(22),
          side: BorderSide(color: scheme.outlineVariant.withValues(alpha: 0.7)),
        ),
        clipBehavior: Clip.antiAlias,
      ),

      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(0, 52),
          textStyle: GoogleFonts.plusJakartaSans(
            fontWeight: FontWeight.w700,
            fontSize: 15,
          ),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),

      chipTheme: ChipThemeData(
        side: BorderSide.none,
        backgroundColor: scheme.surfaceContainerHighest,
        selectedColor: scheme.primary,
        showCheckmark: false,
        labelStyle: GoogleFonts.plusJakartaSans(
          color: AppColors.ink,
          fontWeight: FontWeight.w600,
          fontSize: 13,
        ),
        secondaryLabelStyle: GoogleFonts.plusJakartaSans(
          color: Colors.white,
          fontWeight: FontWeight.w600,
          fontSize: 13,
        ),
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      ),

      navigationBarTheme: NavigationBarThemeData(
        height: 70,
        backgroundColor: AppColors.surface,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        indicatorColor: scheme.primaryContainer,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return GoogleFonts.plusJakartaSans(
            fontSize: 12,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? scheme.primary : scheme.onSurfaceVariant,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color:
                selected ? scheme.onPrimaryContainer : scheme.onSurfaceVariant,
          );
        }),
      ),

      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: AppColors.emeraldDark,
        contentTextStyle: GoogleFonts.plusJakartaSans(
          color: Colors.white,
          fontWeight: FontWeight.w600,
        ),
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),

      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        prefixIconColor: scheme.outline,
        labelStyle: TextStyle(color: scheme.outline),
        floatingLabelStyle: TextStyle(color: scheme.primary),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: scheme.outlineVariant),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: scheme.outlineVariant),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: scheme.primary, width: 1.6),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: scheme.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: scheme.error, width: 1.6),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(0, 52),
          foregroundColor: scheme.onSurface,
          side: BorderSide(color: scheme.outlineVariant),
          textStyle: GoogleFonts.plusJakartaSans(
            fontWeight: FontWeight.w700,
            fontSize: 15,
          ),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: scheme.primary,
          textStyle: GoogleFonts.plusJakartaSans(
            fontWeight: FontWeight.w700,
            fontSize: 14,
          ),
        ),
      ),

      dividerTheme: DividerThemeData(
        color: scheme.outlineVariant.withValues(alpha: 0.6),
        thickness: 1,
      ),
    );
  }
}
