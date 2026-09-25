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

// ─── file_picker 11 + AGP 9 ───
// Sous AGP 9, file_picker n'applique plus le plugin Kotlin (il compte sur le
// Kotlin intégré d'AGP), or ce projet garde `android.builtInKotlin=false` :
// ses sources Kotlin ne seraient pas compilées (FilePickerPlugin introuvable
// au build release). On lui applique donc le plugin Kotlin nous-mêmes.
subprojects {
    if (name == "file_picker") {
        pluginManager.withPlugin("com.android.library") {
            apply(plugin = "org.jetbrains.kotlin.android")
            tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>().configureEach {
                compilerOptions.jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
            }
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
