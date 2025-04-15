#!/bin/sh
# Update Anthropic API key
sed -i "s|ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=$DOCKER_ANTHROPIC_API_KEY|g" .env

# Update Twitter configuration
sed -i "s|TWITTER_USERNAME=.*|TWITTER_USERNAME=$DOCKER_TWITTER_USERNAME|g" .env
sed -i "s|TWITTER_PASSWORD=.*|TWITTER_PASSWORD=$DOCKER_TWITTER_PASSWORD|g" .env
sed -i "s|TWITTER_EMAIL=.*|TWITTER_EMAIL=$DOCKER_TWITTER_EMAIL|g" .env
sed -i "s|TWITTER_2FA_SECRET=.*|TWITTER_2FA_SECRET=$DOCKER_TWITTER_2FA_SECRET|g" .env

# Update Teesa configuration
sed -i "s|TEESA_URL=.*|TEESA_URL=$DOCKER_TEESA_URL|g" .env
