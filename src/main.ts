import * as core from '@actions/core'
import * as github from '@actions/github'

type DeploymentState =
  | 'error'
  | 'failure'
  | 'inactive'
  | 'in_progress'
  | 'queued'
  | 'pending'
  | 'success'

async function run() {
  try {
    const context = github.context
    const logUrl = `https://github.com/${context.repo.owner}/${context.repo.repo}/commit/${context.sha}/checks`

    const token = core.getInput('token', {required: true})
    const ref = core.getInput('ref', {required: false}) || context.ref
    const url = core.getInput('target_url', {required: false}) || logUrl
    const environment =
      core.getInput('environment', {required: false}) || 'production'
    const description = core.getInput('description', {required: false})
    const initialStatus =
      (core.getInput('initial_status', {
        required: false
      }) as DeploymentState) || 'pending'
    const autoMergeStringInput = core.getInput('auto_merge', {
      required: false
    })

    const auto_merge: boolean = autoMergeStringInput === 'true'

    const client = github.getOctokit(token, {
      previews: ['flash', 'ant-man']
    })

    const deployment = await client.rest.repos.createDeployment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref,
      required_contexts: [],
      environment,
      transient_environment: true,
      auto_merge,
      description
    })
    if (deployment.status === 201) {
      await client.rest.repos.createDeploymentStatus({
        ...context.repo,
        deployment_id: deployment.data.id,
        state: initialStatus,
        log_url: logUrl,
        environment_url: url
      })

      core.setOutput('deployment_id', deployment.data.id.toString())
    }
  } catch (error) {
    if (error instanceof Error) {
      core.error(error)
      core.setFailed(error.message)
    }
  }
}

run()
