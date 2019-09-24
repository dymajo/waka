import jetbrains.buildServer.configs.kotlin.v2018_2.*
import jetbrains.buildServer.configs.kotlin.v2018_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2018_2.buildFeatures.PullRequests
import jetbrains.buildServer.configs.kotlin.v2018_2.buildFeatures.commitStatusPublisher
import jetbrains.buildServer.configs.kotlin.v2018_2.buildFeatures.pullRequests
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
            name = "Install AWS CLI & Upload Assets to S3"
            scriptContent = """
                apk add --no-cache curl python
                curl "https://s3.amazonaws.com/aws-cli/awscli-bundle.zip" -o "awscli-bundle.zip"
                unzip awscli-bundle.zip
                ./awscli-bundle/install -b ./aws
                ./aws s3 sync dist s3://test-assets-us-west-2.waka.app
            """.trim()
            dockerImage = "alpine:latest"
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

    features {
        commitStatusPublisher {
            vcsRootExtId = DslContext.settingsRoot.id!!.value
            publisher = github {
                githubUrl = "https://api.github.com"
                authType = personalToken {
                    token = "%github.commit_status_publisher_token%"
                }
            }
        }
        pullRequests {
            provider = github {
                authType = vcsRoot()
                // Only run pull requests for authors who are members or colloborators
                filterAuthorRole = PullRequests.GitHubRoleFilter.MEMBER_OR_COLLABORATOR
            }
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

    features {
        commitStatusPublisher {
            vcsRootExtId = DslContext.settingsRoot.id!!.value
            publisher = github {
                githubUrl = "https://api.github.com"
                authType = personalToken {
                    token = "%github.commit_status_publisher_token%"
                }
            }
        }
        pullRequests {
            provider = github {
                authType = vcsRoot()
                // Only run pull requests for authors who are members or colloborators
                filterAuthorRole = PullRequests.GitHubRoleFilter.MEMBER_OR_COLLABORATOR
            }
        }
    }
})
