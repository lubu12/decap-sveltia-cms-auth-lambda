# Decap and Sveltia CMS Authenticator via AWS Lambda and GitHub
This script allows Decap CMS (previously Netlify CMS) or Sveltia CMS to authenticate with GitHub without using Netlify.

Script has been tested at AWS Lambda (Node v18) environment, however, it can be modified to fit other hosts.

## How to use it
###Step 1: Create a AWS Lambda function with Node v18 environment
See https://docs.aws.amazon.com/lambda/latest/dg/getting-started.html for details.

### Step 2: Copy src/index.mjs to Lambda

###Step 3: Setup ALB or API gateway trigger to Lambda
Script has been tested via ALB trigger. Some minor adjustment at the script may be required for API gateway trigger.

The url at ALB or API gateway (Lambda endpoint) is needed for OAuth app at GitHub and CMS `config.yml`.

### Step 4: Create an OAuth app at GitHub
See https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app for details.

- Application Name: <Your favorite app name>
- Homepage URL: <Your favorite app url>
- Application description: (optional)
- Authorization callback URL: `<YOUR_LAMBDA_ENDPOINT>/callback`

Once registered, click on the Generate a new client secret button. The app's Client ID and Client Secret will be displayed. We'll use them in Step 5 below.

### Step 5: Setup environment variable at Lambda

Required:
`GITHUB_CLIENT_ID`
`GITHUB_CLIENT_SECRET`

Optional:
`ALLOWED_DOMAINS`

### Step 6: Update your CMS configuration
Update `admin/config.yml` at your CMS repository.
Under `backend`:
`base_url`: `<YOUR_LAMBDA_ENDPOINT_WITHOUT_PATH>`
If your Lambda endpoint is having url path, add the path to `auth_endpoint` property.
```diff
  backend:
    name: github
    repo: username/repo
    branch: main # Branch to update (optional; defaults to master)
    site_domain: <your_app_domain>
+  base_url: <your_lambda_endpoint_without_path>
+  auth_endpoint: <your_lambda_endpoint_path>
```

See https://decapcms.org/docs/backends-overview/ for backend configuration details.

Commit the change and you can sign into Decap / Sveltia CMS remotely with GitHub.

## Acknowledgements
Most of the materials of this project are referred from https://github.com/sveltia/sveltia-cms-auth
