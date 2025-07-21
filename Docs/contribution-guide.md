# Habistat Contribution Setup Guide

This guide provides step-by-step instructions for setting up your local development environment to contribute to Habistat. It covers the frontend (SvelteKit), backend (Convex), and the necessary connections between them (Clerk Webhooks).

---

## Prerequisites

- [Node.js](https://nodejs.org/) installed (version 20.x or later recommended).
- [Bun](https://bun.com) installed.
- A [GitHub account](https://github.com/join).
- A [Clerk](https://clerk.com/) account (you can sign up for free).
- A [Convex](https://www.convex.dev/) account (the free tier is sufficient).

---

## Part 1: Initial Repository Setup

1. **Fork the repository**: Click the "Fork" button on the top-right of the [Habistat GitHub page](https://github.com/your-username/habistat) to create a copy under your account.
2. **Clone your fork**:

```bash
git clone https://github.com/<your-username>/habistat.git
cd habistat
```

1. **Install dependencies**:

```bash
bun install
```

---

## Part 1.5: Intermidiate Step

You are seeing this error because Convex requires the environment variable `CLERK_JWT_ISSUER_DOMAIN` to be set for authentication to work. This is a required step in the [contribution guide](Docs/contribution-guide.md) (see "Part 3: Authentication Setup (Clerk, JWT & Webhooks)" → "Configure Clerk JWT Template").

**How to fix:**

1. **Get the Clerk JWT Issuer URL:**
   - Go to your [Clerk dashboard](https://dashboard.clerk.com/).
   - Open your "Habistat" application.
   - Go to **API Keys** → scroll to **Advanced** → **JWT Templates**.
   - If you haven't already, create a new template using the "Convex" preset.
   - Copy the **Issuer URL** (it looks like `https://<your-subdomain>.clerk.accounts.dev`).

2. **Set the environment variable in Convex:**
   - Go to your [Convex dashboard](https://dashboard.convex.dev/).
   - Select your project (e.g., "curious-okapi-66").
   - Go to **Settings** → **Environment Variables**.
   - Add a new variable:
     - **Name:** `CLERK_JWT_ISSUER_DOMAIN`
     - **Value:** (Paste the Issuer URL from Clerk)
   - Save the variable.

3. **Redeploy or restart Convex:**
   - If you have `bun exec convex dev` running, stop it and restart it.
   - Or run:
     ```
     bun exec convex deploy
     ```

**Summary:**
You must set the `CLERK_JWT_ISSUER_DOMAIN` environment variable in your Convex dashboard to the Clerk JWT Issuer URL. This is required for Convex to verify Clerk-authenticated users.

Once you do this, `convex dev` will work and you can continue with the rest of the setup.

---

## Part 2: Backend Setup (Convex)

1. **Log in to Convex CLI**: This will open a browser for you to authenticate.

```bash
bun exec convex login
```

1. **Link your project**: Run the Convex development server. It will prompt you to either create a new project or link to an existing one. Since you've already created a "Habistat" project on your Convex dashboard, choose to **link to an existing project**.

```bash
bun exec convex dev
```

- When the command finishes, it will output your project's development URLs. You will see a **Deployment URL** (ending in `.convex.cloud`) and an **HTTP API URL** (ending in `.convex.site`). **Copy the Deployment URL** for now; you'll need the HTTP API URL later for webhooks.
- **Keep this terminal window running.** It provides your frontend with a live connection to the backend and hot-reloads any changes you make in `src/convex/`.

- **Create `.env.local`**: Copy the example environment file.

```bash
cp .env.example .env.local
```

- **Add Convex Details to `.env.local`**: Open the newly created `.env.local` file and add the following:
  - **`VITE_CONVEX_URL`**: Paste the full Convex **Deployment URL** (`.convex.cloud`) you copied in the previous step.
  - **`CONVEX_DEPLOYMENT`**: This is the project name part of your deployment URL (e.g., if your URL is `https://fluffy-bunny-123.convex.cloud`, your deployment name is `fluffy-bunny-123`).

```env
# .env.local
VITE_CONVEX_URL="https://<your-project-name>.convex.cloud"
CONVEX_DEPLOYMENT="<your-project-name>"
```

---

## Part 3: Authentication Setup (Clerk, JWT & Webhooks)

This is a critical step to ensure that when a user signs up via Clerk, a corresponding user record is created in your Convex database.

### 1. **Set up Clerk Application**

- In your [Clerk Dashboard](https://dashboard.clerk.com/), create a new application named "Habistat".
- Navigate to the **API Keys** section.
- Copy the **Publishable key** and add it to your `.env.local` file.
- Copy the **Secret key** and add it to your `.env.local` file.

Your `.env.local` should now look like this:

```env
# .env.local
VITE_CONVEX_URL="https://<your-project-name>.convex.cloud"
CONVEX_DEPLOYMENT="<your-project-name>"
VITE_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
```

### 2. **Configure Clerk JWT Template**

Convex uses a JWT template from Clerk to authenticate users. This is what the `src/convex/auth.config.ts` file configures.

- In your Clerk application dashboard, navigate to **API Keys**.
- Scroll down to the **Advanced** section and find **JWT Templates**. Click **New template**.
- Select the **Convex** template from the options.
- After it's created, copy the **Issuer URL**. It will look something like `https://<your-subdomain>.clerk.accounts.dev`.
- Now, go to your **Convex Dashboard** (not Clerk's).
- Select your project, then go to **Settings** -> **Environment Variables**.
- Add a new variable:
  - **Name**: `CLERK_JWT_ISSUER_DOMAIN`
  - **Value**: Paste the Issuer URL you copied from Clerk.
- Push the new environment variable to your backend by running `bun exec convex deploy` in your terminal, or by restarting `bun exec convex dev`.

> **Important:** If you skip this step, `bun exec convex dev` will fail with the error: `Environment variable CLERK_JWT_ISSUER_DOMAIN is used in auth config file but its value was not set.` This variable is crucial for Convex to verify users signed in with Clerk. You will need to set this for both your **development** and **production** environments in the Convex dashboard.

### 3. **Configure Clerk Webhook**

- In your Clerk application dashboard, navigate to **Webhooks**.
- Click **Add Endpoint**.
- **Endpoint URL**: This URL is based on your Convex **HTTP API URL** (the one ending in `.convex.site`) that you saw when running `bun exec convex dev`. Construct the webhook URL by appending `/clerk`. It should look like this: `https://<your-project-name>.convex.site/clerk`.
- **Message filtering**: Under **Listen for events**, unselect "All Events" and choose the specific events needed: `user.created` and `user.updated`.
- Click **Create**.
- **Get the Signing Secret**: After creating the endpoint, click on it to view its details. Copy the **Signing secret**. It will start with `whsec_...`.

### 4. **Add Webhook Secret to Convex**

- Go to your [Convex Dashboard](https://dashboard.convex.dev/).
- Select your project.
- Go to **Settings** -> **Environment Variables**.
- Add a new variable:
  - **Name**: `CLERK_WEBHOOK_SECRET`
  - **Value**: Paste the signing secret you copied from the Clerk dashboard.
- **Important**: After setting the variable, you must redeploy your backend for the change to take effect. In the terminal running `bun exec convex dev`, press `Ctrl+C` to stop it, then run it again. Alternatively, run:

```bash
bun exec convex deploy
```

> **Note:** You will need to set this secret for both your **development** and **production** environments in the Convex dashboard.

---

### (Optional) Configure Social Logins for Production

This is an optional but recommended step if you plan to deploy your application. While Clerk provides shared OAuth credentials for development, you must use your own for production. This ensures that users see your application's name and logo during the sign-in flow and that you have control over the permissions requested.

Here's how to set up custom credentials for Google and GitHub.

#### Setting up Google Login

##### 1. **Enable Google in Clerk**

- In your [Clerk Dashboard](https://dashboard.clerk.com/), go to **User & Authentication** -> **Social Connections**.
- Click to enable **Google**. A dialog will appear.
- Keep the **Use custom credentials** toggle enabled.
- Copy the **Redirect URI**. You will need it for the next steps.

##### 2. **Configure Google Cloud Project**

- Go to the [Google Cloud Console](https://console.cloud.google.com/).
- Create a new project or select an existing one.
- Go to **APIs & Services** -> **OAuth consent screen**.
  - Choose **External** and fill out the required app information.
- Go to **APIs & Services** -> **Credentials**.
  - Click **+ CREATE CREDENTIALS** -> **OAuth client ID**.
  - Set **Application type** to **Web application**.
  - Under **Authorized redirect URIs**, click **ADD URI** and paste the **Redirect URI** you copied from Clerk.

##### 3. **Add Credentials to Clerk**

- After creating the credentials, Google will show you a **Client ID** and **Client Secret**.
- Copy these values and paste them back into the Google setup dialog in your Clerk dashboard.
- Save the connection.

#### Setting up GitHub Login

1. **Enable GitHub in Clerk**:
   - In the Clerk dashboard's **Social Connections** page, enable **GitHub**.
   - Copy the **Redirect URI** (also called the "Authorization callback URL").

2. **Create GitHub OAuth App**:
   - Go to your [GitHub Developer settings](https://github.com/settings/developers).
   - Go to the **OAuth Apps** tab and click **New OAuth App**.
   - Fill out the form:
     - **Application name**: Your app's name (e.g., "Habistat").
     - **Homepage URL**: Your production or local URL.
     - **Authorization callback URL**: Paste the Redirect URI you copied from Clerk.
   - Click **Register application**.

3. **Add Credentials to Clerk**:
   - On the application page, copy the **Client ID**.
   - Click **Generate a new client secret** and copy the new secret.
   - Paste the **Client ID** and **Client Secret** into the GitHub setup dialog in your Clerk dashboard.
   - Save the connection.

With these steps, your deployed application will now correctly use your own OAuth apps for social logins.

---

## Part 4: Running the Application

Now that the backend and frontend are configured, you can run the app.

1. Ensure your Convex dev server is running from Part 2 (`bun exec convex dev`).
2. In a **new terminal window**, start the SvelteKit development server:

```bash
bun run dev
```

1. Open your browser to `http://localhost:5173`. You should now have a fully functional local version of Habistat. Try signing up to confirm the webhook is working.

---

## Part 5: (Optional) Deploying to Vercel

If you want to deploy your own instance of the application for testing or demonstration purposes.

### 1. **Push to GitHub**: Make sure your local repository is pushed to your fork on GitHub

### 2. **Configure Production Environment in Convex**

- Before deploying your frontend, you must configure your production backend.
- Run `bun exec convex deploy` to push your latest backend code to production.
- This will give you a **production URL** for your Convex project (e.g., `https://<your-prod-project>.convex.cloud`).
- Go to your Convex dashboard and switch to your **production** environment.
- In **Settings** -> **Environment Variables**, add the same `CLERK_JWT_ISSUER_DOMAIN` and `CLERK_WEBHOOK_SECRET` that you added for your development environment.
- You may also need to create a separate production webhook in Clerk that points to your production HTTP API URL (e.g., `https://<your-prod-project>.convex.site/clerk`).

### 3. **Create a Vercel Project**

- Go to your Vercel dashboard and click **Add New...** -> **Project**.
- Select your forked `habistat` repository.

### 4. **Configure the Project**

- **Framework Preset**: Vercel should automatically detect `SvelteKit`.
- **Build and Output Settings**: These should be detected automatically. If not, use:
  - **Build Command**: `bun run build`
  - **Output Directory**: `dist`
  - **Install Command**: `bun install`
- **Environment Variables**: Add the same variables from your `.env.local` file to the Vercel project settings. **Use your production Convex URL** that you got from the previous step.
  - `VITE_CONVEX_URL`
  - `VITE_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `CONVEX_DEPLOYMENT`

### 5. **Deploy**: Click the **Deploy** button. Vercel will build and deploy your application

---

### Part 6: Making Contributions

- **Create a new branch**:

```bash
git checkout -b my-awesome-feature
```

- Make your changes and commit them with a descriptive message.
- Push your branch to your forked repository.
- Open a Pull Request from your forked branch to the `main` branch of the original Habistat repository.

Happy coding!
