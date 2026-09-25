allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

// ─── Plugins passés au Kotlin intégré d'AGP 9 ───
// Ces plugins n'appliquent plus le plugin Kotlin (ils comptent sur le Kotlin
// intégré d'AGP), or ce projet garde `android.builtInKotlin=false` : leurs
// sources Kotlin ne seraient pas compilées (classe du plugin introuvable au
// build release). On leur applique donc le plugin Kotlin nous-mêmes.
// file_picker compile en Java 17 ; in_app_update règle lui-même sa cible (1.8).
val pluginsSansKotlin = setOf("file_picker", "in_app_update")
subprojects {
    if (name in pluginsSansKotlin) {
        pluginManager.withPlugin("com.android.library") {
            apply(plugin = "org.jetbrains.kotlin.android")
            if (name == "file_picker") {
                tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>().configureEach {
                    compilerOptions.jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
                }
            }
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
