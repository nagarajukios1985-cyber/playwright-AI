pipeline {
    agent any

    environment {
        PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
    }

    stages {
        stage('Debug Playwright') {
            steps {
                sh 'pwd'
                sh 'ls -la'
                sh 'find . -name "*.js"'
                sh 'find . -name "*.ts"'
                sh 'cat package.json'
                sh 'npx playwright --version'
            }
        }

        stage('Checkout Repository') {
            steps {
                git branch: 'main', url: 'https://github.com/nagarajukios1985-cyber/playwright-AI.git'
            }
        }

        stage('Check Node Environment') {
            steps {
                sh 'which node'
                sh 'node -v'
                sh 'npm -v'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Install Playwright Browsers') {
            steps {
                sh 'npx playwright install'
            }
        }

        stage('Run Tests') {
            steps {
                sh 'npx playwright test'
            }
        }

        stage('Generate Custom Report') {
            steps {
                sh 'node ArtifactHtmlReporter.js'
            }
        }

        stage('Archive Reports') {
            steps {
                archiveArtifacts artifacts: 'artifacts/**'
            }
        }
    }
}
