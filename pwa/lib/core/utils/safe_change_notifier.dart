import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

/// Mixin pour [ChangeNotifier] permettant de reporter en toute sécurité les notifications
/// de changement si elles ont lieu pendant la phase de build de Flutter (par exemple dans `initState`).
/// Cela prévient l'erreur "setState() or markNeedsBuild() called during build".
mixin SafeChangeNotifier on ChangeNotifier {
  bool _disposed = false;

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }

  @override
  void notifyListeners() {
    if (_disposed) return;

    final binding = WidgetsBinding.instance;
    if (binding.schedulerPhase == SchedulerPhase.persistentCallbacks) {
      binding.addPostFrameCallback((_) {
        if (!_disposed) {
          super.notifyListeners();
        }
      });
    } else {
      super.notifyListeners();
    }
  }
}
