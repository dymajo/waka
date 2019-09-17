import jetbrains.buildServer.configs.kotlin.v2018_2.*
import jetbrains.buildServer.configs.kotlin.v2018_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2018_2.buildSteps.ScriptBuildStep
import jetbrains.buildServer.configs.kotlin.v2018_2.buildSteps.script
import jetbrains.buildServer.configs.kotlin.v2018_2.triggers.vcs

version = "2019.1"

project {
    params {
        param("teamcity.ui.settings.readOnly", "true")
    }

    sequence {
        build(Build)
    }
}


object Build : BuildType({
    name = "Build & Publish"

    steps {
        script {
            name = "Docker Build"
            scriptContent = "docker build -t dymajo/waka-importer:latest ./"
        }
        script {
            name = "Docker Tag"
            scriptContent = """
                docker tag dymajo/waka-importer:latest dymajo/waka-importer:%build.vcs.number%
            """.trim()
        }
        script {
            name = "Docker Push"
            scriptContent = """
                docker login -u %docker-username% -p "%docker-password%"
                docker push dymajo/waka-importer:latest 
                docker push dymajo/waka-importer:%build.vcs.number%
            """.trim()
        }
    }

    vcs {
        root(DslContext.settingsRoot.id!!)
        cleanCheckout = true
    }

    triggers {
        vcs {
            branchFilter = "+:*"
        }
    }
})
