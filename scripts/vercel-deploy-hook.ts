import { execSync } from 'child_process';

interface DeploymentEvent {
  type: 'deployment' | 'deployment-ready' | 'deployment-error';
  payload: {
    url: string;
    name: string;
    meta: {
      githubCommitSha: string;
      githubCommitMessage: string;
      githubCommitAuthorName: string;
    };
  };
}

export async function handleDeploymentHook(event: DeploymentEvent) {
  switch (event.type) {
    case 'deployment-ready':
      // デプロイ成功時の処理
      console.log(`Deployment ready: ${event.payload.url}`);
      
      // Lighthouseテストの実行
      if (process.env.RUN_LIGHTHOUSE === 'true') {
        execSync(`lighthouse ${event.payload.url} --output=json --output-path=./lighthouse-report.json`);
      }
      
      // Slackへの通知
      if (process.env.SLACK_WEBHOOK_URL) {
        await notifySlack({
          text: `🚀 Deployment successful!`,
          attachments: [{
            color: 'good',
            fields: [
              { title: 'URL', value: event.payload.url },
              { title: 'Commit', value: event.payload.meta.githubCommitSha.slice(0, 7) },
              { title: 'Message', value: event.payload.meta.githubCommitMessage },
              { title: 'Author', value: event.payload.meta.githubCommitAuthorName },
            ],
          }],
        });
      }
      break;
      
    case 'deployment-error':
      // デプロイエラー時の処理
      console.error(`Deployment failed: ${event.payload.name}`);
      break;
  }
}

async function notifySlack(payload: any) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack notification failed: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
  }
}