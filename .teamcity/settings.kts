import jetbrains.buildServer.configs.kotlin.v2018_2.*
import jetbrains.buildServer.configs.kotlin.v2018_2.buildSteps.script
import jetbrains.buildServer.configs.kotlin.v2018_2.triggers.vcs

version = "2019.1"

project {
    params {
        param("teamcity.ui.settings.readOnly", "true")
    }

    sequence {
        build(Build)
        build(DeployUat)
        build(DeployProduction)
    }
}


object Build : BuildType({
    name = "Build"

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
            scriptContent = "aws sts get-caller-identity"
        }
    }

    vcs {
        root(DslContext.settingsRoot.id!!)
        cleanCheckout = true
    }
})

object DeployUat : BuildType({
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

