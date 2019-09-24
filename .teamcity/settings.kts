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
        build(BuildDocker)
        build(DeployProduction)
    }
}


object Build : BuildType({
    name = "Build & Deploy JS to Test"

    steps {
        step {
            name = "Install Node JS"
            type = "jonnyzzz.nvm"
            param("version", "10.16.3")
        }
        script {
            name = "Restore Packages"
            scriptContent = "npm ci"
        }
        script {
            name = "Build"
            scriptContent = "npm run build"
        }
        script {
            name = "Install AWS CLI"
            scriptContent = """
                apt update
                apt install -y unzip  
                curl "https://s3.amazonaws.com/aws-cli/awscli-bundle.zip" -o "awscli-bundle.zip"
                unzip awscli-bundle.zip
                ./awscli-bundle/install -b ~/bin/aws
            """.trim()
        }
        script {
            name = "Upload assets to S3"
            scriptContent = "~/bin/aws s3 sync dist s3://test-assets-us-west-2.waka.app"
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

object BuildDocker : BuildType({
    name = "Build & Publish BFF"

    steps {
        script {
            name = "Docker Build"
            scriptContent = "docker build -t dymajo/waka:latest ./"
        }
        script {
            name = "Docker Tag"
            scriptContent = """
                docker tag dymajo/waka:latest dymajo/waka:%build.vcs.number%
            """.trim()
        }
        script {
            name = "Docker Push"
            scriptContent = """
                docker login -u %docker-username% -p "%docker-password%"
                docker push dymajo/waka:latest 
                docker push dymajo/waka:%build.vcs.number%
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


object DeployProduction : BuildType({
    name = "Deploy to Production"

    steps {
        script {
            name = "Run Terraform"
            scriptContent = "aws sts get-caller-identity"
        }
    }

    vcs {
        root(DslContext.settingsRoot.id!!)
        cleanCheckout = true
    }
})

