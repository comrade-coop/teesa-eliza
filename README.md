# Teesa Eliza App

The project is based on [Eliza](https://github.com/elizaOS/eliza)

---

## 🚀 Production Setup

Follow these instructions to set up, configure, and run the Teesa application in production mode on your local machine or server.

### Prerequisites

Make sure you have the following installed:
- [Docker](https://www.docker.com/) (latest version recommended)
- [Git](https://git-scm.com/)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/comrade-coop/teesa-eliza
   ```

2. Navigate to the root directory: 
   ```bash
   cd teesa-eliza
   ```

3. Build the production Docker image:
   ```bash
   docker build \
      --build-arg ANTHROPIC_API_KEY=<anthropic_api_key> \ # API key for the Anthropic API
      --build-arg TWITTER_USERNAME=<twitter_username> \ # The username for the twitter account
      --build-arg TWITTER_PASSWORD=<twitter_password> \ # The pasword for the twitter account
      --build-arg TWITTER_EMAIL=<twitter_email> \ # The email address for the twitter account
      --build-arg TEESA_URL=<teesa_url> \ # The Teesa URL
      --pull \
      --rm \
      -f "deploy/Dockerfile" \
      -t teesa-eliza-deploy:latest \
      .
   ```

3. Run the production container:
   ```bash
   docker run \
      -p 3000:3000 \
      -v "$(pwd)/volumes/data:/app/agent/data" \ # Volume to persist the agent data
      -v "$(pwd)/volumes/content_cache:/app/agent/content_cache" \ # Volume to persist the agent cache
      teesa-eliza-deploy:latest
   ```


---


## 📜 License

This project is licensed under the [MIT License](LICENSE). Feel free to use, modify, and distribute this project as per the license terms.
