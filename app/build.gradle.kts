plugins {
    id("com.android.application")
}

android {
    namespace = "app.glasshome.launcher"
    compileSdk = 34

    defaultConfig {
        applicationId = "app.glasshome.launcher"
        minSdk = 28
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // Personal sideload build: signed with the local debug key.
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
