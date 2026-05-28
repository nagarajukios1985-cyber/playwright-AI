# Git Instructions

## 1️⃣ Prompt for a GitHub Personal-Access Token (PAT)
When a Git command that needs authentication is about to run, first obtain the token from the user:

```bash
# Ask the user to paste the token (input is hidden)
read -sp "Enter your GitHub personal-access token (PAT): " GIT_TOKEN

echo    # move to a new line after hidden input
```

- The token is stored **only** in the temporary shell variable `GIT_TOKEN`.
- It is **never** written to a file or committed.
- The token must have the `repo` scope for write access.

## 2️⃣ Initialise a new repository (first-time setup)
```bash
# optional – create a README
echo "# Playwright-Demo-AI" > README.md

git init

git add README.md
git commit -m "first commit"

git branch -M main
```

## 3️⃣ Set the remote using the token obtained in step 1️⃣
```bash
# replace <owner> and <repo> with your values
git remote add origin https://github.com/OWNER/REPO.git
```

**For this project**:
```bash
git remote add origin https://$GIT_TOKEN@<url>
```

## 4️⃣ Add files, commit, and push

### Add all project files
```bash
git add .
```

### Create a commit with a message
```bash
git commit -m "initial code with custom agent"
```

### Push code to the main branch
```bash
git push -u origin main
```

### Quick one-liner
```bash
git add . && git commit -m "<msg>" && git push -u origin $(git rev-parse --abbrev-ref HEAD)
```

## 5️⃣ Push the initial commit
```bash
git push -u origin main
```

## 6️⃣ Pull later
```bash
git pull origin <new-branch>
```

## 7️⃣ Create a new branch
```bash
git checkout -b <new-branch>
git push -u origin <new-branch>
```

## 8️⃣ Refresh the token (if it expires)
If you get an authentication error, re‑run **step 1️⃣** to update `$GIT_TOKEN` and retry.

## 9️⃣ Safety notes
- **Never** commit the token.
- Keep it secret.
- Use a PAT with `repo` scope for private repos.

## 🔟 Quick one‑liner for the whole workflow
```bash
read -sp "Enter your GitHub PAT: " GIT_TOKEN && echo && \
 echo "# Playwright-Demo-AI" > README.md && \
 git init && git add README.md && git commit -m "first commit" && \
 git branch -M main && \
 git push -u origin main
```
