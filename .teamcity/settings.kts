import jetbrains.buildServer.configs.kotlin.v2018_2.*
import jetbrains.buildServer.configs.kotlin.v2018_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2018_2.buildSteps.ScriptBuildStep
import jetbrains.buildServer.configs.kotlin.v2018_2.buildSteps.script
import jetbrains.buildServer.configs.kotlin.v2018_2.triggers.vcs

version = "2019.1"

project {
    params {
        //param("teamcity.ui.settings.readOnly", "true")
    }

    sequence {
        build(Build)
        build(DeployUat)
        build(DeployProduction)
    }
}


object Build : BuildType({
    name = "Build & Publish"

    steps {
        script {
            name = "Docker Build - waka-go-proxy"
            scriptContent = "docker build -t waka-server:proxy -f src/waka-go-proxy/Dockerfile ./"
        }
        script {
            name = "Docker Build - waka-orchestrator"
            scriptContent = "docker build -t waka-server:orchestrator -f src/waka-orchestrator/Dockerfile ./"
        }
        script {
            name = "Docker Build - waka-realtime"
            scriptContent = "docker build -t waka-server:realtime -f src/waka-realtime/Dockerfile ./"
        }
        script {
            name = "Docker Build - waka-worker"
            scriptContent = "docker build -t waka-server:worker -f src/waka-worker/Dockerfile ./"
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

object DeployUat : BuildType({
    name = "Deploy to UAT"

    steps {
        script {
            name = "Run Terraform"
            scriptContent = "terraform version"
        }
    }

    vcs {
        root(DslContext.settingsRoot.id!!)
        cleanCheckout = true
    }
})

object DeployProduction : BuildType({
    name = "Deploy to Production"

    steps {
        script {
            name = "Run Terraform"
            scriptContent = "terraform version"
        }
    }

    vcs {
        root(DslContext.settingsRoot.id!!)
        cleanCheckout = true
    }
})
