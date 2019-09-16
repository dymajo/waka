import jetbrains.buildServer.configs.kotlin.v2018_2.*
import jetbrains.buildServer.configs.kotlin.v2018_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2018_2.buildSteps.ScriptBuildStep
import jetbrains.buildServer.configs.kotlin.v2018_2.buildSteps.script
import jetbrains.buildServer.configs.kotlin.v2018_2.triggers.vcs

version = "2019.1"

project {
    params {
        param("teamcity.ui.settings.readOnly", "true")
        param("teamcity.git.fetchAllHeads", "true")
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
            scriptContent = "docker build -t dymajo/waka-server:proxy -f src/waka-go-proxy/Dockerfile ./"
        }
        script {
            name = "Docker Build - waka-orchestrator"
            scriptContent = "docker build -t dymajo/waka-server:orchestrator -f src/waka-orchestrator/Dockerfile ./"
        }
        script {
            name = "Docker Build - waka-realtime"
            scriptContent = "docker build -t dymajo/waka-server:realtime -f src/waka-realtime/Dockerfile ./"
        }
        script {
            name = "Docker Build - waka-worker"
            scriptContent = "docker build -t dymajo/waka-server:worker -f src/waka-worker/Dockerfile ./"
        }
        script {
            name = "Docker Tag"
            scriptContent = """
                docker tag dymajo/waka-server:proxy dymajo/waka-server:proxy-%build.vcs.number%
                docker tag dymajo/waka-server:orchestrator dymajo/waka-server:orchestrator-%build.vcs.number%
                docker tag dymajo/waka-server:realtime dymajo/waka-server:realtime-%build.vcs.number%
                docker tag dymajo/waka-server:worker dymajo/waka-server:worker-%build.vcs.number%
            """.trim()
        }
        script {
            name = "Docker Push"
            scriptContent = """
                docker login -u %docker-username% -p %docker-password%
                docker push dymajo/waka-server:proxy 
                docker push dymajo/waka-server:proxy-%build.vcs.number%
                docker push dymajo/waka-server:orchestrator 
                docker push dymajo/waka-server:orchestrator-%build.vcs.number%
                docker push dymajo/waka-server:realtime 
                docker push dymajo/waka-server:realtime-%build.vcs.number%
                docker push dymajo/waka-server:worker 
                docker push dymajo/waka-server:worker-%build.vcs.number%
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
